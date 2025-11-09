import { useState } from 'react'
import { trackOrder, trackDetail } from '../services/api'
import OrderCard from '../components/OrderCard'

type Order = {
  id: string
  status?: string
  customer?: string
  address?: string
}

export default function Tracking() {
  const [orderId, setOrderId] = useState<string>(() => {
    try {
      const v = localStorage.getItem('sd_last_track') || ''
      if (v) localStorage.removeItem('sd_last_track')
      return v
    } catch { return '' }
  })
  const [order, setOrder] = useState<Order | null>(null)
  const [events, setEvents] = useState<Array<{ time: string; code: string; hub?: string; description?: string }>>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onTrack(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOrder(null)
    setEvents([])
    const code = orderId.trim()
    if (!code) { setError('Vui lòng nhập mã đơn hàng.'); return }
    setLoading(true)
    try {
      try {
        const det = await trackDetail(code, { status: statusFilter || undefined, from: from || undefined, to: to || undefined })
        const o: Order = {
          id: det.snapshot?.waybill_number || code,
          status: det.snapshot?.status_text || det.snapshot?.status_code,
          customer: undefined,
          address: det.snapshot?.last_hub ? `Nearest hub: ${det.snapshot.last_hub}` : undefined,
        }
        setOrder(o)
        setEvents(det.events || [])
      } catch {
        const res = await trackOrder(code)
        setOrder(res)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tra cứu đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <section>
        <h1 style={{ marginTop: 0 }}>Tra cứu đơn hàng</h1>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <form onSubmit={onTrack} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }} className="form-row">
              <input className="input" placeholder="Nhập mã đơn hàng (ví dụ: WB-0001)" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Đang tra cứu...' : 'Tra cứu'}</button>
            </div>
            <div className="form-row" style={{ display:'flex', gap:8 }}>
              <input className="input" placeholder="Lọc trạng thái (ví dụ: DELIVERED)" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} />
              <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
              <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
            </div>
            {error && <div style={{ color: '#ff7a7a', fontWeight: 700 }}>{error}</div>}
          </form>
        </div>

        {order && (
          <section style={{ marginTop: 16 }}>
            <h2>Kết quả</h2>
            <OrderCard order={order} />
            {events.length > 0 && (
              <div className="card" style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Lịch sử trạng thái</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {events.map((ev, idx) => (
                    <div key={idx} style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                      <div style={{ color:'var(--muted)' }}>{new Date(ev.time).toLocaleString('vi-VN')}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600 }}>{ev.code}</div>
                        <div style={{ color:'var(--muted)' }}>{ev.hub || ''}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>{ev.description || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  )
}

