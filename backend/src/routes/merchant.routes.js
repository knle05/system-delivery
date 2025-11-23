const router = require('express').Router()
const { authMiddleware, adminOnly } = require('../controllers/auth.controller')
const { listMerchants } = require('../controllers/merchant.controller')

// Admin-only: list all merchants
router.get('/', authMiddleware, adminOnly, listMerchants)

module.exports = router

