const { getPool } = require('../db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

async function ensureAdmin() {
  const pool = getPool()
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin'
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [adminEmail])
  if (rows.length === 0) {
    const hashed = await bcrypt.hash(adminPassword, 10)
    await pool.query('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', [adminEmail, hashed, 'Admin', 'admin'])
    console.log(`Admin user created: ${adminEmail}`)
  }
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

async function register(req, res) {
  const { email, password, name } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password required' })
  try {
    const pool = getPool()
    const [exists] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email])
    if (exists.length) return res.status(409).json({ message: 'Email already exists' })
    const hashed = await bcrypt.hash(password, 10)
    const [result] = await pool.query('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', [email, hashed, name || null, 'customer'])
    const id = result.insertId
    const [rows] = await pool.query('SELECT id, email, name, role FROM users WHERE id = ? LIMIT 1', [id])
    const user = rows[0]
    const token = signToken({ id: user.id, email: user.email, role: user.role })
    return res.status(201).json({ token, user })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password required' })
  try {
    const pool = getPool()
    const [rows] = await pool.query('SELECT id, email, password, name, role FROM users WHERE email = ? LIMIT 1', [email])
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' })
    const user = rows[0]
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
    const token = signToken({ id: user.id, email: user.email, role: user.role })
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' })
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

async function me(req, res) {
  try {
    const pool = getPool()
    // req.user must be set by authMiddleware
    const id = req.user?.id
    if (!id) return res.status(401).json({ message: 'Unauthorized' })
    const [rows] = await pool.query('SELECT id, email, name, role FROM users WHERE id = ? LIMIT 1', [id])
    if (!rows.length) return res.status(404).json({ message: 'User not found' })
    return res.json(rows[0])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  next()
}

function adminOrMerchant(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'merchant')) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  next()
}

module.exports = { register, login, me, authMiddleware, ensureAdmin, adminOnly, adminOrMerchant }

