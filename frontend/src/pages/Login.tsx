import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const auth = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const from = (loc.state as any)?.from?.pathname || '/'

  // redirect if already logged
  useEffect(() => {
    if (auth.user) {
      if (auth.user.role === 'admin') navigate('/admin', { replace: true })
      else navigate('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user])

  // lấy mode từ query ?mode=register hoặc ?mode=login
  useEffect(() => {
    const p = new URLSearchParams(loc.search)
    const q = p.get('mode')
    setMode(q === 'register' ? 'register' : 'login')
  }, [loc.search])

  // khi đổi mode, reset các field / lỗi
  function switchMode(m: 'login' | 'register') {
    setMode(m)
    setName('')
    setEmail('')
    setPassword('')
    setError(null)
    // cập nhật URL (không reload)
    const url = new URL(window.location.href)
    url.searchParams.set('mode', m)
    window.history.replaceState({}, '', url.toString())
  }

  function validEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }
    if (!validEmail(email.trim())) {
      setError('Email không hợp lệ.')
      return
    }
    setLoading(true)
    try {
      const res = await auth.login(email.trim(), password)
      if (res?.token) {
        if (res.user?.role === 'admin') navigate('/admin')
        else navigate(from, { replace: true })
      } else {
        setError('Đăng nhập thất bại.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Email và mật khẩu bắt buộc.')
      return
    }
    if (!validEmail(email.trim())) {
      setError('Email không hợp lệ.')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }
    setLoading(true)
    try {
      const res = await auth.register(email.trim(), password, name.trim() || undefined)
      if (res?.token) {
        navigate('/', { replace: true })
      } else {
        setError('Đăng ký thất bại.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi đăng ký.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container" style={{ maxWidth: 520, margin: '16px auto' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button
          type="button"
          className="btn"
          style={{ background: mode === 'login' ? 'var(--accent)' : 'transparent', color: mode === 'login' ? '#fff' : 'var(--muted)' }}
          onClick={() => switchMode('login')}
        >
          Đăng nhập khách
        </button>
        <button
          type="button"
          className="btn"
          style={{ background: mode === 'register' ? 'var(--accent)' : 'transparent', color: mode === 'register' ? '#fff' : 'var(--muted)' }}
          onClick={() => switchMode('register')}
        >
          Đăng ký
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <a href="/admin/login" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Đăng nhập Admin</a>
        </div>
      </div>

      <h1 style={{ marginTop: 0 }}>{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</h1>

      <div className="card" style={{ padding: 20 }}>
        {mode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <input className="input" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Bạn có thể đăng nhập bằng email đã đăng ký.</div>
            {error && <div style={{ color: '#ff7a7a', fontWeight: 700 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.04)' }} onClick={() => { setEmail(''); setPassword('') }}>
                Xóa
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input" placeholder="Họ tên (tùy chọn)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <input className="input" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Mật khẩu tối thiểu 6 ký tự.</div>
            {error && <div style={{ color: '#ff7a7a', fontWeight: 700 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</button>
              <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.04)' }} onClick={() => { setName(''); setEmail(''); setPassword('') }}>
                Xóa
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}