const { getPool } = require('../db')

async function listMerchants(req, res) {
  try {
    const pool = getPool()
    const [rows] = await pool.query('SELECT id, code, name FROM merchant ORDER BY id ASC')
    return res.json(rows)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { listMerchants }

