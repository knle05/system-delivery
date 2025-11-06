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
    // First try simple orders table
    try {
      const params = []
      const whereClauses = []
      if (q) {
        if (/^\d+$/.test(q)) {
          whereClauses.push('(id = ? OR customer LIKE ? OR address LIKE ? OR status LIKE ?)')
          params.push(Number(q), `%${q}%`, `%${q}%`, `%${q}%`)
        } else {
          whereClauses.push('(customer LIKE ? OR address LIKE ? OR status LIKE ?)')
          params.push(`%${q}%`, `%${q}%`, `%${q}%`)
        }
      }
      if (status) { whereClauses.push('status = ?'); params.push(status) }
      if (from)   { whereClauses.push('created_at >= ?'); params.push(`${from} 00:00:00`) }
      if (to)     { whereClauses.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`) }
      const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''
      const [rows] = await pool.query(
        `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      )
      const [cnt] = await pool.query(
        `SELECT COUNT(*) AS total FROM orders ${where}`,
        params
      )
      return res.json({ items: rows, total: cnt[0]?.total || 0, page, pageSize })
    } catch (e) {
      // Fallback to shipments/waybills view
    }

    const params2 = []
    const where2 = []
    if (q) {
      where2.push(`(
        w.waybill_number LIKE ? OR s.order_code LIKE ? OR
        m.name LIKE ? OR m.code LIKE ? OR
        r.line1 LIKE ? OR r.district LIKE ? OR r.province LIKE ?
      )`)
      params2.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`)
    }
    if (status) {
      where2.push('(w.status_code = ? OR ts.description LIKE ?)')
      params2.push(status, `%${status}%`)
    }
    if (from) { where2.push('s.created_at >= ?'); params2.push(`${from} 00:00:00`) }
    if (to)   { where2.push('s.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params2.push(`${to} 00:00:00`) }
    const whereSql = where2.length ? `WHERE ${where2.join(' AND ')}` : ''

    const [rows2] = await pool.query(
      `SELECT w.waybill_number AS id,
              COALESCE(ts.description, w.status_code) AS status,
              COALESCE(m.name, m.code) AS customer,
              TRIM(CONCAT(
                COALESCE(r.line1,''),
                CASE WHEN r.district IS NULL OR r.district='' THEN '' ELSE CONCAT(', ', r.district) END,
                CASE WHEN r.province IS NULL OR r.province='' THEN '' ELSE CONCAT(', ', r.province) END
              )) AS address,
              s.created_at
         FROM waybill w
         JOIN shipment s ON s.id = w.shipment_id
    LEFT JOIN merchant m ON m.id = s.merchant_id
    LEFT JOIN address r  ON r.id = s.receiver_address_id
    LEFT JOIN tracking_status ts ON ts.code = w.status_code
        ${whereSql}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?`,
      [...params2, pageSize, offset]
    )
    const [cnt2] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM waybill w
         JOIN shipment s ON s.id = w.shipment_id
    LEFT JOIN merchant m ON m.id = s.merchant_id
    LEFT JOIN address r  ON r.id = s.receiver_address_id
    LEFT JOIN tracking_status ts ON ts.code = w.status_code
        ${whereSql}`,
      params2
    )
    return res.json({ items: rows2, total: cnt2[0]?.total || 0, page, pageSize })
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
