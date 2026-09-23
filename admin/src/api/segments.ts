import { request } from '@/api/request'
import type { Segment, SegmentUpdateIn } from '@/types/models'

/** GET /api/admin/segments（固定 5 条，含 content_type 与已选清单） */
export function listSegments(): Promise<Segment[]> {
  return request.get<Segment[]>('/api/admin/segments')
}

/** PUT /api/admin/segments/{id} */
export function updateSegment(id: number, body: SegmentUpdateIn): Promise<Segment> {
  return request.put<Segment>(`/api/admin/segments/${id}`, body)
}

/** PUT /api/admin/segments/order（拖拽排序，长度≠5 → 3002） */
export function saveSegmentOrder(ids: number[]): Promise<Segment[]> {
  return request.put<Segment[]>('/api/admin/segments/order', { ids })
}
