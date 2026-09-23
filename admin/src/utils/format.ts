/**
 * 时间与派生值格式化（architecture.md §9.4）。
 * 后端返回本地时区 ISO 字符串（无时区后缀），此处按本地时间解析。
 */

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function parse(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/** YYYY.MM.DD */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = parse(value)
  if (!d) return '—'
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/** YYYY.MM.DD HH:mm */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = parse(value)
  if (!d) return '—'
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** HH:mm */
export function formatTimeHM(value: string | number | Date | null | undefined): string {
  const d = parse(value)
  if (!d) return '—'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** MM.DD */
export function formatMonthDay(value: string | number | Date | null | undefined): string {
  const d = parse(value)
  if (!d) return '—'
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/** 周X */
export function formatWeekday(value: string | number | Date | null | undefined): string {
  const d = parse(value)
  if (!d) return '—'
  return `周${WEEKDAYS[d.getDay()]}`
}

/** 展示年限 = 当前年 − 成立年份（R5，前端计算，不落库） */
export function displayYears(foundedYear: number | null | undefined): number {
  if (!foundedYear) return 0
  const years = new Date().getFullYear() - foundedYear
  return years > 0 ? years : 0
}

/** 是否同一天（用于「至 22:05」与「至 09.24 22:05」的区分） */
export function isSameDay(a: string | Date | null | undefined, b: string | Date | null | undefined): boolean {
  const da = parse(a)
  const db = parse(b)
  if (!da || !db) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

/** 将 Date 转为 datetime-local 输入框所需格式 YYYY-MM-DDTHH:mm */
export function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
