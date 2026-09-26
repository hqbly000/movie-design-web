/**
 * 官网公开接口封装（architecture.md §3.2.2）。
 * 只发请求、解包，不含业务规则。
 */

import { request } from './http'
import type { CompanyDetail, LeadPayload, SegmentContent, SiteConfig } from '@/types/site'

/**
 * 首页聚合配置（hero / company / segments / honors / site_settings）。
 * 后端有 60s 内存缓存；不含 body / long_intro 等大文本。
 */
export function getSiteConfig(): Promise<SiteConfig> {
  return request<SiteConfig>({ url: '/api/public/site', method: 'GET' })
}

/**
 * 某板块详情内容（按 content_type 返回视频 / 图片 / 图文）。
 * @param segmentId 板块 id
 */
export function getSegmentContent(segmentId: number): Promise<SegmentContent> {
  return request<SegmentContent>({
    url: `/api/public/segments/${segmentId}/content`,
    method: 'GET'
  })
}

/** 公司详情长文（long_intro，按需取）。 */
export function getCompanyDetail(): Promise<CompanyDetail> {
  return request<CompanyDetail>({ url: '/api/public/company/detail', method: 'GET' })
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
