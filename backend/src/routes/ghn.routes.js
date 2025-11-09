const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/ghn.controller')

router.get('/provinces', ctrl.provinces)
router.get('/districts', ctrl.districts)
router.post('/districts', ctrl.districts)
router.get('/wards', ctrl.wards)
router.post('/wards', ctrl.wards)
router.post('/services', ctrl.services)
router.post('/fee', ctrl.fee)

module.exports = router
