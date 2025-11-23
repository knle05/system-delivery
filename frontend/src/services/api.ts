export type User = { id?: number; email: string; name?: string; role?: 'admin' | 'customer' | 'merchant' }
export type Order = {
  id: number
  customer: string
  address: string
  status: string
  created_at?: string
  updated_at?: string | null
  order_code?: string
}

export type WaybillItem = {
  id: string
  customer: string
  address: string
  status: string
  order_code?: string
  created_at?: string
}

// ===== Local mock helpers (optional fallback) =====
function loadMockUsers(): Array<{ email: string; password: string; name?: string; role?: string }> {
  try { return JSON.parse(localStorage.getItem('sd_mock_users') || 'null') || [] } catch { return [] }
}
function saveMockUsers(users: Array<any>) { localStorage.setItem('sd_mock_users', JSON.stringify(users)) }

function loadSessions(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('sd_sessions') || 'null') || {} } catch { return {} }
}
function saveSessions(s: Record<string, string>) { localStorage.setItem('sd_sessions', JSON.stringify(s)) }

function makeToken(email: string) { return `mocked-${btoa(email + '|' + Date.now())}` }

const FORCE_MOCK = import.meta.env.VITE_FORCE_MOCK === 'true'

// helper: SHA-256 hex (browser crypto)
async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
function looksHashed(s: string | undefined) {
  return typeof s === 'string' && /^[a-f0-9]{64}$/.test(s)
}

// ensure admin exists (mock store)
;(async function ensureAdmin() {
  try {
    const users = loadMockUsers()
    if (!users.find(u => u.email === 'admin@example.com')) {
      const hashed = await sha256Hex('admin')
      users.push({ email: 'admin@example.com', password: hashed, name: 'Admin', role: 'admin' })
      saveMockUsers(users)
    }
  } catch {}
})()

// ===== Auth =====
export async function login(email: string, password: string) {
  if (FORCE_MOCK) {
    const users = loadMockUsers()
    const found = users.find(u => u.email === email)
    if (!found) throw new Error('Tài khoản không tồn tại.')
    // nếu mật khẩu lưu dạng thường (legacy) thì so sánh trực tiếp và nâng cấp sang hash
    if (!looksHashed(found.password)) {
      if (found.password !== password) throw new Error('Mật khẩu không đúng.')
      found.password = await sha256Hex(password)
      saveMockUsers(users)
    } else {
      const hashed = await sha256Hex(password)
      if (found.password !== hashed) throw new Error('Mật khẩu không đúng.')
    }
    const token = makeToken(email)
    const sessions = loadSessions()
    sessions[token] = email
    saveSessions(sessions)
    return { token, user: { email: found.email, name: found.name, role: (found.role as 'admin' | 'customer' | 'merchant') } }
  }

  // hiện tại: thử gọi backend, fallback sang mock nếu lỗi (khi FORCE_MOCK)
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `API lỗi: ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    if (FORCE_MOCK) {
      const users = loadMockUsers()
      const found = users.find(u => u.email === email)
      if (!found) throw new Error('Tài khoản không tồn tại.')
      if (!looksHashed(found.password)) {
        if (found.password !== password) throw new Error('Mật khẩu không đúng.')
        found.password = await sha256Hex(password)
        saveMockUsers(users)
      } else {
        const hashed = await sha256Hex(password)
        if (found.password !== hashed) throw new Error('Mật khẩu không đúng.')
      }
      const token = makeToken(email)
      const sessions = loadSessions()
      sessions[token] = email
      saveSessions(sessions)
      return { token, user: { email: found.email, name: found.name, role: (found.role as 'admin' | 'customer' | 'merchant') } }
    }
    throw err instanceof Error ? err : new Error('Login failed')
  }
}

export async function register(email: string, password: string, name?: string) {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `API lỗi: ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    if (FORCE_MOCK) {
      // mock: tạo user local (báo lỗi nếu trùng email)
      const users = loadMockUsers()
      if (users.find(u => u.email === email)) throw new Error('Tài khoản đã tồn tại.')
      const hashed = await sha256Hex(password)
      const newUser = { email, password: hashed, name: name || email.split('@')[0], role: 'customer' }
      users.push(newUser)
      saveMockUsers(users)
      const token = makeToken(email)
      const sessions = loadSessions()
      sessions[token] = email
      saveSessions(sessions)
      return { token, user: { email: newUser.email, name: newUser.name, role: 'customer' } }
    }
    throw err instanceof Error ? err : new Error('Register failed')
  }
}

