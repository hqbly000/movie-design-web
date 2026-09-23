/**
 * 静态资源路径拼接（architecture.md §1.4）。
 * 图片素材由后端 `/uploads/*` 直出，DB 存相对路径，前端拼 VITE_API_BASE。
 */

import { API_BASE } from '@/api/http'

/**
 * 将后端返回的相对资源路径解析为可访问的绝对地址。
 * - 空值 → 空字符串（调用方据此走占位）；
 * - 已是绝对 URL / data URI → 原样返回；
 * - 以 `/` 开头 → 拼 `VITE_API_BASE`。
 * @param path 相对路径，如 `/uploads/cover/cinematic-wide.png`
 */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalized}`
}

/** assetUrl 的别名，语义更贴近「resolve」。 */
export const resolveAssetUrl = assetUrl

export default assetUrl
