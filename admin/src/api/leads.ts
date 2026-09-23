import { request } from '@/api/request'
import type { PageResult } from '@/types/api'
import type { Lead } from '@/types/models'

/** GET /api/admin/leads */
export function listLeads(
  params: { status?: string; page?: number; size?: number } = {}
): Promise<PageResult<Lead>> {
  return request.get<PageResult<Lead>>('/api/admin/leads', { params })
}

/** PUT /api/admin/leads/{id}/reply */
export function replyLead(id: number): Promise<Lead> {
  return request.put<Lead>(`/api/admin/leads/${id}/reply`, {})
}
