const express = require('express')
const router = express.Router()
const { getTrack } = require('../controllers/track.controller')

// Public tracking by waybill number
router.get('/:code', getTrack)

module.exports = router

