const express = require('express')
const router = express.Router()
const { register, login, me, authMiddleware } = require('../controllers/auth.controller')

router.post('/register', register)
router.post('/login', login)
router.get('/me', authMiddleware, me)

module.exports = router