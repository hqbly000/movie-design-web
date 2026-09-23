import { request } from '@/api/request'
import type { LoginResult, User } from '@/types/models'

/** POST /api/auth/login */
export function login(email: string, password: string): Promise<LoginResult> {
  return request.post<LoginResult>('/api/auth/login', { email, password })
}

/** GET /api/auth/me */
export function me(): Promise<User> {
  return request.get<User>('/api/auth/me')
}

/** POST /api/auth/logout */
export function logout(): Promise<Record<string, never>> {
  return request.post<Record<string, never>>('/api/auth/logout', {})
}
