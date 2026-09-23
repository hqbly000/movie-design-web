/**
 * 官网导航与滚动工具（architecture.md §2.1）。
 */

/** 顶部导航项：标题 + 目标锚点 id。 */
export interface NavItem {
  label: string
  target: string
}

/** 六项顶部导航（与设计方案 §2.1 一致）。 */
export const NAV_ITEMS: NavItem[] = [
  { label: '首页', target: 'hero' },
  { label: '关于我们', target: 'about' },
  { label: '荣誉资质', target: 'honors' },
  { label: '业务板块', target: 'segments' },
  { label: '作品展示', target: 'works' },
  { label: '联系我们', target: 'contact' }
]

/** 页脚导航（五项）。 */
export const FOOTER_NAV_ITEMS: NavItem[] = NAV_ITEMS.slice(1)

/**
 * 平滑滚动到指定锚点（尊重 prefers-reduced-motion）。
 * @param id 目标元素 id
 */
export function scrollToId(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}
