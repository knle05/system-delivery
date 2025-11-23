const express = require('express')
const router = express.Router()
const { authMiddleware, adminOrMerchant } = require('../controllers/auth.controller')
const { getPool } = require('../db')
const { createShipment, listShipments, addShipmentEvent, deleteShipmentEvent, deleteLastShipmentEvent } = require('../controllers/shipment.controller')

// Middleware: for merchant users, map their merchant_id -> merchant_code so controller can use code path safely.
// For admin, enforce merchant_code is provided.
async function ensureMerchantCode(req, res, next) {
  try {
    const role = req.user?.role
    const merchantId = req.user?.merchant_id
    if (role === 'merchant') {
      if (!merchantId) return res.status(403).json({ message: 'Tài khoản đối tác chưa có merchant_id' })
      const pool = getPool()
      const [rows] = await pool.query('SELECT code FROM merchant WHERE id = ? LIMIT 1', [merchantId])
      if (!rows.length) return res.status(403).json({ message: 'Merchant không tồn tại' })
      req.body = req.body || {}
      req.body.merchant_code = rows[0].code
    } else {
      if (!req.body || !req.body.merchant_code) {
        return res.status(400).json({ message: 'merchant_code là bắt buộc với tài khoản admin' })
      }
    }
    next()
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// Tạo vận đơn theo schema shipment + waybill
router.post('/', authMiddleware, adminOrMerchant, ensureMerchantCode, createShipment)
router.get('/', authMiddleware, adminOrMerchant, listShipments)
router.post('/:waybill/events', authMiddleware, adminOrMerchant, addShipmentEvent)
// Important: place 'last' before ':eventId' so it doesn't get captured as a param
router.delete('/:waybill/events/last', authMiddleware, adminOrMerchant, deleteLastShipmentEvent)
router.delete('/:waybill/events/:eventId', authMiddleware, adminOrMerchant, deleteShipmentEvent)

module.exports = router
