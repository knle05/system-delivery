import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const from = (loc.state as any)?.from?.pathname || '/admin'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await auth.login(email.trim(), password)
      if (res?.token && res.user?.role === 'admin') {
        navigate(from, { replace: true })
      } else {
        // nếu login thành công nhưng không phải admin, logout và báo lỗi
        auth.logout()
        setError('Tài khoản không có quyền admin hoặc thông tin sai.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi đăng nhập')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container" style={{ maxWidth: 520, margin: '16px auto' }}>
      <h1 style={{ marginTop: 0 }}>Đăng nhập Admin</h1>
      <div className="card">
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input" placeholder="Email admin" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} type="password" />
          {error && <div style={{ color: '#ff7a7a', fontWeight: 700 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Đang...' : 'Đăng nhập'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}