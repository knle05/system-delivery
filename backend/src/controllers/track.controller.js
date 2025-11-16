const { getPool } = require('../db')

async function getTrack(req, res) {
  const code = req.params.code
  if (!code) return res.status(400).json({ message: 'code is required' })

  // optional filters: status, from, to, page, pageSize
  const status = (req.query.status || '').toString().trim()
  const from = (req.query.from || '').toString().trim() // YYYY-MM-DD
  const to = (req.query.to || '').toString().trim()     // YYYY-MM-DD
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize || 50)))
  const offset = (page - 1) * pageSize

  try {
    const pool = getPool()
    const [snap] = await pool.query(
      `SELECT w.waybill_number,
              w.status_code,
              ts.description AS status_text,
              h.name AS last_hub,
              w.delivered_time,
              s.created_at,
              COALESCE(r.full_name, m.name, m.code) AS customer,
              TRIM(CONCAT(
                COALESCE(r.line1,''),
                CASE WHEN r.district IS NULL OR r.district='' THEN '' ELSE CONCAT(', ', r.district) END,
                CASE WHEN r.province IS NULL OR r.province='' THEN '' ELSE CONCAT(', ', r.province) END
              )) AS address
         FROM waybill w
         JOIN shipment s       ON s.id = w.shipment_id
    LEFT JOIN merchant m       ON m.id = s.merchant_id
    LEFT JOIN address r        ON r.id = s.receiver_address_id
    LEFT JOIN tracking_status ts ON ts.code = w.status_code
    LEFT JOIN hub h              ON h.id = w.last_hub_id
        WHERE w.waybill_number = ?
        LIMIT 1`,
      [code]
    )
    if (!snap.length) return res.status(404).json({ message: 'Not found' })

    const where = [
      'te.waybill_id = (SELECT id FROM waybill WHERE waybill_number = ? LIMIT 1)'
    ]
    const params = [code]
    if (status) { where.push('te.mapped_code = ?'); params.push(status) }
    if (from) { where.push('te.event_time >= ?'); params.push(`${from} 00:00:00`) }
    if (to) { where.push('te.event_time < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`) }
    const whereSql = where.join(' AND ')

    const [events] = await pool.query(
      `SELECT te.event_time AS time,
              te.mapped_code AS code,
              COALESCE(h.name, te.hub_name, te.location_text) AS hub,
              te.description AS description
         FROM tracking_event te
    LEFT JOIN hub h ON h.id = te.hub_id
        WHERE ${whereSql}
        ORDER BY te.event_time DESC
        LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM tracking_event te
        WHERE ${whereSql}`,
      params
    )

    return res.json({ snapshot: snap[0], events, page, pageSize, total: cnt[0]?.total || 0 })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getTrack }
