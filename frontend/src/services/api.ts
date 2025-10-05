export type User = { email: string; name?: string; role?: 'admin' | 'customer' }

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

// ensure admin exists (store hashed password)
;(async function ensureAdmin() {
  const users = loadMockUsers()
  if (!users.find(u => u.email === 'admin@example.com')) {
    const hashed = await sha256Hex('admin')
    users.push({ email: 'admin@example.com', password: hashed, name: 'Admin', role: 'admin' })
    saveMockUsers(users)
  }
})()

export async function login(email: string, password: string) {
  if (FORCE_MOCK) {
    const users = loadMockUsers()
    const found = users.find(u => u.email === email)
    if (!found) throw new Error('Tài khoản không tồn tại.')
    // if stored password is plain (legacy), accept direct match and upgrade to hashed
    if (!looksHashed(found.password)) {
      if (found.password !== password) throw new Error('Mật khẩu không đúng.')
      // upgrade: hash and save
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
    return { token, user: { email: found.email, name: found.name, role: (found.role as 'admin' | 'customer') } }
  }

  // hiện tại: thử gọi backend, fallback sang mock nếu lỗi
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `API trả lỗi: ${res.status}`)
    }
    return await res.json()
  } catch {
    // mock: validate against local users
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
    return { token, user: { email: found.email, name: found.name, role: (found.role as 'admin' | 'customer') } }
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
      throw new Error(t || `API trả lỗi: ${res.status}`)
    }
    return await res.json()
  } catch {
    // mock: create local user (fail if exists)
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
}

export async function me(token?: string) {
  // try real backend
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch('/api/auth/me', { headers })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `API trả lỗi: ${res.status}`)
    }
    return await res.json()
  } catch {
    // mock validate token -> find session
    if (!token) throw new Error('No token')
    const sessions = loadSessions()
    const email = sessions[token]
    if (!email) throw new Error('Token không hợp lệ.')
    const users = loadMockUsers()
    const u = users.find(x => x.email === email)
    if (!u) throw new Error('Người dùng không tồn tại.')
    return { email: u.email, name: u.name, role: u.role as 'admin' | 'customer' }
  }
}

export async function trackOrder(id: string) {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`)
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || `API trả lỗi: ${res.status}`)
    }
    return await res.json()
  } catch {
    // fallback mock when backend absent
    return {
      id,
      status: 'Đang giao',
      customer: 'Khách demo',
      address: 'Địa chỉ demo',
      updatedAt: new Date().toISOString(),
    }
  }
}