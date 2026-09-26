/**
 * 后台业务模型（字段与后端真实 OpenAPI / 运行结果对齐）。
 * 枚举字面量见 architecture.md §9.5。
 */

export type Role = 'admin' | 'editor' | 'viewer'
export type VideoStatus = 'draft' | 'published'
export type DistributionStatus = 'active' | 'closed' | 'expired'
export type DurationType = '30m' | '1h' | '6h' | '1d' | '3d' | 'custom'
export type LeadStatus = 'unread' | 'replied'
export type SegmentContentType = 'video' | 'gallery' | 'article'
export type SegmentItemType = 'video' | 'asset' | 'article'

/* ---------- 鉴权 ---------- */
export interface User {
  id: number
  name: string
  email: string
  role: Role
  last_login_at: string | null
}
export interface LoginResult {
  token: string
  user: User
}

/* ---------- 工作台 ---------- */
export interface DashboardStats {
  today_leads: number
  today_leads_delta: number
  video_total: number
  video_added_this_month: number
  active_share: number
  expiring_within_7d: number
  recent_uploads: Video[]
  recent_leads: Lead[]
}

/* ---------- 视频库 ---------- */
export interface Video {
  id: number
  title: string
  bv_id: string
  category_id: string | null
  year: number | null
  cover_url: string | null
  status: VideoStatus
  sort: number
  created_by: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string | null
}

export interface VideoCreateIn {
  title: string
  bv_id: string
  category_id?: string | null
  year?: number | null
  cover_url?: string | null
  status?: VideoStatus
}

export interface BvMeta {
  bv_id: string
  title: string | null
  cover_url: string | null
}

export interface UploadResult {
  url: string
  width: number | null
  height: number | null
}

/* ---------- 图集素材 ---------- */
export interface Asset {
  id: number
  group_id: number | null
  group_type: string | null
  group_name: string | null
  url: string
  width: number | null
  height: number | null
  sort: number
}

/* ---------- 首页首屏 ---------- */
export interface HeroSlide {
  id: number
  image_id?: number | null
  image_url: string
  slogan: string
  sub_slogan: string | null
  sort: number
}
export interface HeroSlideIn {
  id: number
  image_url: string
  slogan: string
  sub_slogan: string | null
  sort: number
}

/* ---------- 公司介绍 ---------- */
export interface CompanyProfile {
  section_title: string
  company_name: string
  founded_year: number
  intro_text: string | null
  long_intro: string | null
}
export interface CompanyProfileIn {
  section_title: string
  company_name: string
  founded_year: number
  intro_text: string | null
  long_intro: string | null
}

/* ---------- 业务板块 ---------- */
export interface Segment {
  id: number
  name: string
  preview_image_id: number | null
  preview_image_url: string | null
  content_type: SegmentContentType
  body: string | null
  sort: number
  item_ids: number[]
  item_count: number
}
export interface SegmentUpdateIn {
  name: string
  preview_image_url: string | null
  content_type: SegmentContentType
  body?: string | null
  item_ids: number[]
  item_type?: SegmentItemType | null
}

/* ---------- 荣誉条目 ---------- */
export interface Honor {
  id: number
  title: string
  description: string | null
  issuer: string
  level: string
  sort: number
}
export interface HonorIn {
  title: string
  description?: string | null
  issuer: string
  level: string
}

/* ---------- 合集分发 ---------- */
export interface Distribution {
  id: number
  collection_id: number
  collection_name: string
  customer_masked: string
  video_count: number
  created_at: string
  duration_type: DurationType
  expires_at: string
  status: DistributionStatus
  share_url: string
  created_by: number | null
  /** 生成人显示名（后端补充返回；旧数据/未返回时为 null，列表展示「—」） */
  created_by_name?: string | null
}
export interface DistributionCreateIn {
  collection_name: string
  customer_name: string
  customer_contact?: string | null
  duration_type: DurationType
  custom_expires_at?: string | null
  note?: string | null
  video_ids: number[]
}
export interface DistributionRegenerateIn {
  duration_type?: DurationType | null
  custom_expires_at?: string | null
}
export interface DistributionCreateResult {
  id: number
  token: string
  share_url: string
  expires_at: string
}

/* ---------- 预约留言 ---------- */
export interface Lead {
  id: number
  name: string
  phone: string
  demand_type: string | null
  demand_date: string | null
  demand_note: string | null
  status: LeadStatus
  created_at: string
}

/* ---------- 账号与权限 ---------- */
export interface Member {
  id: number
  name: string
  email: string
  role: Role
  last_login_at: string | null
  created_at: string
}
export interface MemberCreateIn {
  name: string
  email: string
  password: string
  role: Role
}
export interface MemberUpdateIn {
  name?: string | null
  role?: Role | null
  password?: string | null
}
