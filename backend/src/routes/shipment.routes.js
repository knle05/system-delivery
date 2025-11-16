const express = require('express')
const router = express.Router()
const { authMiddleware, adminOrMerchant } = require('../controllers/auth.controller')
const { createShipment, listShipments, addShipmentEvent } = require('../controllers/shipment.controller')

// Tạo vận đơn theo schema shipment + waybill
router.post('/', authMiddleware, adminOrMerchant, createShipment)
router.get('/', authMiddleware, adminOrMerchant, listShipments)
router.post('/:waybill/events', authMiddleware, adminOrMerchant, addShipmentEvent)

module.exports = router
