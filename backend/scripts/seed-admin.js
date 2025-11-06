const { initDB, getPool } = require('../src/db')
const bcrypt = require('bcryptjs')
require('dotenv').config()

async function run() {
  await initDB()
  const pool = getPool()
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin'
  const force = String(process.env.ADMIN_FORCE_RESET || '').toLowerCase() === '1' ||
                process.argv.includes('--force')

  const [rows] = await pool.query('SELECT id, password, role FROM users WHERE email = ? LIMIT 1', [adminEmail])
  if (rows.length === 0) {
    const hashed = await bcrypt.hash(adminPassword, 10)
    await pool.query('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', [adminEmail, hashed, 'Admin', 'admin'])
    console.log('Admin created', adminEmail)
  } else {
    const u = rows[0]
    if (force) {
      const hashed = await bcrypt.hash(adminPassword, 10)
      await pool.query('UPDATE users SET password=?, role=? WHERE id=?', [hashed, 'admin', u.id])
      console.log('Admin password reset and role enforced for', adminEmail)
    } else {
      console.log('Admin exists. Use --force or ADMIN_FORCE_RESET=1 to reset password.')
    }
  }
  process.exit(0)
}
run().catch(e => { console.error(e); process.exit(1) })
