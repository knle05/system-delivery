const express = require('express')
const router = express.Router()
const { authMiddleware, adminOrMerchant } = require('../controllers/auth.controller')
const { createShipment, listShipments, addShipmentEvent, deleteShipmentEvent, deleteLastShipmentEvent } = require('../controllers/shipment.controller')

// Tạo vận đơn theo schema shipment + waybill
router.post('/', authMiddleware, adminOrMerchant, createShipment)
router.get('/', authMiddleware, adminOrMerchant, listShipments)
router.post('/:waybill/events', authMiddleware, adminOrMerchant, addShipmentEvent)
// Important: place 'last' before ':eventId' so it doesn't get captured as a param
router.delete('/:waybill/events/last', authMiddleware, adminOrMerchant, deleteLastShipmentEvent)
router.delete('/:waybill/events/:eventId', authMiddleware, adminOrMerchant, deleteShipmentEvent)

module.exports = router
