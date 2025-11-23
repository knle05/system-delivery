import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import * as usersApi from '../services/users'
import { listHubs, type Hub } from '../services/api'

type UserRow = { id: number; email: string; name?: string | null; role: 'admin' | 'customer' | 'merchant'; merchant_code?: string | null }

export default function AdminUsers() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'hubs' | 'services'>('users')

  // Users state
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [savedAt, setSavedAt] = useState<number>(0)
  const [filterRole, setFilterRole] = useState<'' | 'admin' | 'customer' | 'merchant'>('')

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const list = await usersApi.listUsers(token || undefined)
      setRows(list as any)
    } catch (e: any) {
      setError(e?.message || 'Không tải được danh sách người dùng')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (activeTab === 'users') loadUsers() }, [activeTab])

  const displayedRows = useMemo(() => {
    const filtered = !filterRole ? rows : rows.filter(r => r.role === filterRole)
    return [...filtered].sort((a, b) => a.id - b.id)
  }, [rows, filterRole])

  async function changeRole(id: number, nextRole: 'customer' | 'merchant') {
    setSavingId(id)
    try {
      const res = await usersApi.updateUserRole(id, nextRole, token || undefined)
      if (res?.user) setRows(prev => prev.map(r => r.id === id ? { ...r, role: (res.user as any).role } : r))
      else setRows(prev => prev.map(r => r.id === id ? { ...r, role: nextRole } : r))
      setSavedAt(Date.now())
    } catch (e: any) { alert(e?.message || 'Cập nhật vai trò thất bại') }
    finally { setSavingId(null) }
  }

  // Hubs state
  const [hubs, setHubs] = useState<Hub[]>([])
  const [hubErr, setHubErr] = useState<string | null>(null)
  const [hubLoading, setHubLoading] = useState(false)
  const [hubQuery, setHubQuery] = useState('')
  async function loadHubs() {
    setHubLoading(true); setHubErr(null)
    try {
      const list = await listHubs(token || undefined)
      setHubs(list || [])
    } catch (e: any) { setHubErr(e?.message || 'Không tải được danh sách hub') }
    finally { setHubLoading(false) }
  }
  useEffect(() => { if (activeTab === 'hubs' && token) loadHubs() }, [activeTab, token])
  const filteredHubs = useMemo(() => {
    const q = hubQuery.trim().toLowerCase()
    if (!q) return hubs
    return hubs.filter(h => String(h.id).includes(q) || (h.name||'').toLowerCase().includes(q))
  }, [hubs, hubQuery])

  return (
    <div className="app-container">
      <div className="card">
        <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:18, flexWrap:'wrap' }}>
          <h2 style={{ margin: 18 }}>QUẢN LÝ</h2>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn" onClick={() => setActiveTab('users')} style={{ opacity: activeTab==='users'?1:0.6 }}>Người dùng</button>
            <button className="btn" onClick={() => setActiveTab('hubs')} style={{ opacity: activeTab==='hubs'?1:0.6 }}>Hub</button>
            <button className="btn" onClick={() => setActiveTab('services')} style={{ opacity: activeTab==='services'?1:0.6 }}>Dịch vụ giao hàng</button>
          </div>
        </div>

        <div className="card-body" style={{margin:18, overflowX:'auto' }}>
          {activeTab === 'users' && (<div className="tab-panel">
            <>
              {loading ? (
                <div>Đang tải...</div>
              ) : error ? (
                <div style={{ color:'#ff7a7a' }}>Lỗi: {error}</div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
                    <select className="input" value={filterRole} onChange={e=>setFilterRole(e.target.value as any)} title="Lọc vai trò">
                      <option value="">Tất cả vai trò</option>
                      <option value="admin">Quản trị</option>
                      <option value="merchant">Đối tác</option>
                      <option value="customer">Khách hàng</option>
                    </select>
                    {savedAt>0 && <span style={{ color:'var(--muted)' }}>Đã lưu</span>}
                    <button className="btn" onClick={loadUsers}>Làm mới</button>
                  </div>
                  <table className="table" style={{display:'table', width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left' }}>ID</th>
                        <th style={{ textAlign:'left' }}>Email</th>
                        <th style={{ textAlign:'left' }}>Họ tên</th>
                        <th style={{ textAlign:'left' }}>Vai trò</th>
                        <th style={{ textAlign:'left' }}>Mã đối tác</th>
                        <th style={{ textAlign:'left' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRows.map(r => (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{r.email}</td>
                          <td>{r.name || '-'}</td>
                          <td><span className={`badge role-${r.role}`}>{r.role==='admin'?'Quản trị': r.role==='merchant'?'Đối tác':'Khách hàng'}</span></td>
                          <td>{r.merchant_code || '-'}</td>
                          <td>
                            {r.role==='admin' ? <em>Admin</em> : (
                              <select value={r.role} onChange={e=>changeRole(r.id, e.target.value as 'customer'|'merchant')} disabled={savingId===r.id || user?.email===r.email} style={{ padding:'6px 8px' }}>
                                <option value="customer">Khách hàng</option>
                                <option value="merchant">Đối tác</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          </div>)}

          {activeTab === 'hubs' && (<div className="tab-panel">
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <h3 style={{ display:'flex',margin:18 }}>DANH SÁCH</h3>
                  <span className="chip secondary">{filteredHubs.length} hub</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input className="input" placeholder="Tìm theo ID/Tên hub" value={hubQuery} onChange={e=>setHubQuery(e.target.value)} style={{ minWidth:220 }} />
                  <button className="btn" onClick={loadHubs} disabled={hubLoading}>{hubLoading?'Đang tải...':'Làm mới'}</button>
                </div>
              </div>
              {hubErr && <div style={{ color:'#ff7a7a', marginBottom:8 }}>{hubErr}</div>}
              <div className="grid-cards">
                {filteredHubs.map(h => (
                  <div key={h.id} className="card" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div className="mini-title">{h.name}</div>
                      <span className="chip"><span className="dot" />ID: {h.id}</span>
                    </div>
                    <div className="muted">Hub vận hành</div>
                  </div>
                ))}
                {filteredHubs.length===0 && !hubLoading && (
                  <div className="card" style={{ color:'var(--muted)' }}>Không có hub phù hợp.</div>
                )}
              </div>
            </>
          </div>)}

          {activeTab === 'services' && (<div className="tab-panel">
            <>
              <h3 style={{display:'flex', margin:18 }}>DỊCH VỤ</h3>
              <div style={{ color:'var(--muted)',margin:18, marginBottom:45 }}>Hệ thống hỗ trợ dịch vụ nội bộ và đối tác. GHN có dạng <code>GHN_{'{' }service_id{'}'}</code> (tự sinh khi tính phí).</div>
              <div className="grid-cards">
                <div className="card">
                  <div className="mini-title">STANDARD</div>
                  <div className="muted">Giao tiêu chuẩn — chi phí tối ưu.</div>
                </div>
                <div className="card">
                  <div className="mini-title">EXPRESS</div>
                  <div className="muted">Giao nhanh — ưu tiên thời gian.</div>
                </div>
                <div className="card">
                  <div className="mini-title">GHN_xxx</div>
                  <div className="muted">Map theo <code>service_id</code> từ GHN (ví dụ: GHN_53321).</div>
                </div>
              </div>
            </>
          </div>)}
        </div>
      </div>
    </div>
  )
}
