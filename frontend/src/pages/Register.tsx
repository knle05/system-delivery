import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) { setError('Email và mật khẩu bắt buộc'); return }
    setLoading(true)
    try {
      await register(email.trim(), password, name.trim() || undefined)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi đăng ký')
    } finally { setLoading(false) }
  }

  return (
    <div className="app-container" style={{ maxWidth:520, margin:'16px auto' }}>
      <h1 style={{marginTop:0}}>Đăng ký</h1>
      <div className="card">
        <form onSubmit={onSubmit} style={{display:'flex', flexDirection:'column', gap:12}}>
          <input className="input" placeholder="Họ tên (tùy chọn)" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" />
          <input className="input" placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)} type="password" />
          {error && <div style={{color:'#ff7a7a', fontWeight:700}}>{error}</div>}
          <div style={{display:'flex', gap:8}}>
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Đang...' : 'Đăng ký'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}