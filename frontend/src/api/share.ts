/**
 * 分享页接口封装（architecture.md §3.2.3）。
 * 失效时后端返回 code 4001（HTTP 200），由调用方捕获识别。
 */

import { request } from './http'
import type { ShareCollection } from '@/types/share'

/**
 * 按 token 获取合集预览数据。
 * @param token 分发 token
 * @throws {ApiError} code 4001 表示链接失效/关闭/过期
 */
export function getShareCollection(token: string): Promise<ShareCollection> {
  return request<ShareCollection>({
    url: `/api/share/${encodeURIComponent(token)}`,
    method: 'GET'
  })
}
