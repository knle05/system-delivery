const { getPool } = require('../db')

function genWB() {
  return `WB-${Math.floor(100000 + Math.random() * 900000)}`
}

async function ensureCarrierOWN(conn) {
  const [r] = await conn.query("SELECT id FROM carrier WHERE code='OWN' LIMIT 1")
  if (r.length) return r[0].id
  const [x] = await conn.query("INSERT INTO carrier (code,name) VALUES ('OWN','Your Company')")
  return x.insertId
}

async function createShipment(req, res) {
  const {
    merchant_code = 'M0001',
    order_code,
    ref_code,
    sender = {},
    receiver = {},
    service_type = 'STANDARD',
    cod_amount = 0,
    items = [],
  } = req.body || {}

  if (!order_code || !sender.address || !receiver.address) {
    return res.status(400).json({ message: 'order_code, sender.address, receiver.address là bắt buộc' })
  }

  const pool = getPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const carrierId = await ensureCarrierOWN(conn)

    const [m] = await conn.query('SELECT id FROM merchant WHERE code=? LIMIT 1', [merchant_code])
    if (!m.length) throw new Error('merchant_code không tồn tại. Hãy seed merchant trước.')
    const merchantId = m[0].id

    const [a1] = await conn.query(
      'INSERT INTO address (full_name,phone,line1,district,province,country_code) VALUES (?,?,?,?,?,?)',
      [sender.full_name || null, sender.phone || null, sender.address, sender.district || null, sender.province || 'TP.HCM', 'VN']
    )
    const senderId = a1.insertId

    const [a2] = await conn.query(
      'INSERT INTO address (full_name,phone,line1,district,province,country_code) VALUES (?,?,?,?,?,?)',
      [receiver.full_name || null, receiver.phone || null, receiver.address, receiver.district || null, receiver.province || 'TP.HCM', 'VN']
    )
    const receiverId = a2.insertId

    const totalWeight = Array.isArray(items)
      ? items.reduce((sum, it) => sum + (Number(it?.weight_g) || 0), 0)
      : 0
    const totalValue = Array.isArray(items)
      ? items.reduce((sum, it) => sum + (Number(it?.value) || 0), 0)
      : 0
    const note = Array.isArray(items) && items[0]?.name ? items[0].name : null

    const [s] = await conn.query(
      `INSERT INTO shipment (merchant_id,order_code,ref_code,sender_address_id,receiver_address_id,
         service_type,cod_amount,total_weight_g,total_value,note,current_status,current_carrier_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, ?, NOW())`,
      [
        merchantId,
        order_code,
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
    await conn.query(
      `INSERT INTO waybill (shipment_id,carrier_id,waybill_number,service_code,status_code,vendor_status, created_at)
       VALUES (?,?,?,?,?,?, NOW())`,
      [shipmentId, carrierId, waybill, service_type, 'CREATED', 'CREATED']
    )

    await conn.commit()
    return res.status(201).json({ shipment_id: shipmentId, waybill_number: waybill, status: 'CREATED' })
  } catch (e) {
    try { await conn.rollback() } catch {}
    return res.status(500).json({ message: e.message })
  } finally {
    conn.release()
  }
}

module.exports = { createShipment }
