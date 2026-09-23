/**
 * 资源地址拼接（architecture.md §1.4）。
 * 后端 cover_url / preview_image_url / assets.url 均存相对路径（/uploads/...）；
 * 开发期 VITE_API_BASE 为空且 vite 代理已覆盖 /uploads，故直接用相对路径即可；
 * 生产期 VITE_API_BASE 非空时拼成绝对地址。
 */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path
  const base = import.meta.env.VITE_API_BASE || ''
  if (!base) return path
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}
