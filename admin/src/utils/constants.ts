import type { DurationType, Role, SegmentContentType, SegmentItemType } from '@/types/models'

/** localStorage 中保存 JWT 的键（需与 request.ts 保持一致） */
export const TOKEN_KEY = 'lightisle_admin_token'

/** 列表每页条数（§5.2 每页 10 条） */
export const PAGE_SIZE = 10

/**
 * 列表接口单次可请求的最大条数（后端 OpenAPI `size.maximum = 100`）。
 * 需要在前端做全量筛选/统计时使用，禁止传大于此值的 size，否则后端返回 1001。
 */
export const MAX_PAGE_SIZE = 100

/** 荣誉展厅容量上限（§5.7 / R7） */
export const MAX_HONORS = 6
/** 首屏轮播张数（§5.4 / R3） */
export const HERO_COUNT = 3
/** 业务板块固定数量（§5.6 / R8） */
export const SEGMENT_COUNT = 5

/* ---------- 字段长度上限（§7.4 / §5.x） ---------- */
export const LIMITS = {
  videoTitle: 40,
  slogan: 12,
  subSlogan: 30,
  collectionName: 20,
  customerName: 20,
  segmentName: 6,
  honorTitle: 24,
  honorDesc: 60,
  note: 200
} as const

/* ---------- 视频分类（architecture.md §10-2） ---------- */
export interface CategoryOption {
  key: string
  label: string
}
export const CATEGORIES: CategoryOption[] = [
  { key: 'portrait', label: '人像写真' },
  { key: 'wedding', label: '婚礼纪实' },
  { key: 'commercial', label: '商业摄影' },
  { key: 'event', label: '活动跟拍' },
  { key: 'video', label: '视频短片' },
  { key: 'other', label: '其他' }
]
/** 未分类筛选项对应的特殊值（architecture.md §3.2.4） */
export const CATEGORY_NONE = '__none__'

/* ---------- 荣誉等级（§5.7） ---------- */
export const HONOR_LEVELS = ['一等奖', '二等奖', '三等奖', '入选作品', '提名', '其他']

/* ---------- 分发限时（§5.5 / R18） ---------- */
export interface DurationOption {
  key: DurationType
  label: string
}
export const DURATION_OPTIONS: DurationOption[] = [
  { key: '30m', label: '30 分钟' },
  { key: '1h', label: '1 小时' },
  { key: '6h', label: '6 小时' },
  { key: '1d', label: '1 天' },
  { key: '3d', label: '3 天' },
  { key: 'custom', label: '自定义' }
]
export const DEFAULT_DURATION: DurationType = '1h'

/* ---------- 角色 ---------- */
export const ROLE_LABELS: Record<Role, string> = {
  admin: '管理员',
  editor: '编辑',
  viewer: '只读'
}
export const ROLE_OPTIONS: { key: Role; label: string }[] = [
  { key: 'admin', label: '管理员' },
  { key: 'editor', label: '编辑' },
  { key: 'viewer', label: '只读' }
]

/* ---------- 板块内容类型 ---------- */
export const CONTENT_TYPE_LABELS: Record<SegmentContentType, string> = {
  video: '有视频',
  gallery: '图集',
  article: '文章'
}
export const CONTENT_TYPE_OPTIONS: { key: SegmentContentType; label: string }[] = [
  { key: 'video', label: '有视频' },
  { key: 'gallery', label: '图集' },
  { key: 'article', label: '文章' }
]
export const CONTENT_TYPE_HINT =
  '选择「有视频」时客户点击板块进入视频作品页；「图集」进入图片浏览；「文章」进入图文长页（可后续启用，当前不启用）'

/** content_type → segment_items.target_type 映射 */
export const CONTENT_TYPE_TO_ITEM: Record<SegmentContentType, SegmentItemType> = {
  video: 'video',
  gallery: 'asset',
  article: 'article'
}

/* ---------- 年份下拉范围（§5.2 2015~当年） ---------- */
export const YEAR_MIN = 2015
export function yearOptions(): number[] {
  const now = new Date().getFullYear()
  const list: number[] = []
  for (let y = now; y >= YEAR_MIN; y--) list.push(y)
  return list
}
