export default function AboutUs() {
  return (
    <div className="app-container" style={{ paddingTop: 8 }}>
      {/* Hero banner */}
      <section className="about-hero" style={{backgroundImage: "url('/about/hero.jpg')"}}>
        <div className="about-hero-overlay">
          <h1 className="about-hero-title">Giới thiệu về FS - Fast and Safe Express</h1>
          <div className="about-hero-sub">Nhanh - Rẻ - An Toàn</div>
        </div>
      </section>

      {/* Section 1 */}
      <section className="about-two-col">
        <div className="about-text">
          <h2>Đơn Vị Vận Chuyển Đáng Tin Cậy</h2>
          <p className="muted-small">
            FS - Fast and Safe Express là đối tác vận chuyển hàng đầu, hỗ trợ các doanh nghiệp và cửa hàng thương mại điện tử
            tăng trưởng trên toàn quốc. Chúng tôi chú trọng trải nghiệm khách hàng, minh bạch và hiệu quả vận hành.
          </p>
        </div>
        <div className="about-img" style={{backgroundImage: "url('/about/trust.jpg')"}} />
      </section>

      {/* Section 2 */}
      <section className="about-two-col about-reverse">
        <div className="about-text">
          <h2>Phạm Vi Phủ Sóng Rộng Toàn Quốc</h2>
          <p className="muted-small">
            Mạng lưới của chúng tôi phủ khắp các tỉnh thành, mang đến dịch vụ linh hoạt, đáng tin cậy và tối ưu chi phí
            cho mọi nhu cầu vận chuyển, dù ở thành phố hay khu vực xa.
          </p>
        </div>
        <div className="about-img" style={{backgroundImage: "url('/about/coverage.jpg')"}} />
      </section>

      {/* Section 3 */}
      <section className="about-two-col">
        <div className="about-text">
          <h2>Giải Pháp Vận Chuyển Tối Ưu</h2>
          <p className="muted-small">
            Từ giao hàng, hoàn trả đến theo dõi thời gian thực, chúng tôi tích hợp công nghệ để quản lý đơn hàng hiệu quả.
            Với đội ngũ tận tâm, FS - Fast and Safe Express cam kết an toàn và đúng hẹn.
          </p>
        </div>
        <div className="about-img" style={{backgroundImage: "url('/about/optimize.jpg')"}} />
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

