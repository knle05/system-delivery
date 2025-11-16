import { useMemo, useState } from 'react'
import AddressCascader, { type CascaderValue } from '../components/AddressCascader'
import { useAuth } from '../context/AuthContext'
import { createShipment, ghnAvailableServices, ghnFee } from '../services/api'

type ProdItem = { name: string; weightKg: number; qty: number; value: string }

function digitsOnly(s: string) { return s.replace(/\D/g, '') }
function parseVND(s: string) { const d = digitsOnly(s); return d ? Number(d) : 0 }
function fmtVND(s: string) { return parseVND(s).toLocaleString('vi-VN') }
function normalizePhone(p: string) {
  const d = p.replace(/\D/g, '')
  if (d.startsWith('84')) return '0' + d.slice(2)
  return d
}
function isValidVNPhone(p: string) {
  const d = normalizePhone(p)
  return /^0\d{9}$/.test(d)
}

export default function CreateShipment() {
  const { token, user } = useAuth()

  const [shipMerchant, setShipMerchant] = useState('M0001')
  const [shipOrderCode, setShipOrderCode] = useState('')
  const [shipRefCode, setShipRefCode] = useState('')
  const [shipService, setShipService] = useState('STANDARD')
  const [shipCOD, setShipCOD] = useState<string>('')

  const [sName, setSName] = useState('')
  const [sPhone, setSPhone] = useState('')
  const [sPhoneErr, setSPhoneErr] = useState<string | null>(null)
  const [sAddr, setSAddr] = useState('')
  const [sDistrict, setSDistrict] = useState('')
  const [sProvince, setSProvince] = useState('')
  const [sAddrPick, setSAddrPick] = useState<CascaderValue>({})

  const [rName, setRName] = useState('')
  const [rPhone, setRPhone] = useState('')
  const [rPhoneErr, setRPhoneErr] = useState<string | null>(null)
  const [rAddr, setRAddr] = useState('')
  const [rDistrict, setRDistrict] = useState('')
  const [rProvince, setRProvince] = useState('')
  const [rAddrPick, setRAddrPick] = useState<CascaderValue>({})

  const [items, setItems] = useState<ProdItem[]>([{ name: '', weightKg: 0, qty: 1, value: '' }])
  const totalWeightKg = useMemo(() => items.reduce((t, it) => t + (Number(it.weightKg)||0)*(Number(it.qty)||0), 0), [items])
  const totalValue = useMemo(() => items.reduce((t, it) => t + parseVND(it.value), 0), [items])

  // Ước tính phí giao hàng (GHN)
  const [svcList, setSvcList] = useState<any[]>([])
  const [svcId, setSvcId] = useState<number | ''>('')
  const [fee, setFee] = useState<any | null>(null)
  const [feeErr, setFeeErr] = useState<string | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)

  async function loadGhnServices() {
    if (!sAddrPick.districtId || !rAddrPick.districtId) throw new Error('Chọn đủ Quận/Huyện nơi gửi và nơi nhận')
    const r = await ghnAvailableServices({ from_district: Number(sAddrPick.districtId), to_district: Number(rAddrPick.districtId) })
    if (r && typeof r.code === 'number' && r.code !== 200) throw new Error(r.message || 'Lỗi tải gói dịch vụ')
    const items = r?.data || r || []
    setSvcList(items)
    setSvcId(items[0]?.service_id ?? '')
    return items
  }

  async function calcFee() {
    try {
      setFeeLoading(true); setFeeErr(null); setFee(null)
      if (!rAddrPick.wardCode || !sAddrPick.districtId || !rAddrPick.districtId) throw new Error('Chọn đầy đủ địa chỉ (đến Phường/Xã)')
      const billableG = Math.max(1, Math.round(totalWeightKg * 1000))
      let candidates: number[] = []
      if (svcId) {
        candidates = [Number(svcId)]
      } else {
        const items = await loadGhnServices()
        candidates = (items||[]).map((x:any)=> Number(x.service_id)).filter(Boolean)
      }
      if (!candidates.length) throw new Error('Không có gói dịch vụ khả dụng')
      let lastErr: any = null
      for (const sid of candidates) {
        const payload = {
          service_id: Number(sid),
          insurance_value: Number(totalValue) || 0,
          coupon: null,
          from_district_id: Number(sAddrPick.districtId),
          ...(sAddrPick.wardCode ? { from_ward_code: String(sAddrPick.wardCode) } : {}),
          to_district_id: Number(rAddrPick.districtId),
          to_ward_code: String(rAddrPick.wardCode),
          height: 10, length: 10, width: 10,
          weight: billableG,
        }
        try {
          const r = await ghnFee(payload)
          if (r && typeof r.code === 'number' && r.code !== 200) throw new Error(r.message || 'Lỗi tính phí')
          const data = r?.data ?? r
          if (!data || (typeof data.total === 'undefined' && typeof data.service_fee === 'undefined')) throw new Error('GHN trả dữ liệu không hợp lệ')
          setServiceIdFromGhn(Number(sid))
          setFee(data)
          lastErr = null
          break
        } catch (e:any) { lastErr = e }
      }
      if (lastErr) throw lastErr
    } catch (e:any) {
      setFeeErr(e?.message || 'Không tính được phí giao hàng')
    } finally { setFeeLoading(false) }
  }

  function setServiceIdFromGhn(sid: number) {
    setSvcId(sid)
    // Map GHN service_id -> service_type để gửi về backend
    setShipService(`GHN_${sid}`)
  }

  // Popover kết quả tạo đơn
  const [created, setCreated] = useState<{ waybill: string; orderCode: string } | null>(null)
  function resetForm() {
    setShipOrderCode(''); setShipRefCode('')
    setRName(''); setRPhone(''); setRPhoneErr(null); setRAddr(''); setRDistrict(''); setRProvince('TP.HCM'); setRAddrPick({})
    setSName(''); setSPhone(''); setSPhoneErr(null); setSAddr(''); setSDistrict(''); setSProvince('TP.HCM'); setSAddrPick({})
    setItems([{ name:'', weightKg:0, qty:1, value:'' }]); setShipCOD('')
    setFee(null); setFeeErr(null); setSvcList([]); setSvcId(''); setShipService('STANDARD')
  }

  function updateItem(idx: number, patch: Partial<ProdItem>) { setItems(arr => arr.map((it, i) => i === idx ? { ...it, ...patch } : it)) }
  function addItem() { setItems(arr => [...arr, { name: '', weightKg: 0, qty: 1, value: '' }]) }
  function removeItem(idx: number) { setItems(arr => arr.length<=1 ? arr : arr.filter((_,i)=>i!==idx)) }
  function onItemKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) { if (e.key === 'Enter') { e.preventDefault(); if (idx === items.length - 1) addItem() } }

  function validatePhonesInline() {
    const sOk = !!sPhone.trim() && isValidVNPhone(sPhone)
    const rOk = !!rPhone.trim() && isValidVNPhone(rPhone)
    setSPhoneErr(sOk ? null : 'Số điện thoại người gửi không hợp lệ')
    setRPhoneErr(rOk ? null : 'Số điện thoại người nhận không hợp lệ')
    return sOk && rOk
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) { alert('Cần đăng nhập admin'); return }
    if (!sAddr.trim() || !rAddr.trim()) { alert('Địa chỉ người gửi và người nhận là bắt buộc'); return }
    if (!rName.trim()) { alert('Tên người nhận là bắt buộc'); return }
    if (!validatePhonesInline()) return
    try {
      const res = await createShipment({
        merchant_code: shipMerchant || undefined,
        order_code: shipOrderCode.trim() || undefined,
        ref_code: shipRefCode.trim() || undefined,
        sender: { full_name: sName || undefined, phone: normalizePhone(sPhone) || undefined, address: sAddr.trim(), district: sDistrict || undefined, province: sProvince || undefined },
        receiver: { full_name: rName || undefined, phone: normalizePhone(rPhone) || undefined, address: rAddr.trim(), district: rDistrict || undefined, province: rProvince || undefined },
        service_type: shipService,
        cod_amount: parseVND(shipCOD) || 0,
        items: items.map(p => ({ name: p.name || undefined, weight_g: p.weightKg ? Math.round(Number(p.weightKg)*1000) : undefined, value: parseVND(p.value) || undefined })),
      }, token)
      setCreated({ waybill: String(res.waybill_number||''), orderCode: String(res.order_code||'') })
    } catch (err) {
      console.error(err)
      alert((err as Error).message || 'Lỗi tạo vận đơn')
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="app-container" style={{ paddingTop: 8 }}>
        <div className="card">Bạn cần đăng nhập admin để tạo vận đơn.</div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ paddingTop: 8 }}>
      <h1>Tạo đơn hàng</h1>
      <div className="card" style={{ marginTop: 12 }}>
        <form onSubmit={onSubmit}>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:320 }}>
              <div style={{ display:'grid', gap:8 }}>
                <div style={{ fontWeight:700 }}>Người nhận</div>
                <div>
                  <input className="input" placeholder="Số điện thoại" value={rPhone}
                    onChange={e=>{ setRPhone(e.target.value); if (rPhoneErr) validatePhonesInline() }}
                    onBlur={validatePhonesInline} required inputMode="tel" pattern="^(\+?84|0)\d{9}$" />
                  {rPhoneErr && <div style={{ color:'#ff7a7a', fontSize:12, marginTop:4 }}>{rPhoneErr}</div>}
                </div>
                <input className="input" placeholder="Tên người nhận" value={rName} onChange={e=>setRName(e.target.value)} required />
                <input className="input" placeholder="Địa chỉ chi tiết (Tòa nhà/Hẻm/Đường)" value={rAddr} onChange={e=>setRAddr(e.target.value)} required />
                <AddressCascader label="Địa chỉ người nhận (Tỉnh/Quận/Phường)" value={rAddrPick} onChange={(val)=>{ setRAddrPick(val); setRDistrict(val.districtName || ''); setRProvince(val.provinceName || '') }} requiredLevel="ward" showFullPath separator=" / " />

                <div style={{ height:8 }} />
                <div style={{ fontWeight:700 }}>Người gửi</div>
                <div>
                  <input className="input" placeholder="Số điện thoại" value={sPhone}
                    onChange={e=>{ setSPhone(e.target.value); if (sPhoneErr) validatePhonesInline() }}
                    onBlur={validatePhonesInline} required inputMode="tel" pattern="^(\+?84|0)\d{9}$" />
                  {sPhoneErr && <div style={{ color:'#ff7a7a', fontSize:12, marginTop:4 }}>{sPhoneErr}</div>}
                </div>
                <input className="input" placeholder="Tên người gửi" value={sName} onChange={e=>setSName(e.target.value)} />
                <input className="input" placeholder="Địa chỉ chi tiết" value={sAddr} onChange={e=>setSAddr(e.target.value)} required />
                <AddressCascader label="Địa chỉ người gửi (Tỉnh/Quận/Phường)" value={sAddrPick} onChange={(val)=>{ setSAddrPick(val); setSDistrict(val.districtName || ''); setSProvince(val.provinceName || '') }} requiredLevel="ward" showFullPath separator=" / " />

                <div style={{ height:8 }} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <select className="input" value={shipService} onChange={e=>setShipService(e.target.value)}>
                    {['STANDARD','EXPRESS'].map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input
                    className="input"
                    placeholder="COD (VND)"
                    type="text"
                    value={shipCOD}
                    onChange={e=> setShipCOD(digitsOnly(e.target.value))}
                    onBlur={e=> setShipCOD(fmtVND(e.target.value))}
                    onFocus={e=> setShipCOD(digitsOnly(e.target.value))}
                  />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <input className="input" placeholder="Mã merchant" value={shipMerchant} onChange={e=>setShipMerchant(e.target.value)} />
                  <input className="input" placeholder="Order code (không bắt buộc)" value={shipOrderCode} onChange={e=>setShipOrderCode(e.target.value)} />
                </div>
                <input className="input" placeholder="Ref code (không bắt buộc)" value={shipRefCode} onChange={e=>setShipRefCode(e.target.value)} />
              </div>
            </div>

            <div style={{ flex:1, minWidth:320 }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>Sản phẩm</div>
              <div className="prod-head">
                <div>Tên hàng</div>
                <div>KL (kg)</div>
                <div>Số lượng</div>
                <div>Giá trị (VND)</div>
                <div></div>
              </div>
              <div style={{ display:'grid', gap:8 }}>
                {items.map((p, idx) => (
                  <div key={idx} className="prod-table">
                    <input className="input" placeholder={`${idx+1}. Tên sản phẩm`} value={p.name} onChange={e=>updateItem(idx,{ name:e.target.value })} onKeyDown={e=>onItemKeyDown(e, idx)} />
                    <input className="input" placeholder="0.50" type="number" min={0} step={0.01} value={p.weightKg} onChange={e=>updateItem(idx,{ weightKg: Number(e.target.value) })} onKeyDown={e=>onItemKeyDown(e, idx)} />
                    <input className="input" placeholder="1" type="number" min={1} step={1} value={p.qty} onChange={e=>updateItem(idx,{ qty: Math.max(1, Number(e.target.value)||1) })} onKeyDown={e=>onItemKeyDown(e, idx)} />
                    <input
                      className="input"
                      placeholder="150000"
                      type="text"
                      value={p.value}
                      onChange={e=>updateItem(idx,{ value: digitsOnly(e.target.value) })}
                      onBlur={e=>updateItem(idx,{ value: fmtVND(e.target.value) })}
                      onFocus={e=>updateItem(idx,{ value: digitsOnly(e.target.value) })}
                      onKeyDown={e=>onItemKeyDown(e, idx)}
                    />
                    <button type="button" className="btn" onClick={()=>removeItem(idx)}>Xóa</button>
                  </div>
                ))}
                <div className="prod-actions"><button type="button" className="btn" onClick={addItem}>+ Thêm sản phẩm</button></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div className="card" style={{ padding:12 }}>
                    <div style={{ color:'var(--muted)' }}>Tổng khối lượng: </div>
                    <div style={{ fontWeight:700 }}>{totalWeightKg.toFixed(2)} kg</div>
                  </div>
                  <div className="card" style={{ padding:12 }}>
                    <div style={{ color:'var(--muted)' }}>Giá trị hàng:</div>
                    <div style={{ fontWeight:700 }}>{totalValue.toLocaleString('vi-VN')} ₫</div>
                  </div>
                </div>

                {/* Ước tính phí giao hàng */}
                <div className="card" style={{ padding:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontWeight:700 }}>Ước tính phí giao hàng</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <select className="input" value={svcId} onChange={e=>{ const v=e.target.value; if(v) setServiceIdFromGhn(Number(v)); else setSvcId('') }} style={{ minWidth:160 }}>
                        <option value="">Tự chọn dịch vụ</option>
                        {svcList.map((s:any)=> (
                          <option key={s.service_id} value={s.service_id}>{s.short_name || s.service_type || s.service_id}</option>
                        ))}
                      </select>
                      <button type="button" className="btn" onClick={async()=>{ if(!svcList.length) await loadGhnServices(); calcFee() }} disabled={feeLoading || !totalWeightKg || !rAddrPick.wardCode || !sAddrPick.districtId || !rAddrPick.districtId}>
                        {feeLoading ? 'Đang tính...' : 'Tính phí'}
                      </button>
                    </div>
                  </div>
                  {feeErr && <div style={{ color:'#ff7a7a', fontWeight:700 }}>{feeErr}</div>}
                  {fee && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      <div><div className="muted-small">Tổng</div><div style={{ fontWeight:800, color:'var(--accent)' }}>{Number(fee.total||0).toLocaleString('vi-VN')} VND</div></div>
                      <div><div className="muted-small">Cước dịch vụ</div><div style={{ fontWeight:700 }}>{Number(fee.service_fee||0).toLocaleString('vi-VN')} VND</div></div>
                      <div><div className="muted-small">Bảo hiểm</div><div style={{ fontWeight:700 }}>{Number(fee.insurance_fee||0).toLocaleString('vi-VN')} VND</div></div>
                      <div><div className="muted-small">Khác</div><div style={{ fontWeight:700 }}>{Number(fee.pick_station_fee||0).toLocaleString('vi-VN')} VND</div></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
            <button type="button" className="btn" style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.12)' }}>Lưu nháp</button>
            <button className="btn" type="submit">Tạo đơn</button>
          </div>
        </form>
      </div>

      {/* Popover hiển thị mã sau khi tạo đơn */}
      {created && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="card" style={{ maxWidth:460, width:'90%', padding:16 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Tạo vận đơn thành công</div>
            <div style={{ display:'grid', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div>
                  <div className="muted-small">Waybill</div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{created.waybill || '—'}</div>
                </div>
                <button className="btn" type="button" onClick={()=>navigator.clipboard?.writeText(created.waybill||'')}>Copy</button>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div>
                  <div className="muted-small">Order code</div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{created.orderCode || '—'}</div>
                </div>
                <button className="btn" type="button" onClick={()=>navigator.clipboard?.writeText(created.orderCode||'')}>Copy</button>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
              <button className="btn" type="button" onClick={()=>{ navigator.clipboard?.writeText(`Waybill: ${created.waybill}\nOrder: ${created.orderCode}`) }}>Copy tất cả</button>
              <button className="btn" type="button" onClick={()=>{ setCreated(null); resetForm() }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

