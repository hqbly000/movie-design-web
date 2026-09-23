import { CATEGORIES, DURATION_OPTIONS } from '@/utils/constants'
import { formatMonthDay, formatTimeHM, isSameDay } from '@/utils/format'
import type { Distribution, DurationType, SegmentContentType, VideoStatus } from '@/types/models'

/** 视频状态 → UI 文案（§9.5） */
export function videoStatusLabel(status: VideoStatus): string {
  return status === 'published' ? '已发布' : '草稿'
}

/** 视频状态 → 胶囊样式 */
export function videoStatusKind(status: VideoStatus): 'ok' | 'neutral' {
  return status === 'published' ? 'ok' : 'neutral'
}

/** 分类键 → 中文（含未分类） */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return '未分类'
  const hit = CATEGORIES.find((c) => c.key === key)
  return hit ? hit.label : key
}

/** 分发状态 → 文案 */
export function distributionStatusLabel(status: Distribution['status']): string {
  if (status === 'active') return '有效中'
  if (status === 'closed') return '已关闭'
  return '已过期'
}

/** 分发状态 → 胶囊样式（§1.3 三组状态色） */
export function distributionStatusKind(status: Distribution['status']): 'ok' | 'neutral' | 'expired' {
  if (status === 'active') return 'ok'
  if (status === 'closed') return 'neutral'
  return 'expired'
}

/** 限时类型 → 时长文案 */
export function durationLabel(type: DurationType): string {
  const hit = DURATION_OPTIONS.find((d) => d.key === type)
  return hit ? hit.label : type
}

/**
 * 分发「限时」列文案（§5.5）：
 * - 有效中：`1 小时 · 至 22:05`（跨天则带日期 `· 至 09.24 22:05`）
 * - 已关闭：`1 天 · 已手动关闭`
 * - 已过期：`3 天 · 已于 09.24 失效`
 */
export function distributionLimitText(d: Distribution): string {
  const dur = durationLabel(d.duration_type)
  if (d.status === 'closed') return `${dur} · 已手动关闭`
  if (d.status === 'expired') return `${dur} · 已于 ${formatMonthDay(d.expires_at)} 失效`
  const to = isSameDay(d.expires_at, d.created_at)
    ? `至 ${formatTimeHM(d.expires_at)}`
    : `至 ${formatMonthDay(d.expires_at)} ${formatTimeHM(d.expires_at)}`
  return `${dur} · ${to}`
}

/** 板块内容类型 → 标签文案 */
export function contentTypeLabel(type: SegmentContentType): string {
  if (type === 'video') return '有视频'
  if (type === 'gallery') return '图集'
  return '文章'
}

/** 留言状态 → 文案 */
export function leadStatusLabel(status: 'unread' | 'replied'): string {
  return status === 'replied' ? '已回复' : '未读'
}

/** 留言状态 → 胶囊样式 */
export function leadStatusKind(status: 'unread' | 'replied'): 'accent' | 'neutral' {
  return status === 'unread' ? 'accent' : 'neutral'
}
