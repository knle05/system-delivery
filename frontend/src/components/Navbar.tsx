import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <header className="app-header app-container">
      <div className="brand">
        <div className="logo">SD</div>
        <div>
          <div style={{ fontSize: 14 }}>System Delivery</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Theo dõi & quản lý đơn hàng</div>
        </div>
      </div>

      <nav className="nav-links">
        <Link to="/">Trang chủ</Link>
        <Link to="/tracking">Tra cứu đơn hàng</Link>

        {!user && <Link to="/auth">Đăng nhập</Link>}

        {user?.role === 'admin' && (
          <>
            <Link to="/admin">Quản lý (Admin)</Link>
            <Link to="/admin/create">Tạo đơn</Link>
          </>
        )}

        <button className="btn" onClick={toggle} title="Đổi giao diện" style={{ marginLeft: 6 }}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {user && (
          <>
            <span style={{ color: 'var(--muted)', padding: '8px 12px', borderRadius: 8 }}>{user.name ?? user.email}</span>
            <button className="btn" onClick={logout}>Đăng xuất</button>
          </>
        )}
      </nav>
    </header>
  )
}

