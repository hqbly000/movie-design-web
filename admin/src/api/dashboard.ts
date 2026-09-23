import { request } from '@/api/request'
import type { DashboardStats } from '@/types/models'

/** GET /api/admin/dashboard/stats */
export function getDashboardStats(): Promise<DashboardStats> {
  return request.get<DashboardStats>('/api/admin/dashboard/stats')
}
