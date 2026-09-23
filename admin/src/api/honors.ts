import { request } from '@/api/request'
import type { Honor, HonorIn } from '@/types/models'

/** GET /api/admin/honors */
export function listHonors(): Promise<Honor[]> {
  return request.get<Honor[]>('/api/admin/honors')
}

/** POST /api/admin/honors（第 7 条 → 3001） */
export function createHonor(body: HonorIn): Promise<Honor> {
  return request.post<Honor>('/api/admin/honors', body)
}

/** PUT /api/admin/honors/{id} */
export function updateHonor(id: number, body: HonorIn): Promise<Honor> {
  return request.put<Honor>(`/api/admin/honors/${id}`, body)
}

/** DELETE /api/admin/honors/{id} */
export function deleteHonor(id: number): Promise<null> {
  return request.delete<null>(`/api/admin/honors/${id}`)
}
