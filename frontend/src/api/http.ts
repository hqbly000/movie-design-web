/**
 * axios 统一封装（architecture.md §3.1 / §6.7）。
 *
 * - 注入 VITE_API_BASE；
 * - 统一解包 `{code, data, message}`，`code === 0` 为成功；
 * - 业务错误多数以 HTTP 200 返回，故以 `body.code !== 0` 为主判定；
 * - 抛出携带业务码的 `ApiError`，供上层识别（如 4001 分享链接失效）。
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

/** 后端统一响应包装。 */
export interface ApiEnvelope<T> {
  code: number
  data: T
  message: string
}

/** 业务错误码常量（与后端一致）。 */
export const ERROR_CODE = {
  OK: 0,
  PARAM: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  BV_FORMAT: 2001,
  BV_PARSE: 2002,
  BV_DUPLICATE: 2003,
  HONOR_LIMIT: 3001,
  FIXED_COUNT: 3002,
  SHARE_INVALID: 4001,
  SERVER: 5000,
  NETWORK: -1
} as const

/** 携带业务码的 API 异常。 */
export class ApiError extends Error {
  /** 业务错误码；-1 表示网络/未知错误。 */
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** 规范化后的 API 基址（去掉末尾斜杠）。 */
export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// HTTP 层错误（401/403/404/500 或网络失败）→ 统一转 ApiError
instance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const err = error as {
      response?: { status?: number; data?: Partial<ApiEnvelope<unknown>> }
      message?: string
    }
    const body = err?.response?.data
    if (body && typeof body.code === 'number') {
      return Promise.reject(new ApiError(body.code, body.message ?? '请求失败'))
    }
    if (err?.response?.status === 404) {
      return Promise.reject(new ApiError(ERROR_CODE.PARAM, '接口不存在'))
    }
    return Promise.reject(new ApiError(ERROR_CODE.NETWORK, err?.message ?? '网络请求失败'))
  }
)

/**
 * 发起请求并解包 `data`。
 * @param config axios 配置
 * @returns 解包后的业务数据
 * @throws {ApiError} code !== 0 或网络异常
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request<ApiEnvelope<T>>(config)
  const body = response.data
  // 兜底：非标准包装体时直接返回原始数据
  if (!body || typeof body.code !== 'number') {
    return body as unknown as T
  }
  if (body.code !== ERROR_CODE.OK) {
    throw new ApiError(body.code, body.message || '请求失败')
  }
  return body.data
}

export default instance
