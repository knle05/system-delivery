import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Array<any>>([])

  function onSearch(e?: React.FormEvent) {
    e?.preventDefault()
    // placeholder: gọi API admin để tìm/ quản lý đơn
    setResults([{ id: 'A001', status: 'Đang giao', customer: 'KH A' }])
  }

  useEffect(() => { onSearch() }, [])

  return (
    <div className="app-container" style={{ paddingTop: 8 }}>
      <h1>Admin Dashboard</h1>
      <div className="card" style={{ marginTop: 12 }}>
        <form onSubmit={(e) => onSearch(e)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" placeholder="Tìm mã đơn / khách" value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn" type="submit">Tìm</button>
        </form>

        <div style={{ marginTop: 12 }}>
          {results.map(r => (
            <div key={r.id} style={{ marginBottom: 8 }}>
              <strong>{r.id}</strong> — {r.status} — {r.customer}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}