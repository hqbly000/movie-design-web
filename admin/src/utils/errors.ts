import { ApiError } from '@/api/request'
import { ErrorCode } from '@/types/api'

/**
 * 将后端错误映射为用户可读文案（§7.1）。
 *
 * 背景：后端对参数校验失败（1001）会直接返回 pydantic 原文
 * （如「参数校验失败：size Input should be less than or equal to 100」），
 * 该原文不应直接展示给用户。原始错误信息请只写 `console.error`，界面展示走本函数。
 *
 * @param e 捕获到的异常
 * @param fallback 无法识别时的兜底文案
 */
export function friendlyErrorMessage(e: unknown, fallback = '加载失败'): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case ErrorCode.PARAM:
        return '请求参数有误，请刷新页面后重试'
      case ErrorCode.UNAUTHORIZED:
        return '登录状态已失效，请重新登录'
      case ErrorCode.FORBIDDEN:
        return '当前角色没有该操作权限'
      case ErrorCode.SERVER:
        return '服务暂时不可用，请稍后重试'
      default:
        return e.message || fallback
    }
  }
  return e instanceof Error && e.message ? e.message : fallback
}
