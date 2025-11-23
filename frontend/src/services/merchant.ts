export type Merchant = { id: number; code: string; name?: string | null }

export async function listMerchants(token?: string): Promise<Merchant[]> {
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/merchants', { headers })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  const data = await res.json()
  if (Array.isArray(data)) return data as Merchant[]
  if (Array.isArray((data as any)?.items)) return (data as any).items as Merchant[]
  return []
}

