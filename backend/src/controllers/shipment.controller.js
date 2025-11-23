const { getPool } = require('../db')

// Helpers
function normalizePhone(p) {
  if (!p) return ''
  const d = String(p).replace(/\D/g, '')
  if (d.startsWith('84')) return '0' + d.slice(2)
  return d
}
function isValidVNPhone(p) {
  const d = normalizePhone(p)
  return /^0\d{9}$/.test(d)
}

function genWB() {
  return `WB-${Math.floor(100000 + Math.random() * 900000)}`
}

function genOrderCodeSeed() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const rnd = Math.floor(1000 + Math.random() * 9000)
  return `OD-${y}${m}${d}-${h}${mi}${s}-${rnd}`
}

async function ensureUniqueOrderCode(conn, code) {
  const [r] = await conn.query('SELECT 1 FROM shipment WHERE order_code = ? LIMIT 1', [code])
  return r.length === 0
}

async function genUniqueOrderCode(conn) {
  for (let i = 0; i < 5; i++) {
    const c = genOrderCodeSeed()
    if (await ensureUniqueOrderCode(conn, c)) return c
  }
  return `${genOrderCodeSeed()}-${Math.floor(Math.random() * 1e6)}`
}

async function ensureCarrierOWN(conn) {
  const [r] = await conn.query("SELECT id FROM carrier WHERE code='OWN' LIMIT 1")
  if (r.length) return r[0].id
  const [x] = await conn.query("INSERT INTO carrier (code,name) VALUES ('OWN','Your Company')")
  return x.insertId
}

// Create shipment + waybill
async function createShipment(req, res) {
  const {
    merchant_code, // required for admin; ignored for merchant (use req.user.merchant_id)
    order_code,
    ref_code,
    sender = {},
    receiver = {},
    service_type = 'STANDARD',
    cod_amount = 0,
    items = [],
  } = req.body || {}

  if (!sender.address || !receiver.address) {
    return res.status(400).json({ message: 'sender.address, receiver.address là bắt buộc' })
  }

  const pool = getPool()
  const conn = await pool.getConnection()

  // Validate phones and receiver name
  const sPhoneRaw = (sender && sender.phone) ? String(sender.phone).trim() : ''
  const rPhoneRaw = (receiver && receiver.phone) ? String(receiver.phone).trim() : ''
  if (!sPhoneRaw || !rPhoneRaw) {
    try { conn.release() } catch {}
    return res.status(400).json({ message: 'sender.phone, receiver.phone là bắt buộc' })
  }
  if (!isValidVNPhone(sPhoneRaw) || !isValidVNPhone(rPhoneRaw)) {
    try { conn.release() } catch {}
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ (0xxxxxxxxx hoặc +84xxxxxxxxx)' })
  }
  const sPhoneNorm = normalizePhone(sPhoneRaw)
  const rPhoneNorm = normalizePhone(rPhoneRaw)
  if (!receiver.full_name || !String(receiver.full_name).trim()) {
    try { conn.release() } catch {}
    return res.status(400).json({ message: 'receiver.full_name (Tên người nhận) là bắt buộc' })
  }

  try {
    await conn.beginTransaction()

    const carrierId = await ensureCarrierOWN(conn)

    // Determine merchant id by role
    const role = req.user?.role
    const userMerchantId = req.user?.merchant_id
    let merchantId = null
    if (role === 'merchant') {
      if (!userMerchantId) {
        try { await conn.rollback() } catch {}
        try { conn.release() } catch {}
        return res.status(403).json({ message: 'Tài khoản đối tác chưa được gán merchant_id' })
      }
      merchantId = userMerchantId
    } else {
      if (!merchant_code) {
        try { await conn.rollback() } catch {}
        try { conn.release() } catch {}
        return res.status(400).json({ message: 'merchant_code là bắt buộc khi tạo bằng tài khoản admin' })
      }
      const [m] = await conn.query('SELECT id FROM merchant WHERE code = ? LIMIT 1', [merchant_code])
      if (!m.length) {
        try { await conn.rollback() } catch {}
        try { conn.release() } catch {}
        return res.status(400).json({ message: 'merchant_code không tồn tại' })
      }
      merchantId = m[0].id
    }

    const [a1] = await conn.query(
      'INSERT INTO address (full_name,phone,line1,district,province,country_code) VALUES (?,?,?,?,?,?)',
      [sender.full_name || null, sPhoneNorm || null, sender.address, sender.district || null, sender.province || 'TP.HCM', 'VN']
    )
    const senderId = a1.insertId

    const [a2] = await conn.query(
      'INSERT INTO address (full_name,phone,line1,district,province,country_code) VALUES (?,?,?,?,?,?)',
      [receiver.full_name || null, rPhoneNorm || null, receiver.address, receiver.district || null, receiver.province || 'TP.HCM', 'VN']
    )
    const receiverId = a2.insertId

    const totalWeight = Array.isArray(items)
      ? items.reduce((sum, it) => sum + (Number(it?.weight_g) || 0), 0)
      : 0
    const totalValue = Array.isArray(items)
      ? items.reduce((sum, it) => sum + (Number(it?.value) || 0), 0)
      : 0
    const note = Array.isArray(items) && items[0]?.name ? items[0].name : null

    const finalOrderCode = order_code || await genUniqueOrderCode(conn)

    const [s] = await conn.query(
      `INSERT INTO shipment (merchant_id,order_code,ref_code,sender_address_id,receiver_address_id,
         service_type,cod_amount,total_weight_g,total_value,note,current_status,current_carrier_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, ?, NOW())`,
      [
        merchantId,
        finalOrderCode,
        ref_code || null,
        senderId,
        receiverId,
        service_type,
        cod_amount,
        totalWeight || null,
        totalValue || null,
        note,
        'CREATED',
        carrierId,
      ]
    )
    const shipmentId = s.insertId

    const waybill = genWB()
    const [wres] = await conn.query(
      `INSERT INTO waybill (shipment_id,carrier_id,waybill_number,service_code,status_code,vendor_status, created_at)
       VALUES (?,?,?,?,?,?, NOW())`,
      [shipmentId, carrierId, waybill, service_type, 'CREATED', 'CREATED']
    )
    const waybillId = wres.insertId
    try {
      await conn.query(
        `INSERT INTO tracking_event (waybill_id, shipment_id, carrier_id, event_time, vendor_status, mapped_code, hub_id, description)
         VALUES (?, ?, ?, NOW(), ?, ?, NULL, ?)`,
        [waybillId, shipmentId, carrierId, 'CREATED', 'CREATED', 'Đã tạo đơn']
      )
    } catch (e) {
      console.warn('Insert initial tracking_event failed:', e?.message)
    }

    await conn.commit()
    return res.status(201).json({ shipment_id: shipmentId, waybill_number: waybill, order_code: finalOrderCode, status: 'CREATED' })
  } catch (e) {
    try { await conn.rollback() } catch {}
    return res.status(500).json({ message: e.message })
  } finally {
    try { conn.release() } catch {}
  }
}

