const express = require('express')
const router = express.Router()
const { authMiddleware, adminOnly, adminOrMerchant } = require('../controllers/auth.controller')
const { getOrder, createOrder, listOrders, updateOrder } = require('../controllers/order.controller')

// Public tracking by numeric id (giữ tạm theo UI hiện tại)
router.get('/:id', getOrder)

// List orders: admin or merchant
router.get('/', authMiddleware, adminOrMerchant, listOrders)

// Update order: admin only
router.patch('/:id', authMiddleware, adminOnly, updateOrder)

// Create order: admin or merchant
router.post('/', authMiddleware, adminOrMerchant, createOrder)

module.exports = router

