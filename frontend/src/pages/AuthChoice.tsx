import { Link } from 'react-router-dom'

export default function AuthChoice() {
  return (
    <div className="app-container" style={{ maxWidth: 820, margin: '16px auto' }}>
      <h1 style={{ marginTop: 0 }}>Đăng nhập</h1>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/login" style={{ textDecoration: 'none', flex: 1 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Khách hàng</div>
            <div style={{ color: 'var(--muted)', marginTop: 8 }}>
              Đăng nhập để tra cứu đơn hàng, theo dõi trạng thái và nhận thông báo.
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn">Đăng nhập khách</button>
            </div>
          </div>
        </Link>

        <Link to="/admin/login" style={{ textDecoration: 'none', flex: 1 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Quản trị viên</div>
            <div style={{ color: 'var(--muted)', marginTop: 8 }}>
              Đăng nhập dành cho nhân viên/ admin để quản lý, tra cứu và cập nhật đơn hàng.
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn">Đăng nhập admin</button>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}