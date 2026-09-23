/**
 * 纯格式化工具（architecture.md §9.4）。
 * 时间格式：日期 `YYYY.MM.DD`，日期时间 `YYYY.MM.DD HH:mm`。
 */

/** 两位补零。 */
export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/** 宽松解析后端时间字符串（兼容 `空格` 分隔与 ISO）。 */
function toDate(value: string | number | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const raw = String(value).trim()
  if (!raw) return null
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 格式化为 `YYYY.MM.DD`。 */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const d = toDate(value)
  if (!d) return ''
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
}

/** 格式化为 `YYYY.MM.DD HH:mm`。 */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const d = toDate(value)
  if (!d) return ''
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * 展示年限 = 当前年 − 成立年（R5，前端实时计算，不落库）。
 * @param foundedYear 成立年份
 * @param now 参照时间，默认当前
 */
export function displayYears(foundedYear: number, now: Date = new Date()): number {
  const years = now.getFullYear() - foundedYear
  return years > 0 ? years : 0
}

/** 秒数 → `mm:ss`。 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${pad2(minutes)}:${pad2(seconds)}`
}

/** 视频分类键 → 中文标签。 */
export const CATEGORY_LABELS: Record<string, string> = {
  portrait: '人像写真',
  wedding: '婚礼纪实',
  commercial: '商业摄影',
  event: '活动跟拍',
  video: '视频短片',
  other: '其他'
}

/** 分类标签（空 → 「未分类」，R25）。 */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return '未分类'
  return CATEGORY_LABELS[key] ?? key
}

/** 板块名 → 英文名（用于全屏作品页 kicker「板块名 · 英文名」）。 */
export const SEGMENT_EN: Record<string, string> = {
  人像写真: 'PORTRAIT',
  婚礼纪实: 'WEDDING',
  商业摄影: 'COMMERCIAL',
  活动跟拍: 'EVENT',
  视频短片: 'FILM'
}

/** 取板块英文名；未知板块回退为 `SEGMENT`。 */
export function segmentEnglish(name: string): string {
  return SEGMENT_EN[name] ?? 'SEGMENT'
}

/** 板块名 → 图标名（AppIcon 的 name）。 */
export function segmentIcon(name: string): string {
  switch (name) {
    case '人像写真':
      return 'portrait'
    case '婚礼纪实':
      return 'wedding'
    case '商业摄影':
      return 'commercial'
    case '活动跟拍':
      return 'event'
    case '视频短片':
      return 'video'
    default:
      return 'aperture'
  }
}
