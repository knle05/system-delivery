export async function deleteLastWaybillEvent(
  waybill: string,
  token?: string
): Promise<{ ok: true; deleted_event_id: number; current_status?: string }>
{
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/shipments/${encodeURIComponent(waybill)}/events/last`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

