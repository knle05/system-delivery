const { getPool } = require('../db')

async function listHubs(_req, res) {
  try {
    const pool = getPool()
    const [rows] = await pool.query('SELECT id, name FROM hub ORDER BY name ASC')
    return res.json(rows)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { listHubs }

