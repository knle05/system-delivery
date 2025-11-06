import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { createShipment } from '../services/api'

type ProdItem = { name: string; weightKg: number; qty: number; value: number }

export default function CreateShipment() {
  const { token, user } = useAuth()

  const [shipMerchant, setShipMerchant] = useState('M0001')
  const [shipOrderCode, setShipOrderCode] = useState('')
  const [shipRefCode, setShipRefCode] = useState('')
  const [shipService, setShipService] = useState('STANDARD')
  const [shipCOD, setShipCOD] = useState<number>(0)

  const [sName, setSName] = useState('')
  const [sPhone, setSPhone] = useState('')
  const [sAddr, setSAddr] = useState('')
  const [sDistrict, setSDistrict] = useState('')
  const [sProvince, setSProvince] = useState('TP.HCM')

  const [rName, setRName] = useState('')
  const [rPhone, setRPhone] = useState('')
  const [rAddr, setRAddr] = useState('')
  const [rDistrict, setRDistrict] = useState('')
  const [rProvince, setRProvince] = useState('TP.HCM')

  const [items, setItems] = useState<ProdItem[]>([{ name: '', weightKg: 0, qty: 1, value: 0 }])
  const totalWeightKg = useMemo(() => items.reduce((t, it) => t + (Number(it.weightKg)||0)*(Number(it.qty)||0), 0), [items])
  const totalValue = useMemo(() => items.reduce((t, it) => t + (Number(it.value)||0)*(Number(it.qty)||0), 0), [items])

  function updateItem(idx: number, patch: Partial<ProdItem>) {
    setItems(arr => arr.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }
  function addItem() { setItems(arr => [...arr, { name: '', weightKg: 0, qty: 1, value: 0 }]) }
  function removeItem(idx: number) { setItems(arr => arr.length<=1 ? arr : arr.filter((_,i)=>i!==idx)) }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) { alert('Cần đăng nhập admin'); return }
    if (!shipOrderCode.trim() || !sAddr.trim() || !rAddr.trim()) {
      alert('order_code, địa chỉ người gửi và nhận là bắt buộc')
      return
    }
    try {
      const res = await createShipment({
        merchant_code: shipMerchant || undefined,
        order_code: shipOrderCode.trim(),
        ref_code: shipRefCode.trim() || undefined,
        sender: { full_name: sName || undefined, phone: sPhone || undefined, address: sAddr.trim(), district: sDistrict || undefined, province: sProvince || undefined },
        receiver: { full_name: rName || undefined, phone: rPhone || undefined, address: rAddr.trim(), district: rDistrict || undefined, province: rProvince || undefined },
        service_type: shipService,
        cod_amount: Number(shipCOD) || 0,
        items: items.map(p => ({ name: p.name || undefined, weight_g: p.weightKg ? Math.round(Number(p.weightKg)*1000) : undefined, value: p.value || undefined })),
      }, token)
      alert(`Tạo vận đơn thành công: ${res.waybill_number}`)
      setShipOrderCode(''); setShipRefCode(''); setRName(''); setRPhone(''); setRAddr(''); setRDistrict(''); setRProvince('TP.HCM');
      setSName(''); setSPhone(''); setSAddr(''); setSDistrict(''); setSProvince('TP.HCM'); setItems([{ name:'', weightKg:0, qty:1, value:0 }]); setShipCOD(0)
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
                <input className="input" placeholder="Số điện thoại" value={rPhone} onChange={e=>setRPhone(e.target.value)} />
                <input className="input" placeholder="Tên khách hàng" value={rName} onChange={e=>setRName(e.target.value)} />
                <input className="input" placeholder="Địa chỉ chi tiết (Tòa nhà/ Hẻm/ Đường)" value={rAddr} onChange={e=>setRAddr(e.target.value)} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <input className="input" placeholder="Quận/Huyện" value={rDistrict} onChange={e=>setRDistrict(e.target.value)} />
                  <input className="input" placeholder="Tỉnh/TP" value={rProvince} onChange={e=>setRProvince(e.target.value)} />
                </div>

                <div style={{ height:8 }} />
                <div style={{ fontWeight:700 }}>Người gửi</div>
                <input className="input" placeholder="Số điện thoại" value={sPhone} onChange={e=>setSPhone(e.target.value)} />
                <input className="input" placeholder="Tên người gửi" value={sName} onChange={e=>setSName(e.target.value)} />
                <input className="input" placeholder="Địa chỉ chi tiết" value={sAddr} onChange={e=>setSAddr(e.target.value)} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <input className="input" placeholder="Quận/Huyện" value={sDistrict} onChange={e=>setSDistrict(e.target.value)} />
                  <input className="input" placeholder="Tỉnh/TP" value={sProvince} onChange={e=>setSProvince(e.target.value)} />
                </div>

                <div style={{ height:8 }} />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <select className="input" value={shipService} onChange={e=>setShipService(e.target.value)}>
                    {['STANDARD','EXPRESS'].map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input className="input" placeholder="COD (đ)" type="number" value={shipCOD} onChange={e=>setShipCOD(Number(e.target.value))} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <input className="input" placeholder="Mã merchant" value={shipMerchant} onChange={e=>setShipMerchant(e.target.value)} />
                  <input className="input" placeholder="Order code (bắt buộc)" value={shipOrderCode} onChange={e=>setShipOrderCode(e.target.value)} />
                </div>
                <input className="input" placeholder="Ref code" value={shipRefCode} onChange={e=>setShipRefCode(e.target.value)} />
              </div>
            </div>

            <div style={{ flex:1, minWidth:320 }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>Sản phẩm</div>
              <div style={{ display:'grid', gap:8 }}>
                {items.map((p, idx) => (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:8, alignItems:'center' }}>
                    <input className="input" placeholder={`${idx+1}. Tên sản phẩm`} value={p.name} onChange={e=>updateItem(idx,{ name:e.target.value })} />
                    <input className="input" placeholder="Khối lượng (kg)" type="number" min={0} step={0.01} value={p.weightKg} onChange={e=>updateItem(idx,{ weightKg: Number(e.target.value) })} />
                    <input className="input" placeholder="Số lượng" type="number" min={1} step={1} value={p.qty} onChange={e=>updateItem(idx,{ qty: Math.max(1, Number(e.target.value)||1) })} />
                    <input className="input" placeholder="Giá trị (đ)" type="number" min={0} step={1000} value={p.value} onChange={e=>updateItem(idx,{ value: Number(e.target.value) })} />
                    <button type="button" className="btn" onClick={()=>removeItem(idx)}>-</button>
                  </div>
                ))}
                <div><button type="button" className="btn" onClick={addItem}>+ Thêm sản phẩm</button></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div className="card" style={{ padding:12 }}>
                    <div style={{ color:'var(--muted)' }}>Tổng KL</div>
                    <div style={{ fontWeight:700 }}>{totalWeightKg.toFixed(2)} kg</div>
                  </div>
                  <div className="card" style={{ padding:12 }}>
                    <div style={{ color:'var(--muted)' }}>Giá trị hàng</div>
                    <div style={{ fontWeight:700 }}>{totalValue.toLocaleString('vi-VN')} đ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
            <button type="button" className="btn" style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.12)' }}>Lưu nháp</button>
            <button className="btn" type="submit">Đăng đơn</button>
          </div>
        </form>
      </div>
    </div>
  )
}

