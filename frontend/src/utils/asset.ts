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

/**
 * 推导同名 WebP 地址（由 `scripts/optimize-images.py` 生成的兄弟文件）。
 *
 * 只做扩展名替换，不探测文件是否存在——存在的约定见脚本：
 * `uploads/**` 与 `public/images/*.png|jpg` 都会有同名 `.webp`。
 * 返回 null 表示该图没有 WebP 版本（如已是 webp、或是 svg/远程 URL）。
 */
export function webpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (!/\.(png|jpe?g)(\?.*)?$/i.test(url)) return null
  return url.replace(/\.(png|jpe?g)(\?.*)?$/i, '.webp')
}

let webpSupported: boolean | null = null

/** 当前浏览器是否支持 WebP（同步探测，结果缓存）。 */
export function supportsWebp(): boolean {
  if (webpSupported !== null) return webpSupported
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    webpSupported = false
  }
  return webpSupported
}

/**
 * 图片最终地址：能解析路径 + 浏览器支持 WebP + 有同名 webp → 用 webp，否则用原图。
 *
 * ⚠️ 不要用 `<picture>` 包裹来做这件事：`<picture>` 会切断父组件 `scoped`
 * 样式里的后代选择器（如 `.photo img`、`.laurel`），导致图片尺寸/定位失效。
 * 这里只换 src，DOM 结构不变，样式作用域照旧。
 */
export function preferredImageUrl(path: string | null | undefined): string {
  const url = assetUrl(path)
  if (!url) return ''
  if (!supportsWebp()) return url
  return webpUrl(url) ?? url
}

export default assetUrl
