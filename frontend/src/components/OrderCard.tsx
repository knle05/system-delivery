type Order = {
  id: string
  status?: string
  customer?: string
  address?: string
}

function statusClass(status?: string) {
  if (!status) return 'status pending'
  const s = String(status).toUpperCase()
  const sd = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  // Cancelled first
  if (s.includes('CANCEL') || s.includes('HỦY') || s.includes('HUỶ') || sd.includes('HUY') || s.includes('FAILED') || s.includes('FAIL')) return 'status cancelled'
  // Done
  if (s.includes('DELIVERED') || s.includes('ĐÃ') || sd.includes('DA ') || sd.endsWith(' DA') || s.includes('HOÀN') || sd.includes('HOAN') || s.includes('DONE')) return 'status done'
  // Transit
  if (s.includes('TRANSIT') || s.includes('ĐANG') || sd.includes('DANG') || s.includes('GIAO') || s.includes('PICKED')) return 'status transit'
  return 'status pending'
}

export default function OrderCard(
  { order, customerLabel = 'Khách', addressLabel = 'Địa chỉ' }:
  { order: Order; customerLabel?: string; addressLabel?: string }
) {
  return (
    <article className="card order-card" style={{ maxWidth: 760 }}>
      <div className="order-grid">
        <div>
          <h2 style={{ fontSize: 14, color: 'var(--muted)' }}>MÃ ĐƠN</h2>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{order.id}</div>

          <div style={{ height: 14 }} />

          <div className="order-meta"><strong>{customerLabel}:</strong> {order.customer ?? '-'}</div>
          <div className="order-meta"><strong>{addressLabel}:</strong> {order.address ?? '-'}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 10}} className={statusClass(order.status)}>{order.status ?? 'Chưa xử lý'}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Cập nhật gần nhất</div>
        </div>
      </div>
    </article>
  )
}
