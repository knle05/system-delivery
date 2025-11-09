const dotenv = require('dotenv')
dotenv.config()

const BASE = 'https://online-gateway.ghn.vn/shiip/public-api'

function headers(shopId) {
  const token = process.env.GHN_TOKEN
  if (!token) throw new Error('GHN_TOKEN is not set')
  const h = { 'Content-Type': 'application/json', 'Token': token }
  const sid = shopId || process.env.GHN_SHOP_ID
  if (sid) h['ShopId'] = String(sid)
  return h
}

async function provinces(_req, res) {
  try {
    const r = await fetch(`${BASE}/master-data/province`, { method: 'GET', headers: headers() })
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

async function districts(req, res) {
  try {
    const body = req.method === 'POST' ? req.body : { province_id: Number(req.query.province_id) }
    const r = await fetch(`${BASE}/master-data/district`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

async function wards(req, res) {
  try {
    const body = req.method === 'POST' ? req.body : { district_id: Number(req.query.district_id) }
    const r = await fetch(`${BASE}/master-data/ward`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

async function services(req, res) {
  try {
    let payload = req.method === 'POST' ? (req.body || {}) : {
      shop_id: Number(req.query.shop_id || process.env.GHN_SHOP_ID),
      from_district: Number(req.query.from_district),
      to_district: Number(req.query.to_district),
    }
    // ensure shop_id present in body when using POST
    if (!payload.shop_id && process.env.GHN_SHOP_ID) payload.shop_id = Number(process.env.GHN_SHOP_ID)
    const r = await fetch(`${BASE}/v2/shipping-order/available-services`, { method: 'POST', headers: headers(payload.shop_id), body: JSON.stringify(payload) })
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

async function fee(req, res) {
  try {
    const payload = req.body || {}
    if (!payload.shop_id && process.env.GHN_SHOP_ID) payload.shop_id = Number(process.env.GHN_SHOP_ID)
    const r = await fetch(`${BASE}/v2/shipping-order/fee`, { method: 'POST', headers: headers(payload.shop_id), body: JSON.stringify(payload) })
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ message: e.message }) }
}

module.exports = { provinces, districts, wards, services, fee }