module.exports = { createShipment }

// List shipments/waybills with filters
async function listShipments(req, res) {
  const q = (req.query.q || '').toString().trim()
  const status = (req.query.status || '').toString().trim()
  const from = (req.query.from || '').toString().trim()
  const to = (req.query.to || '').toString().trim()
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))
  const offset = (page - 1) * pageSize
  try {
    const pool = getPool()
    const params = []
    const role = req.user?.role
    const userMerchantId = req.user?.merchant_id
    const where = []
    if (role === 'merchant' && userMerchantId) {
      where.push('s.merchant_id = ?')
      params.push(userMerchantId)
    }
    if (q) {
      where.push(`(
        w.waybill_number LIKE ? OR s.order_code LIKE ? OR
        m.name LIKE ? OR m.code LIKE ? OR
        r.line1 LIKE ? OR r.district LIKE ? OR r.province LIKE ?
      )`)
      params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`)
    }
    if (status) {
      where.push('(UPPER(w.status_code) = UPPER(?) OR UPPER(ts.description) LIKE UPPER(?))')
      params.push(status, `%${status}%`)
    }
    if (from) { where.push('COALESCE(s.created_at, w.created_at) >= ?'); params.push(`${from} 00:00:00`) }
    if (to)   { where.push('COALESCE(s.created_at, w.created_at) < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const [rows] = await pool.query(
      `SELECT w.waybill_number AS id,
              COALESCE(m.name, m.code) AS customer,
              TRIM(CONCAT(
                COALESCE(r.line1,''),
                CASE WHEN r.district IS NULL OR r.district='' THEN '' ELSE CONCAT(', ', r.district) END,
                CASE WHEN r.province IS NULL OR r.province='' THEN '' ELSE CONCAT(', ', r.province) END
              )) AS address,
              COALESCE(ts.description, w.status_code) AS status,
              s.created_at,
              s.order_code
         FROM waybill w
    LEFT JOIN shipment s ON s.id = w.shipment_id
    LEFT JOIN merchant m ON m.id = s.merchant_id
    LEFT JOIN address r  ON r.id = s.receiver_address_id
    LEFT JOIN tracking_status ts ON ts.code = w.status_code
        ${whereSql}
        ORDER BY COALESCE(s.created_at, w.created_at) DESC
        LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )
    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM waybill w
    LEFT JOIN shipment s ON s.id = w.shipment_id
    LEFT JOIN merchant m ON m.id = s.merchant_id
    LEFT JOIN address r  ON r.id = s.receiver_address_id
    LEFT JOIN tracking_status ts ON ts.code = w.status_code
        ${whereSql}`,
      params
    )
    return res.json({ items: rows, total: cnt[0]?.total || 0, page, pageSize })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports.listShipments = listShipments

// Admin/Merchant: add tracking event for a waybill
async function addShipmentEvent(req, res) {
  const waybill = req.params.waybill
  const { mapped_code, description, event_time, hub_id } = req.body || {}
  if (!waybill || !mapped_code) return res.status(400).json({ message: 'waybill and mapped_code are required' })
  try {
    const pool = getPool()
    const conn = await pool.getConnection()
    try {
      const [w] = await conn.query('SELECT id, shipment_id, carrier_id FROM waybill WHERE waybill_number = ? LIMIT 1', [waybill])
      if (!w.length) return res.status(404).json({ message: 'Waybill not found' })
      const waybillId = w[0].id
      const shipmentId = w[0].shipment_id
      const carrierId = w[0].carrier_id
      const evTime = event_time ? new Date(event_time) : new Date()
      const hubIdVal = hub_id ? Number(hub_id) : null

      if (String(mapped_code).toUpperCase() === 'CREATED') {
        const [dup] = await conn.query(
          'SELECT 1 FROM tracking_event WHERE waybill_id = ? AND UPPER(mapped_code) = "CREATED" LIMIT 1',
          [waybillId]
        )
        if (dup.length) {
          return res.status(409).json({ message: 'Sự kiện CREATED đã tồn tại cho đơn này' })
        }
      }
      await conn.query(
        `INSERT INTO tracking_event (waybill_id, shipment_id, carrier_id, event_time, vendor_status, mapped_code, hub_id, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [waybillId, shipmentId, carrierId, evTime, mapped_code, mapped_code, hubIdVal, description || null]
      )
      await conn.query(
        `UPDATE waybill SET status_code=?, vendor_status=? WHERE id=?`,
        [mapped_code, mapped_code, waybillId]
      )
      await conn.query(`UPDATE shipment SET current_status=? WHERE id=?`, [mapped_code, shipmentId])
      return res.status(201).json({ ok: true })
    } finally { try { conn.release() } catch {} }
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports.addShipmentEvent = addShipmentEvent

