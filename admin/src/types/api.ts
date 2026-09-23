/**
 * 后端统一响应包装与分页结构。
 * 依据 architecture.md §3.1：成功 {code:0,data,message}；业务失败 code!==0。
 */
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

/** 分页结果（videos / distributions / leads 列表接口统一结构） */
export interface PageResult<T> {
  total: number
  page: number
  size: number
  items: T[]
}

/** 业务错误码（与 architecture.md §3.1 错误码表一致） */
export const ErrorCode = {
  OK: 0,
  PARAM: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  LOGIN_FAILED: 1004,
  BV_FORMAT: 2001,
  BV_PARSE: 2002,
  BV_EXISTS: 2003,
  HONOR_LIMIT: 3001,
  FIXED_COUNT: 3002,
  SHARE_INVALID: 4001,
  SERVER: 5000
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]
