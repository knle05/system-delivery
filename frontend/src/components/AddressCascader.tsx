import { useEffect, useRef, useState } from 'react'
import { ghnProvinces, ghnDistricts, ghnWards } from '../services/api'

export type CascaderValue = {
  provinceId?: number
  provinceName?: string
  districtId?: number
  districtName?: string
  wardCode?: string
  wardName?: string
}

export default function AddressCascader({
  label,
  value,
  onChange,
  requiredLevel = 'ward',
  disabled,
  showFullPath = true,
  separator = ' / ',
  closeOnOutside = true,
}: {
  label: string
  value?: CascaderValue
  onChange: (val: CascaderValue) => void
  requiredLevel?: 'district' | 'ward'
  disabled?: boolean
  showFullPath?: boolean
  separator?: string
  closeOnOutside?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<0 | 1 | 2>(0)
  const [provinces, setProvinces] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [wards, setWards] = useState<any[]>([])

  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close on outside/Escape (configurable)
  useEffect(() => {
    if (!closeOnOutside) return
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [closeOnOutside])

  // Load provinces when opening first time
  useEffect(() => {
    if (!open || provinces.length) return
    ;(async () => {
      try { const r = await ghnProvinces(); setProvinces(r?.data || []) } catch {}
    })()
  }, [open, provinces.length])

  // Auto-close after finishing the deepest required level
  useEffect(() => {
    if (requiredLevel === 'ward' && value?.wardCode) {
      setOpen(false); setTab(0)
    }
    if (requiredLevel === 'district' && value?.districtId && !value?.wardCode) {
      setOpen(false); setTab(0)
    }
  }, [value?.wardCode, value?.districtId, requiredLevel])

  async function pickProvince(p: any) {
    const next: CascaderValue = { provinceId: p.ProvinceID, provinceName: p.ProvinceName }
    onChange(next)
    setOpen(true)
    setTab(1) // immediately move to districts
    setDistricts([]); setWards([])
    try { const r = await ghnDistricts(p.ProvinceID); setDistricts(r?.data || []) } catch {}
  }

  async function pickDistrict(d: any) {
    const next: CascaderValue = {
      provinceId: value?.provinceId,
      provinceName: value?.provinceName,
      districtId: d.DistrictID,
      districtName: d.DistrictName,
    }
    onChange(next)
    if (requiredLevel === 'district') { setOpen(false); return }
    setTab(2) // immediately move to wards
    setWards([])
    try { const r = await ghnWards(d.DistrictID); setWards(r?.data || []) } catch {}
  }

  function pickWard(w: any) {
    const next: CascaderValue = {
      provinceId: value?.provinceId,
      provinceName: value?.provinceName,
      districtId: value?.districtId,
      districtName: value?.districtName,
      wardCode: String(w.WardCode),
      wardName: w.WardName,
    }
    onChange(next)
    // close after DOM updates to avoid race with click bubbling
    setTimeout(() => {
      setOpen(false)
      setTab(0)
      const btn = containerRef.current?.querySelector('button') as HTMLButtonElement | null
      btn?.blur()
    }, 0)
  }

  const display = showFullPath
    ? [value?.provinceName, value?.districtName, value?.wardName].filter(Boolean).join(separator)
    : (value?.wardName || (value?.districtName ? `${value.districtName}, ${value.provinceName || ''}` : (value?.provinceName || '')))

  return (
    <div ref={containerRef} className="cascader">
      <div className="cascader-label">{label}</div>
      <button
        type="button"
        className="cascader-input"
        onClick={() => { if (!disabled) setOpen(true) }}
        disabled={disabled}
      >
        {display || 'Chọn địa chỉ'}
        <span style={{ marginLeft: 'auto', opacity: .7 }}>▾</span>
      </button>

      {open && (
        <div className="cascader-panel" onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}>
          <div className="cascader-tabs">
            <button className={`tab ${tab===0?'active':''}`} onClick={()=>setTab(0)}>Tỉnh/TP</button>
            <button className={`tab ${tab===1?'active':''}`} onClick={()=>setTab(1)} disabled={!value?.provinceId}>Quận/Huyện</button>
            <button className={`tab ${tab===2?'active':''}`} onClick={()=>setTab(2)} disabled={requiredLevel==='district' || !value?.districtId}>Phường/Xã</button>
          </div>
          <div className="cascader-list">
            {tab===0 && (
              <ul>
                {(provinces||[]).map((p:any)=> (
                  <li key={p.ProvinceID} onClick={()=>pickProvince(p)}>{p.ProvinceName}</li>
                ))}
              </ul>
            )}
            {tab===1 && (
              <ul>
                {(districts||[]).map((d:any)=> (
                  <li key={d.DistrictID} onClick={()=>pickDistrict(d)}>{d.DistrictName}</li>
                ))}
              </ul>
            )}
            {tab===2 && requiredLevel==='ward' && (
              <ul>
                {(wards||[]).map((w:any)=> (
                  <li key={w.WardCode} onClick={()=>pickWard(w)}>{w.WardName}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
