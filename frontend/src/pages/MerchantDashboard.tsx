import { useEffect, useMemo, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { listWaybills, addWaybillEvent, listHubs, type WaybillItem, type Hub } from "../services/api"
import { deleteLastWaybillEvent } from "../services/admin"

export default function MerchantDashboard() {
  const { token, user } = useAuth()
  const [q, setQ] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [from, setFrom] = useState("") // YYYY-MM-DD
  const [to, setTo] = useState("")     // YYYY-MM-DD
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const [items, setItems] = useState<Array<WaybillItem>>([])
  const [loading, setLoading] = useState(false)

  // Form: ghi sự kiện cho Waybill
  const [adding, setAdding] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const [evWB, setEvWB] = useState("")
  const [evCode, setEvCode] = useState("CREATED")
  const [evDesc, setEvDesc] = useState("")
  const [hubs, setHubs] = useState<Hub[]>([])
  const [hubId, setHubId] = useState<number | "">("")
  const [canUseCreated, setCanUseCreated] = useState(true)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  async function fetchData(e?: React.FormEvent) {
    e?.preventDefault()
    if (!token) return
    setLoading(true)
    try {
      const res = await listWaybills({ q, page, pageSize, status: filterStatus || undefined, from: from || undefined, to: to || undefined }, token)
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

  useEffect(() => { if (token) fetchData().catch(() => {}) }, [token, page, pageSize])

  // Khi nhập Waybill, nếu đã tồn tại trong hệ thống thì không cho chọn CREATED
  useEffect(() => {
    let cancelled = false
    async function checkWB() {
      if (!token) return
      const wb = evWB.trim()
      if (!wb) { if (!cancelled) setCanUseCreated(true); return }
      try {
        const res = await listWaybills({ q: wb, page: 1, pageSize: 1 }, token)
        const exists = Array.isArray(res.items) && res.items.some(it => String(it.id) === wb)
        if (!cancelled) setCanUseCreated(!exists)
        if (!cancelled && exists && evCode === 'CREATED') setEvCode('PICKED_UP')
      } catch {
        if (!cancelled) setCanUseCreated(true)
      }
    }
    checkWB()
    return () => { cancelled = true }
  }, [evWB, token])

  // Tải danh sách hub khi cần (ARRIVED_HUB)
  useEffect(() => {
    async function load() {
      if (!token) return
      try { const data = await listHubs(token); setHubs(data || []) } catch {}
    }
    if (evCode === 'ARRIVED_HUB' && hubs.length === 0) load()
  }, [evCode, token])

  if (!user || (user.role !== "admin" && user.role !== "merchant")) {
    return (
      <div className="app-container" style={{ paddingTop: 8 }}>
        <h1>MERCHANT DASHBOARD</h1>
        <div className="card" style={{ marginTop: 12 }}>Bạn cần đăng nhập bằng tài khoản Quản trị hoặc Đối tác.</div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 style={{ margin: 0, flex: 1 }}>MERCHANT DASHBOARD</h1>
      </div>

      {/* Ghi sự kiện cho Waybill */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto auto", gap: 8, alignItems: "center" }}>
          <input className="input" placeholder="Waybill (VD: WB-000001)" value={evWB} onChange={e => setEvWB(e.target.value)} />
          <select className="input" value={evCode} onChange={e => setEvCode(e.target.value)}>
            {["CREATED","PICKED_UP","ARRIVED_HUB","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","FAILED","RETURNING","RETURNED","CANCELLED"].map(s => (
              <option key={s} value={s} disabled={s === 'CREATED' && !canUseCreated}>{s}</option>
            ))}
          </select>
          {evCode === 'ARRIVED_HUB' ? (
            <select className="input" value={hubId} onChange={e => setHubId(Number(e.target.value) || "") }>
              <option value="">Chọn trung tâm (hub)</option>
              {hubs.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          ) : (
            <input className="input" placeholder="Mô tả (tùy chọn)" value={evDesc} onChange={e => setEvDesc(e.target.value)} />
          )}
          <button className="btn" type="button" disabled={adding || !evWB.trim() || (evCode === 'ARRIVED_HUB' && !hubId)} onClick={async () => {
            if (!token) return; setAdding(true)
            try {
              await addWaybillEvent(evWB.trim(), (() => { const payload: any = { mapped_code: evCode }; if (evCode === "ARRIVED_HUB") { if (hubId) payload.hub_id = hubId } else { if (evDesc) payload.description = evDesc } return payload })(), token)
              setEvDesc("")
              if (evCode === 'ARRIVED_HUB') setHubId("")
              await fetchData()
            } catch (e) {
              alert((e as Error).message || "Ghi sự kiện thất bại")
            } finally { setAdding(false) }
          }}>{adding ? "Đang ghi..." : "Ghi sự kiện"}</button>
          <button className="btn" type="button" disabled={undoing || !evWB.trim()} onClick={async () => {
            if (!token) return; setUndoing(true)
            try {
              await deleteLastWaybillEvent(evWB.trim(), token)
              await fetchData()
            } catch (e) {
              alert((e as Error).message || "Hoàn tác thất bại")
            } finally { setUndoing(false) }
          }}>{undoing ? "Đang hoàn tác..." : "Hoàn tác sự kiện gần nhất"}</button>
        </div>
      </div>

      {/* Bộ lọc + bảng Waybills */}
      <div className="card" style={{ marginTop: 12 }}>
        <form onSubmit={fetchData} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input className="input" placeholder="Tìm mã đơn/khách/địa chỉ/trạng thái" value={q} onChange={e => setQ(e.target.value)} />
          <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {[
              { code: 'CREATED', label: 'Đã tạo' },
              { code: 'PICKED_UP', label: 'Đã lấy hàng' },
              { code: 'ARRIVED_HUB', label: 'Đến kho/trạm' },
              { code: 'IN_TRANSIT', label: 'Đang trung chuyển' },
              { code: 'OUT_FOR_DELIVERY', label: 'Đang giao' },
              { code: 'DELIVERED', label: 'Đã giao' },
              { code: 'FAILED', label: 'Giao thất bại' },
              { code: 'RETURNING', label: 'Đang chuyển hoàn' },
              { code: 'RETURNED', label: 'Đã hoàn' },
              { code: 'CANCELLED', label: 'Đã hủy' },
            ].map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
          <input className="input" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} />
          <input className="input" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} />
          <button className="btn" type="submit" disabled={loading}>{loading ? "Đang tìm..." : "Lọc/Tìm"}</button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--muted)" }}>Trang:</span>
            <button className="btn" type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>{"<"}</button>
            <span>{page}/{totalPages}</span>
            <button className="btn" type="button" disabled={page >= totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{">"}</button>
            <select className="input" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>
              {[10,20,50].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </div>
        </form>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={{ padding: "8px 6px" }}>Waybill</th>
                <th style={{ padding: "8px 6px" }}>Order code</th>
                <th style={{ padding: "8px 6px" }}>Đối tác</th>
                <th style={{ padding: "8px 6px" }}>Địa chỉ</th>
                <th style={{ padding: "8px 6px" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {items.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "8px 6px" }}>{o.id}</td>
                  <td style={{ padding: "8px 6px" }}>{(o as any).order_code || '-'}</td>
                  <td style={{ padding: "8px 6px" }}>{o.customer}</td>
                  <td style={{ padding: "8px 6px" }}>{o.address}</td>
                  <td style={{ padding: "8px 6px" }}>{o.status}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 12, color: "var(--muted)" }}>{loading ? "Đang tải..." : "Không có dữ liệu."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

