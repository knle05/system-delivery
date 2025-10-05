import OrderCard from '../components/OrderCard'

export default function Home() {
  const sample = {
    id: 'HOME-001',
    status: 'Hoàn thành',
    customer: 'Nguyễn Văn A',
    address: '123 Đường Láng, Hà Nội',
  }

  return (
    <div className="app-container">
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-title">Tra cứu và quản lý đơn hàng</h1>
          <p className="hero-sub">Nhập mã đơn để xem trạng thái, lịch sử và vị trí giao hàng. Giao diện tối giản, dễ dùng.</p>
        </div>
        <div style={{width:320}}>
          <div className="card">
            <div style={{fontWeight:700, marginBottom:8}}>Bắt đầu ngay</div>
            <div style={{color:'var(--muted)'}}>Nhập mã đơn ở trang Tra cứu để kiểm tra trạng thái.</div>
          </div>
        </div>
      </section>

      <section style={{marginTop:18}}>
        <h2 style={{margin:'0 0 12px 0'}}>Đơn hàng mẫu</h2>
        <OrderCard order={sample} />
      </section>
    </div>
  )
}