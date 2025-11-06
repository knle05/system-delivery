export default function Home() {
  return (
    <div className="app-container">
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-title">Tra cứu và quản lý đơn hàng</h1>
          <p className="hero-sub">Nhập mã đơn để xem trạng thái, lịch sử và vị trí giao hàng. Giao diện tối giản, dễ dùng.</p>
        </div>
        <div style={{ width: 320 }}>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Bắt đầu ngay</div>
            <div style={{ color: 'var(--muted)' }}>Đi tới trang Tra cứu để kiểm tra đơn hàng của bạn.</div>
          </div>
        </div>
      </section>
    </div>
  )
}
