import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { TOKEN_KEY } from '@/utils/constants'
import { ErrorCode, type ApiResponse } from '@/types/api'

/** 业务异常：携带后端 code / message / data，供视图做行内提示与优雅降级 */
export class ApiError extends Error {
  readonly code: number
  readonly data: unknown
  constructor(code: number, message: string, data: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.data = data
  }
}

let unauthorizedHandler: (() => void) | null = null
/** 注册 1002（未登录/过期）统一处理：由 main.ts 注入清 token + 跳登录 */
export function setUnauthorizedHandler(fn: () => void): void {
  unauthorizedHandler = fn
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  timeout: 20000
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function isWrapped(body: unknown): body is ApiResponse<unknown> {
  return !!body && typeof body === 'object' && 'code' in (body as Record<string, unknown>)
}

instance.interceptors.response.use(
  (response) => {
    const body = response.data
    // 统一响应包装：code===0 解包返回 data，否则抛 ApiError（多数业务错误 HTTP 200）
    if (isWrapped(body)) {
      if (body.code === ErrorCode.OK) return body.data as unknown as AxiosResponse
      if (body.code === ErrorCode.UNAUTHORIZED) unauthorizedHandler?.()
      throw new ApiError(body.code, body.message || '请求失败', body.data)
    }
    return response
  },
  (error) => {
    const response = error?.response
    const body: unknown = response?.data
    if (isWrapped(body)) {
      if (body.code === ErrorCode.UNAUTHORIZED) unauthorizedHandler?.()
      throw new ApiError(body.code, body.message || '请求失败', body.data)
    }
    const status: number | undefined = response?.status
    if (status === 401) {
      unauthorizedHandler?.()
      throw new ApiError(ErrorCode.UNAUTHORIZED, '未登录或登录已过期，请重新登录')
    }
    if (status === 403) throw new ApiError(ErrorCode.FORBIDDEN, '当前角色无权执行此操作')
    if (status === 404) throw new ApiError(404, '请求的资源不存在')
    if (status && status >= 500) throw new ApiError(ErrorCode.SERVER, '服务端异常，请稍后重试')
    throw new ApiError(ErrorCode.SERVER, error?.message || '网络异常，请稍后重试')
  }
)

/** 已解包（直接返回 data）的类型化请求封装 */
export const request = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config) as unknown as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config) as unknown as Promise<T>
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config) as unknown as Promise<T>
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config) as unknown as Promise<T>
  }
}

export default instance