// Helper: recalc latest status after delete
async function recalcLatestStatus(conn, waybillId, shipmentId) {
  const [last] = await conn.query(
    'SELECT mapped_code FROM tracking_event WHERE waybill_id=? ORDER BY event_time DESC, id DESC LIMIT 1',
    [waybillId]
  )
  const code = last.length ? last[0].mapped_code : null
  await conn.query('UPDATE waybill SET status_code=?, vendor_status=? WHERE id=?', [code, code, waybillId])
  await conn.query('UPDATE shipment SET current_status=? WHERE id=?', [code, shipmentId])
  return code
}

// Admin: delete a tracking event (undo)
async function deleteShipmentEvent(req, res) {
  const waybill = req.params.waybill
  const raw = req.params.eventId
  if (!waybill || !raw || !/^\d+$/.test(String(raw))) {
    return res.status(400).json({ message: 'waybill and eventId are required' })
  }
  const eventId = Number(raw)
  try {
    const pool = getPool()
    const conn = await pool.getConnection()
    try {
      const [row] = await conn.query(
        `SELECT te.id, te.waybill_id, te.shipment_id
           FROM tracking_event te
           JOIN waybill w ON w.id = te.waybill_id
          WHERE te.id = ? AND w.waybill_number = ?
          LIMIT 1`,
        [eventId, waybill]
      )
      if (!row.length) return res.status(404).json({ message: 'Event not found for given waybill' })
      const waybillId = row[0].waybill_id
      const shipmentId = row[0].shipment_id

      await conn.beginTransaction()
      await conn.query('DELETE FROM tracking_event WHERE id=? LIMIT 1', [eventId])
      const newCode = await recalcLatestStatus(conn, waybillId, shipmentId)
      await conn.commit()
      return res.json({ ok: true, current_status: newCode })
    } catch (e) {
      try { await conn.rollback() } catch {}
      console.error(e)
      return res.status(500).json({ message: 'Internal server error' })
    } finally { try { conn.release() } catch {} }
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports.deleteShipmentEvent = deleteShipmentEvent

// Admin: delete latest tracking event of a waybill
async function deleteLastShipmentEvent(req, res) {
  const waybill = req.params.waybill
  if (!waybill) return res.status(400).json({ message: 'waybill is required' })
  try {
    const pool = getPool()
    const conn = await pool.getConnection()
    try {
      const [w] = await conn.query('SELECT id, shipment_id FROM waybill WHERE waybill_number=? LIMIT 1', [waybill])
      if (!w.length) return res.status(404).json({ message: 'Waybill not found' })
      const waybillId = w[0].id
      const shipmentId = w[0].shipment_id
      const [last] = await conn.query(
        'SELECT id FROM tracking_event WHERE waybill_id=? ORDER BY event_time DESC, id DESC LIMIT 1',
        [waybillId]
      )
      if (!last.length) return res.status(404).json({ message: 'No events to delete' })
      const eventId = last[0].id
      await conn.beginTransaction()
      await conn.query('DELETE FROM tracking_event WHERE id=? LIMIT 1', [eventId])
      const newCode = await recalcLatestStatus(conn, waybillId, shipmentId)
      await conn.commit()
      return res.json({ ok: true, deleted_event_id: eventId, current_status: newCode })
    } catch (e) {
      try { await conn.rollback() } catch {}
      console.error(e)
      return res.status(500).json({ message: 'Internal server error' })
    } finally { try { conn.release() } catch {} }
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports.deleteLastShipmentEvent = deleteLastShipmentEvent

