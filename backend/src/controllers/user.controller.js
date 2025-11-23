const { getPool } = require('../db')

async function listUsers(req, res) {
  try {
    const pool = getPool()
    const [rows] = await pool.query(`
      SELECT u.id, u.email, u.name, u.role, u.created_at, u.merchant_id,
             m.code AS merchant_code, m.name AS merchant_name
        FROM users u
        LEFT JOIN merchant m ON m.id = u.merchant_id
       ORDER BY u.id ASC`)
    return res.json(rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function updateUserRole(req, res) {
  try {
    const id = Number(req.params.id)
    const { role } = req.body || {}
    if (!id || !role) return res.status(400).json({ message: 'id and role required' })
    // restrict role changes to safe set; do not allow assigning admin via this endpoint
    const allowed = ['customer', 'merchant']
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' })

    const pool = getPool()
    const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' })

    // Auto-provision merchant if promoting to 'merchant' and user has no merchant_id
    if (role === 'merchant') {
      const [urows] = await pool.query('SELECT id, email, name, merchant_id FROM users WHERE id = ? LIMIT 1', [id])
      if (urows.length) {
        const u = urows[0]
        if (!u.merchant_id) {
          // generate next merchant code like M0001
          let code = 'M0001'
          try {
            const [mx] = await pool.query("SELECT MAX(CAST(SUBSTRING(code,2) AS UNSIGNED)) AS m FROM merchant WHERE code REGEXP '^M[0-9]+$'")
            const next = Number(mx[0]?.m || 0) + 1
            code = 'M' + String(next).padStart(4, '0')
          } catch {}
          const mname = u.name || (u.email ? String(u.email).split('@')[0] : null) || `Merchant ${code}`
          const [ins] = await pool.query('INSERT INTO merchant (code, name) VALUES (?, ?)', [code, mname])
          const mid = ins.insertId
          await pool.query('UPDATE users SET merchant_id = ? WHERE id = ?', [mid, id])
        }
      }
    }

    // return user with merchant info
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.merchant_id, m.code AS merchant_code, m.name AS merchant_name
         FROM users u
    LEFT JOIN merchant m ON m.id = u.merchant_id
        WHERE u.id = ? LIMIT 1`,
      [id]
    )
    return res.json({ ok: true, user: rows[0] })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function updateUserMerchant(req, res) {
  try {
    const id = Number(req.params.id)
    const { merchant_id, merchant_code } = req.body || {}
    if (!id) return res.status(400).json({ message: 'id required' })
    const pool = getPool()
    let mid = merchant_id ? Number(merchant_id) : null
    if (!mid && merchant_code) {
      const [m] = await pool.query('SELECT id FROM merchant WHERE code = ? LIMIT 1', [merchant_code])
      if (!m.length) return res.status(404).json({ message: 'merchant_code not found' })
      mid = m[0].id
    }
    if (mid === null) return res.status(400).json({ message: 'merchant_id or merchant_code required' })
    const [r] = await pool.query('UPDATE users SET merchant_id = ? WHERE id = ?', [mid, id])
    if (r.affectedRows === 0) return res.status(404).json({ message: 'User not found' })
    const [rows] = await pool.query('SELECT id, email, name, role, merchant_id FROM users WHERE id = ? LIMIT 1', [id])
    return res.json({ ok: true, user: rows[0] })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { listUsers, updateUserRole, updateUserMerchant }
