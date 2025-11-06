import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listOrders, updateOrder, type Order } from '../services/api'

export default function AdminDashboard() {
  const { token, user } = useAuth()
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [from, setFrom] = useState('') // YYYY-MM-DD
  const [to, setTo] = useState('')     // YYYY-MM-DD
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  async function fetchData(e?: React.FormEvent) {
    e?.preventDefault()
    if (!token) return
    setLoading(true)
    try {
      const res = await listOrders({ q, page, pageSize, status: filterStatus || undefined, from: from || undefined, to: to || undefined }, token)
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      console.error(err)
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData().catch(()=>{}) }, [page, pageSize])

  async function onUpdateStatus(id: number | string, status: string) {
    if (!token) return
    try {
      await updateOrder(id, { status }, token)
      await fetchData()
    } catch (err) {
      console.error(err)
      alert((err as Error).message || 'Lỗi cập nhật trạng thái')
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="app-container" style={{ paddingTop: 8 }}>
        <h1>Admin Dashboard</h1>
        <div className="card" style={{ marginTop: 12 }}>Bạn cần đăng nhập bằng tài khoản admin.</div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ paddingTop: 8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <h1 style={{ margin: 0, flex:1 }}>Admin Dashboard</h1>
        <Link to="/admin/create" className="btn">+ Tạo đơn</Link>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <form onSubmit={fetchData} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="input" placeholder="Tìm mã đơn / khách / địa chỉ / trạng thái" value={q} onChange={e => setQ(e.target.value)} />
          <select className="input" value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {['pending','processing','in_transit','delivered','cancelled'].map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input" type="date" value={from} onChange={e=>{ setFrom(e.target.value); setPage(1) }} />
          <input className="input" type="date" value={to} onChange={e=>{ setTo(e.target.value); setPage(1) }} />
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Đang tìm...' : 'Lọc/Tìm'}</button>
          <div style={{ marginLeft: 'auto', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color: 'var(--muted)' }}>Trang:</span>
            <button className="btn" type="button" disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
            <span>{page}/{totalPages}</span>
            <button className="btn" type="button" disabled={page>=totalPages || loading} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button>
            <select className="input" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value)); setPage(1)}}>
              {[10,20,50].map(n=> <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </div>
        </form>

        <div style={{ marginTop: 12, overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding:'8px 6px' }}>ID</th>
                <th style={{ padding:'8px 6px' }}>Khách hàng</th>
                <th style={{ padding:'8px 6px' }}>Địa chỉ</th>
                <th style={{ padding:'8px 6px' }}>Trạng thái</th>
                <th style={{ padding:'8px 6px' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding:'8px 6px' }}>{o.id}</td>
                  <td style={{ padding:'8px 6px' }}>{o.customer}</td>
                  <td style={{ padding:'8px 6px' }}>{o.address}</td>
                  <td style={{ padding:'8px 6px' }}>{o.status}</td>
                  <td style={{ padding:'8px 6px' }}>
                    <select className="input" value={o.status} onChange={e=>onUpdateStatus(o.id, e.target.value)}>
                      {['pending','processing','in_transit','delivered','cancelled'].map(s=> (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td colSpan={5} style={{ padding:12, color:'var(--muted)' }}>{loading ? 'Đang tải...' : 'Không có dữ liệu.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

