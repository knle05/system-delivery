import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const slides = [
    { id: 1, title: 'GIAO HÀNG TOÀN QUỐC', sub: 'Chỉ từ 11.000đ', bg: 'linear-gradient(90deg,#ffedd5,#fecaca)' },
    { id: 2, title: 'NHANH – RẺ – AN TOÀN', sub: 'Lên đơn ngay', bg: 'linear-gradient(90deg,#dbeafe,#fde68a)' },
    { id: 3, title: 'ĐỒNG HÀNH CÙNG SHOP', sub: 'Thu hộ COD minh bạch', bg: 'linear-gradient(90deg,#e9d5ff,#bfdbfe)' },
  ]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 4000)
    return () => clearInterval(t)
  }, [slides.length])

  const totalW = slides.length * 100
  const slideW = 100 / slides.length

  function onTrack(e: React.FormEvent) {
    e.preventDefault()
    const v = code.trim()
    if (!v) return
    try { localStorage.setItem('sd_last_track', v) } catch {}
    navigate('/tracking')
  }

  return (
    <div className='app-container'>
      <section className='notice'>
        <div className='notice-heading'>THÔNG BÁO QUAN TRỌNG</div>
        <p className='notice-text'>
          Hệ thống địa chỉ sử dụng 3 cấp (Tỉnh/TP – Quận/Huyện – Phường/Xã). Vui lòng nhập đúng địa chỉ khi tạo đơn.
        </p>

        <div className='notice-slider'>
          <div
            className='slides'
            style={{ width: `${totalW}%`, transform: `translateX(-${(idx * 100) / slides.length}%)` }}
          >
            {slides.map(s => (
              <div key={s.id} className='slide' style={{ background: s.bg, width: `${slideW}%` }}>
                <div className='slide-left'>
                  <div className='slide-title'>{s.title}</div>
                  <div className='slide-sub'>{s.sub}</div>
                </div>
                <div className='slide-right'>
                  <img src='/logo.png' alt='logo' />
                </div>
              </div>
            ))}
          </div>
          <div className='dots'>
            {slides.map((s, i) => (
              <button
                key={s.id}
                className={i === idx ? 'dot active' : 'dot'}
                onClick={() => setIdx(i)}
                aria-label={`slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className='home-search'>
        <form onSubmit={onTrack} className='search-form'>
          <input
            className='search-input'
            placeholder='Nhập mã đơn để tra cứu'
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className='btn search-btn' type='submit'>Theo dõi</button>
        </form>
        <div className='quick-tiles'>
          <a className='tile' href='/admin/create'>Bắt đầu tạo đơn</a>
          <a className='tile' href='/estimate'>Ước tính chi phí</a>
          <a className='tile' href='/tracking'>Tra cứu đơn hàng</a>
        </div>
      </section>

      <section className='services'>
        <h2 className='section-title'>Dịch vụ của chúng tôi</h2>
        <div className='services-grid'>
          <div className='svc-card'><div className='svc-ic'>📦</div><div className='svc-title'>Đón & Lấy hàng</div><div className='svc-sub'>Hẹn giờ linh hoạt</div></div>
          <div className='svc-card'><div className='svc-ic'>⚡</div><div className='svc-title'>Giao nhanh</div><div className='svc-sub'>Nội thành & Liên tỉnh</div></div>
          <div className='svc-card'><div className='svc-ic'>💵</div><div className='svc-title'>Giao COD</div><div className='svc-sub'>Đối soát minh bạch</div></div>
          <div className='svc-card'><div className='svc-ic'>🛡️</div><div className='svc-title'>Bảo hiểm</div><div className='svc-sub'>Bảo vệ hàng hóa</div></div>
        </div>
      </section>

      <section className='about'>
        <h2 className='section-title'>Về chúng tôi</h2>
        <p className='muted-small' style={{maxWidth:820}}>
          FS - Fast and Safe Express cung cấp dịch vụ giao hàng toàn quốc với tiêu chí nhanh, rẻ, an toàn.
          Chúng tôi mang đến các giải pháp vận tải cho doanh nghiệp vừa, nhỏ và cộng đồng địa phương.
          <a href='/about-us' style={{ marginLeft: 6, color: 'var(--accent)' }}>Xem thêm</a>
        </p>
        <div className='services-grid' style={{marginTop:8}}>
          <div className='svc-card'><div className='svc-ic'>🚛</div><div className='svc-title'>Phủ sóng</div><div className='svc-sub'>Toàn quốc</div></div>
          <div className='svc-card'><div className='svc-ic'>⏱️</div><div className='svc-title'>Nhanh chóng</div><div className='svc-sub'>Đúng hẹn</div></div>
          <div className='svc-card'><div className='svc-ic'>📱</div><div className='svc-title'>Công nghệ</div><div className='svc-sub'>Theo dõi realtime</div></div>
          <div className='svc-card'><div className='svc-ic'>🤝</div><div className='svc-title'>Tận tâm</div><div className='svc-sub'>Đội ngũ bền bỉ</div></div>
        </div>
      </section>

      <section className='partners'>
        <h2 className='section-title'>Đối tác của chúng tôi</h2>
        <div className='partners-row'>
          <span className='partner'>Shopee</span>
          <span className='partner'>Lazada</span>
          <span className='partner'>Tiki</span>
          <span className='partner'>Haravan</span>
          <span className='partner'>Zalopay</span>
          <span className='partner'>Sapo</span>
        </div>
      </section>

      <footer className='site-footer'>
        <div className='footer-grid'>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>FS - Fast and Safe Express</div>
            <div className='muted-small'>Giải pháp vận chuyển toàn quốc.</div>
          </div>
          <div>
            <div className='muted-small'>CSKH: 0779091259</div>
            <div className='muted-small'>Email: phat030103@gmail.com</div>
          </div>
        </div>
        <div className='muted-small' style={{ marginTop: 8 }}>© FS - Fast and Safe Express</div>
      </footer>
    </div>
  )
}

