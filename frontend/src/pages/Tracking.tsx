import { useState } from 'react'
import { trackOrder } from '../services/api'
import OrderCard from '../components/OrderCard'

type Order = {
  id: string
  status?: string
  customer?: string
  address?: string
}

export default function Tracking() {
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onTrack(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOrder(null)
    if (!orderId.trim()) {
      setError('Vui lòng nhập mã đơn hàng.')
      return
    }
    setLoading(true)
    try {
      const res = await trackOrder(orderId.trim())
      setOrder(res)
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
              <input
                className="input"
                placeholder="Nhập mã đơn hàng (ví dụ: A12345)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Đang tra cứu...' : 'Tra cứu'}
              </button>
            </div>
            {error && <div style={{ color: '#ff7a7a', fontWeight: 700 }}>{error}</div>}
          </form>
        </div>

        {order && (
          <section style={{ marginTop: 16 }}>
            <h2>Kết quả</h2>
            <OrderCard order={order} />
          </section>
        )}
      </section>
    </div>
  )
}