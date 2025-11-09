import { useState, useEffect } from 'react'
import { ghnAvailableServices, ghnFee } from '../services/api'
import AddressCascader from '../components/AddressCascader'
import type { CascaderValue } from '../components/AddressCascader'

export default function Estimate() {
  // Address selections
  const [fromAddr, setFromAddr] = useState<CascaderValue>({})
  const [toAddr, setToAddr] = useState<CascaderValue>({})
  const [fromDetail, setFromDetail] = useState('')
  const [toDetail, setToDetail] = useState('')

  // Parcel params
  const [weightKg, setWeightKg] = useState(1)
  const [dims, setDims] = useState({ length: 15, width: 15, height: 15 })
  const [approxWeight, setApproxWeight] = useState(false)
  const [cod, setCod] = useState('')
  const [value, setValue] = useState('')

  // Services + result
  const [services, setServices] = useState<any[]>([])
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [ghnEst, setGhnEst] = useState<any | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Tự tải gói dịch vụ khi đã chọn đủ quận/huyện 2 bên
  // và reset kết quả cũ khi thay đổi địa chỉ
  useEffect(() => {
    setGhnEst(null)
    if (fromAddr.districtId && toAddr.districtId) {
      loadServices().catch((e:any)=> setErr(e?.message || 'Không tải được gói dịch vụ'))
    } else {
      setServices([]); setServiceId('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAddr.districtId, toAddr.districtId])

  async function loadServices() {
    setErr(null)
    if (!fromAddr.districtId || !toAddr.districtId) throw new Error('Chọn đủ Quận/Huyện nơi gửi và nơi nhận')
    const r = await ghnAvailableServices({ from_district: Number(fromAddr.districtId), to_district: Number(toAddr.districtId) })
    if (r && typeof r.code === 'number' && r.code !== 200) throw new Error(r.message || 'GHN services lỗi')
    const items = r?.data || r || []
    setServices(items)
    if (!Array.isArray(items) || items.length === 0) throw new Error('Không có gói dịch vụ khả dụng. Kiểm tra GHN_SHOP_ID và Quận/Huyện.')
    setServiceId(items[0]?.service_id ?? '')
    return items
  }

  async function calcGhn() {
    try {
      setLoading(true); setErr(null); setGhnEst(null)
      if (!toAddr.wardCode || !fromAddr.districtId || !toAddr.districtId) throw new Error('Chọn đầy đủ địa chỉ (đến Phường/Xã)')
      // Cân nặng quy đổi (kg) = (Dài x Rộng x Cao) / 5000
      if (approxWeight && (!(Number(dims.length)) || !(Number(dims.width)) || !(Number(dims.height)))) {
        throw new Error('Nhập đủ kích thước khi bật “Không biết cân nặng”.')
      }
      const realG = approxWeight ? 0 : Math.max(1, Math.round((Number(weightKg) || 0) * 1000))
      const volKg = (Number(dims.length)||0) * (Number(dims.width)||0) * (Number(dims.height)||0) / 5000
      const volG = Math.max(1, Math.round(volKg * 1000))
      const billableG = approxWeight ? volG : Math.max(realG, volG)

      // Thử nhiều gói dịch vụ nếu cần
      let candidates: number[] = []
      if (serviceId) {
        candidates = [Number(serviceId)]
      } else {
        const items = await loadServices()
        candidates = (items||[]).map((x:any)=> Number(x.service_id)).filter(Boolean)
      }
      if (!candidates.length) throw new Error('Không có gói dịch vụ khả dụng')

      let lastErr: any = null
      for (const sid of candidates) {
        const payload = {
          service_id: Number(sid),
          insurance_value: Number(value) || 0,
          coupon: null,
          from_district_id: Number(fromAddr.districtId),
          ...(fromAddr.wardCode ? { from_ward_code: String(fromAddr.wardCode) } : {}),
          to_district_id: Number(toAddr.districtId),
          to_ward_code: String(toAddr.wardCode),
          height: Math.max(1, Number(dims.height) || 1),
          length: Math.max(1, Number(dims.length) || 1),
          width: Math.max(1, Number(dims.width) || 1),
          weight: billableG,
        }
        try {
          const r = await ghnFee(payload)
          if (r && typeof r.code === 'number' && r.code !== 200) throw new Error(r.message || 'GHN fee lỗi')
          const data = r?.data ?? r
          if (!data || (typeof data.total === 'undefined' && typeof data.service_fee === 'undefined')) throw new Error('GHN trả dữ liệu không hợp lệ')
          setServiceId(Number(sid))
          setGhnEst(data)
          lastErr = null
          break
        } catch (e:any) {
          lastErr = e
        }
      }
      if (lastErr) throw lastErr
    } catch (e: any) {
      setErr(e?.message || 'Không tính được phí GHN')
    } finally { setLoading(false) }
  }

  return (
    <div className="app-container">
      <h1 style={{ marginTop: 0 }}>Ước tính cước phí</h1>
      <div className="card">
        <form className="fee-form" onSubmit={e=>{ e.preventDefault(); calcGhn() }}>
          <div className="form-grid">
            {/* Left column */}
            <div className="col">
              <label className="field">Địa chỉ người gửi chi tiết
                <input className="input" placeholder="Vui lòng nhập thông tin" value={fromDetail} onChange={e=>setFromDetail(e.target.value)} />
              </label>
            </div>
            {/* Right column */}
            <div className="col">
              <label className="field">Địa chỉ người gửi
                <AddressCascader label="" value={fromAddr} onChange={setFromAddr} requiredLevel="ward" showFullPath separator=" / " closeOnOutside={false} />
              </label>
            </div>

            <div className="col">
              <label className="field">Địa chỉ người nhận chi tiết
                <input className="input" placeholder="Vui lòng nhập thông tin" value={toDetail} onChange={e=>setToDetail(e.target.value)} />
              </label>
            </div>
            <div className="col">
              <label className="field">Địa chỉ người nhận
                <AddressCascader label="" value={toAddr} onChange={setToAddr} requiredLevel="ward" showFullPath separator=" / " closeOnOutside={false} />
              </label>
            </div>

            <div className="col">
              <label className="field">Tổng khối lượng
                <div className="input-unit">
                  <input className="input" type="number" min={0.1} step={0.1} value={weightKg} onChange={e=>setWeightKg(Number(e.target.value))} disabled={approxWeight} placeholder={approxWeight ? 'Dùng cân nặng quy đổi' : ''} />
                  <span className="unit">KG</span>
                </div>
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                <input type="checkbox" checked={approxWeight} onChange={e=>setApproxWeight(e.target.checked)} />
                <span className="muted-small">Tôi không biết cân nặng chính xác của bưu gửi</span>
              </label>
              {approxWeight && (
                <div className="muted-small">Hệ thống sẽ dùng cân nặng quy đổi theo kích thước: (D×R×C)/5000.</div>
              )}
            </div>
            <div className="col dims">
              <label className="field">Kích thước đơn hàng</label>
              <div className="grid4">
                <div className="input-unit"><input className="input" type="number" value={dims.length} onChange={e=>setDims(v=>({ ...v, length: Number(e.target.value) }))} /><span className="unit">CM</span></div>
                <div className="input-unit"><input className="input" type="number" value={dims.width} onChange={e=>setDims(v=>({ ...v, width: Number(e.target.value) }))} /><span className="unit">CM</span></div>
                <div className="input-unit"><input className="input" type="number" value={dims.height} onChange={e=>setDims(v=>({ ...v, height: Number(e.target.value) }))} /><span className="unit">CM</span></div>
                <div />
              </div>
            </div>

            {/* Bỏ chọn gói dịch vụ thủ công — hệ thống tự chọn theo thông số */}
            <div className="col actions actions-right">
              <button className="btn" type="submit" disabled={loading || !toAddr.wardCode || !fromAddr.districtId || !toAddr.districtId}>
                {loading ? 'Đang tính...' : 'Tính Phí Giao Hàng'}
              </button>
            </div>
          </div>
        </form>
        {err && <div style={{ color:'#ff7a7a', fontWeight:700, marginTop:8 }}>{err}</div>}
      </div>

      {ghnEst && (typeof ghnEst.total !== 'undefined' || typeof ghnEst.service_fee !== 'undefined') && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight:700, marginBottom:8 }}>Kết quả GHN</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <div><div className="muted-small">Tổng</div><div style={{ fontWeight:800, color:'var(--accent)' }}>{Number(ghnEst.total||0).toLocaleString('vi-VN')} VND</div></div>
            <div><div className="muted-small">Cước dịch vụ</div><div style={{ fontWeight:700 }}>{Number(ghnEst.service_fee||0).toLocaleString('vi-VN')} VND</div></div>
            <div><div className="muted-small">Bảo hiểm</div><div style={{ fontWeight:700 }}>{Number(ghnEst.insurance_fee||0).toLocaleString('vi-VN')} VND</div></div>
            <div><div className="muted-small">Khác</div><div style={{ fontWeight:700 }}>{Number(ghnEst.pick_station_fee||0).toLocaleString('vi-VN')} VND</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
