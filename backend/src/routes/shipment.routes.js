const express = require('express')
const router = express.Router()
const { authMiddleware, adminOnly } = require('../controllers/auth.controller')
const { createShipment } = require('../controllers/shipment.controller')

// Tạo vận đơn theo schema shipment + waybill
router.post('/', authMiddleware, adminOnly, createShipment)

module.exports = router

