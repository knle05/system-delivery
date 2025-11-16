type Order = {
  id: string
  status?: string
  customer?: string
  address?: string
}

function statusClass(status?: string) {
  if (!status) return 'status pending'
  const s = status.toLowerCase()
  if (s.includes('hoàn') || s.includes('xong') || s.includes('đã')) return 'status done'
  if (s.includes('giao') || s.includes('đang')) return 'status transit'
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
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Mã đơn</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{order.id}</div>

          <div style={{ height: 12 }} />

          <div className="order-meta"><strong>{customerLabel}:</strong> {order.customer ?? '—'}</div>
          <div className="order-meta"><strong>{addressLabel}:</strong> {order.address ?? '—'}</div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: 8 }} className={statusClass(order.status)}>{order.status ?? 'Chưa xử lý'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Cập nhật gần nhất</div>
        </div>
      </div>
    </article>
  )
}
