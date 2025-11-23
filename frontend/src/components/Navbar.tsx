import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <header className="app-header app-container tab-panel">
      <div className="brand">
        <img src="/logo.png" alt="Logo" className="logo-img" />
        <div>
          <div style={{ fontSize: 14 }}>FS - Fast and Safe Express</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Theo dõi & quản lý đơn hàng</div>
        </div>
      </div>

      <nav className="nav-links tab-panel">
        <Link to="/">Trang chủ</Link>
        <Link to="/tracking">Tra cứu đơn hàng</Link>

        {!user && <Link to="/auth">Đăng nhập</Link>}

        {(user?.role === 'admin' || user?.role === 'merchant') && (
          <Link to="/admin/create">Tạo đơn</Link>
        )}

        {user?.role === 'admin' && (
          <>
            <Link to="/admin">Bảng điều khiển</Link>
            <Link to="/admin/users">Quản lý</Link>
          </>
        )}
        {user?.role === 'merchant' && (
          <Link to="/admin">Bảng điều khiển</Link>
        )}

        <button className="btn" onClick={toggle} title="Đổi giao diện" style={{ marginLeft: 6 }}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {user && (
          <>
            <span style={{ color: 'var(--muted)', padding: '6px 10px', borderRadius: 8 }}>{user.name ?? user.email}</span>
            <button className="btn" onClick={logout}>Đăng xuất</button>
          </>
        )}
      </nav>
    </header>
  )
}

