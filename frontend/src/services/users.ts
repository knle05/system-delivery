export type Role = 'admin' | 'customer' | 'merchant'

export type UserListItem = {
  id: number
  email: string
  name: string | null
  role: Role
  merchant_id?: number | null
  merchant_code?: string | null
  merchant_name?: string | null
}

export async function listUsers(token?: string): Promise<UserListItem[]> {
  const headers: Record<string,string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch('/api/users', { headers })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

export async function updateUserRole(
  id: number,
  role: 'customer' | 'merchant',
  token?: string
): Promise<{ ok: true; user?: { id: number; email: string; name: string | null; role: Role } }>
{
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/users/${id}/role`, { method: 'PATCH', headers, body: JSON.stringify({ role }) })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}

export async function updateUserMerchant(
  id: number,
  payload: { merchant_id?: number; merchant_code?: string },
  token?: string
): Promise<{ ok: true; user?: { id: number; merchant_id: number | null } }>
{
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/users/${id}/merchant`, { method: 'PATCH', headers, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(await res.text() || `API lỗi: ${res.status}`)
  return res.json()
}
