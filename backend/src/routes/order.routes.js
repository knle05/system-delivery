const express = require('express')
const router = express.Router()
const { authMiddleware, adminOnly } = require('../controllers/auth.controller')
const { getOrder, createOrder, listOrders, updateOrder } = require('../controllers/order.controller')

// Public tracking by numeric id (giữ tạm theo UI hiện tại)
router.get('/:id', getOrder)

// Admin APIs
router.get('/', authMiddleware, adminOnly, listOrders)
router.patch('/:id', authMiddleware, adminOnly, updateOrder)

// Create order (chỉ admin)
router.post('/', authMiddleware, adminOnly, createOrder)

module.exports = router