export async function me(token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch('/api/auth/me', { headers })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `API lỗi: ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    if (FORCE_MOCK) {
      // mock validate token -> find session
      if (!token) throw new Error('No token')
      const sessions = loadSessions()
      const email = sessions[token]
      if (!email) throw new Error('Token không hợp lệ.')
      const users = loadMockUsers()
      const u = users.find(x => x.email === email)
      if (!u) throw new Error('Người dùng không tồn tại.')
      return { email: u.email, name: u.name, role: u.role as 'admin' | 'customer' | 'merchant' }
    }
    throw err instanceof Error ? err : new Error('Me failed')
  }
}

// ===== Legacy single order lookup =====
export async function trackOrder(id: string) {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`)
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `API lỗi: ${res.status}`)
    }
    return await res.json()
  } catch {
    return {}
  }
}

// ===== Detailed tracking: snapshot + timeline =====
export async function trackDetail(
  code: string,
  params: { status?: string; from?: string; to?: string; page?: number; pageSize?: number } = {}
): Promise<{ snapshot: any, events: Array<{ time: string, code: string, hub?: string, description?: string }>, page?: number, pageSize?: number, total?: number }>
{
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  const url = qs.toString() ? `/api/track/${encodeURIComponent(code)}?${qs.toString()}` : `/api/track/${encodeURIComponent(code)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

// ===== Orders (admin/merchant) =====
export async function listOrders(
  params: { q?: string; page?: number; pageSize?: number; status?: string; from?: string; to?: string } = {},
  token?: string
): Promise<{ items: Order[]; total: number; page: number; pageSize: number }>
{
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.status) qs.set('status', params.status)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/orders?${qs.toString()}`, { headers })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

export async function createOrder(
  data: Pick<Order, 'customer' | 'address'> & { status?: string },
  token?: string
): Promise<Order>
{
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

// ===== Shipments =====
export type ShipmentCreateInput = {
  merchant_code?: string
  order_code?: string
  ref_code?: string
  sender: { full_name?: string; phone?: string; address: string; district?: string; province?: string }
  receiver: { full_name?: string; phone?: string; address: string; district?: string; province?: string }
  service_type?: string
  cod_amount?: number
  items?: Array<{ name?: string; weight_g?: number; value?: number }>
}

export async function createShipment(
  data: ShipmentCreateInput,
  token?: string
): Promise<{ shipment_id: number; waybill_number: string; order_code: string; status: string }>
{
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/shipments', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

export async function listWaybills(
  params: { q?: string; page?: number; pageSize?: number; status?: string; from?: string; to?: string } = {},
  token?: string
): Promise<{ items: WaybillItem[]; total: number; page: number; pageSize: number }>
{
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.status) qs.set('status', params.status)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/shipments?${qs.toString()}`, { headers })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

export async function addWaybillEvent(
  waybill: string,
  data: { mapped_code: string; description?: string; event_time?: string; hub_id?: number },
  token?: string
): Promise<{ ok: true }>
{
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/shipments/${encodeURIComponent(waybill)}/events`, {
    method: 'POST', headers, body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

// ===== GHN proxy APIs =====
export async function ghnProvinces() {
  const r = await fetch('/api/ghn/provinces')
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function ghnDistricts(province_id: number) {
  const r = await fetch('/api/ghn/districts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ province_id })
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function ghnWards(district_id: number) {
  const r = await fetch('/api/ghn/wards', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ district_id })
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function ghnAvailableServices(payload: { shop_id?: number; from_district: number; to_district: number }) {
  const r = await fetch('/api/ghn/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function ghnFee(payload: any) {
  const r = await fetch('/api/ghn/fee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

// ===== Hubs =====
export type Hub = { id: number; name: string }
export async function listHubs(token?: string): Promise<Hub[]> {
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/hubs', { headers })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

