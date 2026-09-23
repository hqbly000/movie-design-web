/**
 * 进入视口检测（architecture.md §5.1 / §10）。
 * - `useInView`：组合式 API，返回 target 与 isInView；
 * - `vReveal`：全局指令，配合 `.ly-reveal / .is-visible` 实现滚动淡入上移。
 */

import { ref, type Directive, type Ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'

export interface UseInViewOptions {
  /** 触发阈值，默认 0.15。 */
  threshold?: number
  /** 视口边距，默认底部提前 8% 触发。 */
  rootMargin?: string
  /** 是否只触发一次，默认 true。 */
  once?: boolean
}

export interface UseInViewReturn {
  target: Ref<HTMLElement | null>
  isInView: Ref<boolean>
}

/**
 * 监听元素进入视口。
 * @param options 阈值 / 边距 / 是否只触发一次
 */
export function useInView(options: UseInViewOptions = {}): UseInViewReturn {
  const { threshold = 0.15, rootMargin = '0px 0px -8% 0px', once = true } = options
  const target = ref<HTMLElement | null>(null)
  const isInView = ref(false)

  const { stop } = useIntersectionObserver(
    target,
    (entries) => {
      const entry = entries[0]
      if (!entry) return
      if (entry.isIntersecting) {
        isInView.value = true
        if (once) stop()
      } else if (!once) {
        isInView.value = false
      }
    },
    { threshold, rootMargin }
  )

  return { target, isInView }
}

/**
 * 全局指令 `v-reveal`（可传延迟毫秒：`v-reveal="120"`）。
 * 元素进入视口后添加 `.is-visible`，只触发一次。
 */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('ly-reveal')
    const delay = typeof binding.value === 'number' ? binding.value : 0
    if (delay > 0) el.style.transitionDelay = `${delay}ms`

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)
    ;(el as HTMLElement & { __revealObserver?: IntersectionObserver }).__revealObserver = observer
  },
  unmounted(el) {
    const holder = el as HTMLElement & { __revealObserver?: IntersectionObserver }
    holder.__revealObserver?.disconnect()
    delete holder.__revealObserver
  }
}

export default vReveal
