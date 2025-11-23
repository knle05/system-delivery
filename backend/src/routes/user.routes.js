const router = require('express').Router()
const { authMiddleware, adminOnly } = require('../controllers/auth.controller')
const { listUsers, updateUserRole, updateUserMerchant } = require('../controllers/user.controller')

router.get('/', authMiddleware, adminOnly, listUsers)
router.patch('/:id/role', authMiddleware, adminOnly, updateUserRole)
router.patch('/:id/merchant', authMiddleware, adminOnly, updateUserMerchant)

module.exports = router
