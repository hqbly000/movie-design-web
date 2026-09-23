import { request } from '@/api/request'
import type { PageResult } from '@/types/api'
import type {
  Distribution,
  DistributionCreateIn,
  DistributionCreateResult,
  DistributionRegenerateIn
} from '@/types/models'

/** GET /api/admin/distributions */
export function listDistributions(
  params: { status?: string; page?: number; size?: number } = {}
): Promise<PageResult<Distribution>> {
  return request.get<PageResult<Distribution>>('/api/admin/distributions', { params })
}

/** POST /api/admin/distributions */
export function createDistribution(body: DistributionCreateIn): Promise<DistributionCreateResult> {
  return request.post<DistributionCreateResult>('/api/admin/distributions', body)
}

/** POST /api/admin/distributions/{id}/close */
export function closeDistribution(id: number): Promise<Distribution> {
  return request.post<Distribution>(`/api/admin/distributions/${id}/close`, {})
}

/** POST /api/admin/distributions/{id}/regenerate */
export function regenerateDistribution(
  id: number,
  body: DistributionRegenerateIn = {}
): Promise<DistributionCreateResult> {
  return request.post<DistributionCreateResult>(`/api/admin/distributions/${id}/regenerate`, body)
}
