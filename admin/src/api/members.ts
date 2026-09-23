import { request } from '@/api/request'
import type { Member, MemberCreateIn, MemberUpdateIn } from '@/types/models'

/** GET /api/admin/members（admin only） */
export function listMembers(): Promise<Member[]> {
  return request.get<Member[]>('/api/admin/members')
}

/** POST /api/admin/members */
export function createMember(body: MemberCreateIn): Promise<Member> {
  return request.post<Member>('/api/admin/members', body)
}

/** PUT /api/admin/members/{id} */
export function updateMember(id: number, body: MemberUpdateIn): Promise<Member> {
  return request.put<Member>(`/api/admin/members/${id}`, body)
}
