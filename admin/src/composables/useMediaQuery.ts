import { onScopeDispose, ref, type Ref } from 'vue'

/**
 * 响应式媒体查询（useMediaQuery 的最小本地实现）。
 *
 * 说明：刻意不依赖 @vueuse/core——该依赖此前未被任何代码引入，
 * 一旦新引入会触发 Vite 运行时依赖预构建（optimize deps）并整页 reload，
 * 在受限环境下还会打断 dev server。这里用原生 `window.matchMedia` 实现同等能力：
 * - 初始值同步取自 `mql.matches`
 * - 监听 `change` 事件保持响应式
 * - 组件卸载时自动移除监听
 *
 * @param query 形如 `(max-width: 767px)` 的媒体查询
 * @returns 是否命中的响应式布尔值
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return matches
  }

  const mql = window.matchMedia(query)
  matches.value = mql.matches

  const onChange = (event: MediaQueryListEvent): void => {
    matches.value = event.matches
  }

  mql.addEventListener('change', onChange)
  onScopeDispose(() => mql.removeEventListener('change', onChange))

  return matches
}
