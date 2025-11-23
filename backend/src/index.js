const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const dotenv = require('dotenv')
const { initDB, getPool } = require('./db')
const orderRoutes = require('./routes/order.routes')
const shipmentRoutes = require('./routes/shipment.routes')
const trackRoutes = require('./routes/track.routes')
const authRoutes = require('./routes/auth.routes')
const hubRoutes = require('./routes/hub.routes')
const userRoutes = require('./routes/user.routes')
const { ensureAdmin } = require('./controllers/auth.controller')

dotenv.config()

const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN || true }))
app.use(bodyParser.json())

app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Quick DB health check
app.get('/health/db', async (req, res) => {
  try {
    const pool = getPool()
    const [rows] = await pool.query('SELECT 1 AS ok')
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/shipments', shipmentRoutes)
app.use('/api/track', trackRoutes)
app.use('/api/ghn', require('./routes/ghn.routes'))
app.use('/api/hubs', hubRoutes)
app.use('/api/users', userRoutes)
app.use('/api/merchants', require('./routes/merchant.routes'))

// basic error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

async function main() {
  try {
    await initDB()
    // create admin if missing
    try { await ensureAdmin() } catch (e) { console.warn('ensureAdmin failed', e.message) }
    const port = Number(process.env.APP_PORT || process.env.PORT || 3000)
    app.listen(port, '127.0.0.1', () => {
      console.log(`Server listening on http://127.0.0.1:${port}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

main()


