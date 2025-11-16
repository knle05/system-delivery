const { getPool } = require('../db')

async function getOrder(req, res) {
  const id = req.params.id
  try {
    const pool = getPool()
    // Try simple orders table first
    try {
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id])
      if (rows && rows.length) return res.json(rows[0])
    } catch (e) {
      // fall through if table not found or other
    }

    // Fallback: look up by waybill_number in rich schema and map to simple shape
    const [wb] = await pool.query(
      `SELECT w.waybill_number AS id,
              COALESCE(ts.description, w.status_code) AS status,
              COALESCE(m.name, m.code) AS customer,
              TRIM(CONCAT(
                COALESCE(r.line1,''),
                CASE WHEN r.district IS NULL OR r.district='' THEN '' ELSE CONCAT(', ', r.district) END,
                CASE WHEN r.province IS NULL OR r.province='' THEN '' ELSE CONCAT(', ', r.province) END
              )) AS address
         FROM waybill w
         JOIN shipment s ON s.id = w.shipment_id
    LEFT JOIN merchant m ON m.id = s.merchant_id
    LEFT JOIN address r  ON r.id = s.receiver_address_id
    LEFT JOIN tracking_status ts ON ts.code = w.status_code
        WHERE w.waybill_number = ?
        LIMIT 1`,
      [id]
    )
    if (!wb || wb.length === 0) return res.status(404).json({ message: 'Order not found' })
    return res.json(wb[0])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function listOrders(req, res) {
  const q = (req.query.q || '').toString().trim()
  const status = (req.query.status || '').toString().trim()
  const from = (req.query.from || '').toString().trim() // YYYY-MM-DD
  const to = (req.query.to || '').toString().trim()     // YYYY-MM-DD
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))
  const offset = (page - 1) * pageSize
  try {
    const pool = getPool()

    // Build WHERE for orders table
    const oWhere = []
    const oParams = []
    if (q) {
      if (/^\d+$/.test(q)) {
        oWhere.push('(id = ? OR customer LIKE ? OR address LIKE ? OR status LIKE ?)')
        oParams.push(Number(q), `%${q}%`, `%${q}%`, `%${q}%`)
      } else {
        oWhere.push('(customer LIKE ? OR address LIKE ? OR status LIKE ?)')
        oParams.push(`%${q}%`, `%${q}%`, `%${q}%`)
      }
    }
    if (status) { oWhere.push('status = ?'); oParams.push(status) }
    if (from)   { oWhere.push('created_at >= ?'); oParams.push(`${from} 00:00:00`) }
    if (to)     { oWhere.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); oParams.push(`${to} 00:00:00`) }
    const oWhereSql = oWhere.length ? `WHERE ${oWhere.join(' AND ')}` : ''

    // Build WHERE for shipments view
    const sWhere = []
    const sParams = []
    if (q) {
      sWhere.push(`(
        w.waybill_number LIKE ? OR s.order_code LIKE ? OR
        m.name LIKE ? OR m.code LIKE ? OR
        r.line1 LIKE ? OR r.district LIKE ? OR r.province LIKE ?
      )`)
      sParams.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`)
    }
    if (status) {
      sWhere.push('(UPPER(w.status_code) = UPPER(?) OR UPPER(ts.description) LIKE UPPER(?))')
      sParams.push(status, `%${status}%`)
    }
    if (from) { sWhere.push('s.created_at >= ?'); sParams.push(`${from} 00:00:00`) }
    if (to)   { sWhere.push('s.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); sParams.push(`${to} 00:00:00`) }
    const sWhereSql = sWhere.length ? `WHERE ${sWhere.join(' AND ')}` : ''

    const unionSql = `
      SELECT * FROM (
        SELECT CAST(o.id AS CHAR) AS id,
               o.customer,
               o.address,
               o.status,
               o.created_at,
               NULL AS order_code
          FROM orders o
          ${oWhereSql}
        UNION ALL
        SELECT w.waybill_number AS id,
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
          JOIN shipment s ON s.id = w.shipment_id
     LEFT JOIN merchant m ON m.id = s.merchant_id
     LEFT JOIN address r  ON r.id = s.receiver_address_id
     LEFT JOIN tracking_status ts ON ts.code = w.status_code
          ${sWhereSql}
      ) u
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?`

    const [rows] = await pool.query(unionSql, [...oParams, ...sParams, pageSize, offset])

    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT 1 FROM orders o ${oWhereSql}
        UNION ALL
        SELECT 1 FROM waybill w
          JOIN shipment s ON s.id = w.shipment_id
     LEFT JOIN merchant m ON m.id = s.merchant_id
     LEFT JOIN address r  ON r.id = s.receiver_address_id
     LEFT JOIN tracking_status ts ON ts.code = w.status_code
          ${sWhereSql}
      ) t`
    const [cnt] = await pool.query(countSql, [...oParams, ...sParams])

    return res.json({ items: rows, total: cnt[0]?.total || 0, page, pageSize })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function createOrder(req, res) {
  const { customer, address, status } = req.body
  if (!customer || !address) return res.status(400).json({ message: 'customer and address required' })
  try {
    const pool = getPool()
    const [result] = await pool.query(
      'INSERT INTO orders (customer, address, status, created_at) VALUES (?, ?, ?, NOW())',
      [customer, address, status || 'pending']
    )
    const insertedId = result.insertId
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [insertedId])
    return res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function updateOrder(req, res) {
  const id = req.params.id
  const { customer, address, status } = req.body || {}
  if (!customer && !address && !status) return res.status(400).json({ message: 'nothing to update' })
  try {
    const pool = getPool()
    const fields = []
    const params = []
    if (customer !== undefined) { fields.push('customer = ?'); params.push(customer) }
    if (address !== undefined)  { fields.push('address = ?');  params.push(address) }
    if (status !== undefined)   { fields.push('status = ?');   params.push(status) }
    fields.push('updated_at = NOW()')
    const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`
    params.push(id)
    const [result] = await pool.query(sql, params)
    if (!result.affectedRows) return res.status(404).json({ message: 'Order not found' })
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id])
    return res.json(rows[0])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getOrder, listOrders, createOrder, updateOrder }

