import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import { TOKEN_KEY } from '@/utils/constants'
import type { Role, User } from '@/types/models'

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
}

/**
 * 登录态：token + user + role。
 * token 持久化于 localStorage，user 每次会话通过 /me 拉取（路由守卫保证先加载）。
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: null,
    loading: false
  }),
  getters: {
    isAuthenticated: (s): boolean => !!s.token,
    role: (s): Role | null => s.user?.role ?? null,
    isAdmin: (s): boolean => s.user?.role === 'admin',
    /** editor+ 可执行内容维护与分发写操作 */
    canEdit: (s): boolean => s.user?.role === 'admin' || s.user?.role === 'editor',
    displayName: (s): string => s.user?.name ?? ''
  },
  actions: {
    setSession(token: string, user: User): void {
      this.token = token
      this.user = user
      localStorage.setItem(TOKEN_KEY, token)
    },
    async login(email: string, password: string): Promise<void> {
      const res = await authApi.login(email, password)
      this.setSession(res.token, res.user)
    },
    /** 路由守卫调用：有 token 但未加载 user 时拉取 /me */
    async ensureLoaded(): Promise<void> {
      if (!this.token || this.user) return
      this.loading = true
      try {
        this.user = await authApi.me()
      } catch {
        this.clear()
      } finally {
        this.loading = false
      }
    },
    async refresh(): Promise<void> {
      if (!this.token) return
      try {
        this.user = await authApi.me()
      } catch {
        /* 拦截器已处理 1002 */
      }
    },
    clear(): void {
      this.token = null
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
    },
    async logout(): Promise<void> {
      try {
        await authApi.logout()
      } catch {
        /* JWT 无状态，忽略登出失败 */
      }
      this.clear()
    }
  }
})
