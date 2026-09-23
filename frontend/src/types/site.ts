/**
 * 官网聚合配置类型定义（对应 GET /api/public/site 与板块作品接口）。
 * 字段名与后端契约严格一致（architecture.md §3.2.2）。
 */

/** 首屏轮播单张（恰好 3 条，顺序即轮播顺序）。 */
export interface HeroSlide {
  id: number
  image_url: string
  slogan: string
  sub_slogan: string | null
  sort: number
}

/** 公司介绍（单行）。founded_year 用于前端实时计算展示年限。 */
export interface CompanyProfile {
  section_title: string
  company_name: string
  founded_year: number
  intro_text: string | null
}

/** 板块内容类型（R26）：客户端不可见的内部属性。 */
export type SegmentContentType = 'video' | 'gallery' | 'article'

/** 业务板块（恰好 5 条，顺序即官网五列顺序）。 */
export interface Segment {
  id: number
  name: string
  preview_image_url: string | null
  content_type: SegmentContentType
  sort: number
  item_count: number
}

/** 荣誉条目（最多 6 条）。 */
export interface Honor {
  id: number
  title: string
  description: string | null
  issuer: string
  level: string
  sort: number
}

/** 站点配置（备案号 / 联系方式 / 版权等，KV 展平）。 */
export interface SiteSettings {
  icp_no?: string
  police_no?: string
  copyright?: string
  phone?: string
  address?: string
  email?: string
  work_hours?: string
  brand_slogan?: string
}

/** 首页聚合配置。 */
export interface SiteConfig {
  hero_slides: HeroSlide[]
  company_profile: CompanyProfile | null
  segments: Segment[]
  honors: Honor[]
  site_settings: SiteSettings
}

/** 视频作品项。 */
export interface VideoItem {
  id: number
  title: string
  bv_id: string
  category_id: string | null
  year: number | null
  cover_url: string | null
  sort?: number
}

/** 某板块作品列表响应。 */
export interface SegmentVideos {
  segment_id: number
  name: string
  content_type: SegmentContentType
  videos: VideoItem[]
}

/** 预约表单提交载荷（POST /api/public/leads）。 */
export interface LeadPayload {
  name: string
  phone: string
  demand_note?: string
}

/** 视频分类键 → 中文标签（architecture.md §10-2）。 */
export type VideoCategoryKey =
  | 'portrait'
  | 'wedding'
  | 'commercial'
  | 'event'
  | 'video'
  | 'other'
