const express = require('express')
const router = express.Router()
const { authMiddleware, adminOrMerchant } = require('../controllers/auth.controller')
const { listHubs } = require('../controllers/hub.controller')

router.get('/', authMiddleware, adminOrMerchant, listHubs)

module.exports = router

