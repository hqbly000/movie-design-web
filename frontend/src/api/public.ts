/**
 * 官网公开接口封装（architecture.md §3.2.2）。
 * 只发请求、解包，不含业务规则。
 */

import { request } from './http'
import type { LeadPayload, SegmentVideos, SiteConfig } from '@/types/site'

/**
 * 首页聚合配置（hero / company / segments / honors / site_settings）。
 * 后端有 60s 内存缓存。
 */
export function getSiteConfig(): Promise<SiteConfig> {
  return request<SiteConfig>({ url: '/api/public/site', method: 'GET' })
}

/**
 * 某板块作品列表（仅已发布，按 segment_items.sort）。
 * @param segmentId 板块 id
 */
export function getSegmentVideos(segmentId: number): Promise<SegmentVideos> {
  return request<SegmentVideos>({
    url: `/api/public/segments/${segmentId}/videos`,
    method: 'GET'
  })
}

/**
 * 提交预约留言。
 * @param payload 姓名 / 电话 / 需求备注
 * @returns 新建记录 id
 */
export function submitLead(payload: LeadPayload): Promise<{ id: number }> {
  return request<{ id: number }>({
    url: '/api/public/leads',
    method: 'POST',
    data: payload
  })
}
