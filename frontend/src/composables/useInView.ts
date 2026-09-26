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

/** `v-reveal-x` 的值：起始位移与错峰延迟。 */
export interface RevealXValue {
  /** 起始水平位移（px），负值自左、正值自右。 */
  x?: number
  /** 起始垂直位移（px），正值自下浮起。 */
  y?: number
  /** 过渡延迟（ms），用于多列错峰。 */
  delay?: number
}

/** 记录已揭示过的组件实例：桌面/移动根元素切换重挂载后直接就位，不再二次播放。 */
const revealedInstances = new WeakSet<object>()

/**
 * 全局指令 `v-reveal-x`：带方向与错峰延迟的进场（方案A · 五列错峰合入）。
 * 用法：`v-reveal-x="{ x: -420, delay: 0 }"`。位移与延迟写入 CSS 变量
 * `--reveal-x / --reveal-y / --reveal-delay`，过渡本体在 `.ly-reveal-x`
 * （移动端纵向图带不做位移只淡入；桌面列根的内联过渡在 SegmentColumn 中合并）。
 * 触发阈值 0.15 / 底部提前 8%，只触发一次。
 */
export const vRevealX: Directive<HTMLElement, RevealXValue | undefined> = {
  mounted(el, binding) {
    const { x = 0, y = 0, delay = 0 } = binding.value ?? {}
    el.classList.add('ly-reveal-x')
    el.style.setProperty('--reveal-x', `${x}px`)
    el.style.setProperty('--reveal-y', `${y}px`)
    el.style.setProperty('--reveal-delay', `${delay}ms`)

    const markVisible = () => {
      el.classList.add('is-visible')
      if (binding.instance) revealedInstances.add(binding.instance)
    }

    // 同一组件在桌面/移动两个根之间切换重挂载时，已揭示过则直接就位
    if (binding.instance && revealedInstances.has(binding.instance)) {
      markVisible()
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      markVisible()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          markVisible()
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    // IntersectionObserver 按 transform 后的包围盒计算相交：起始位移可能把元素
    // 整个推出视口（如方案A 的列1/列5 ±420px），导致永远无法触发。
    // 因此观察未位移的父容器，由它代为触发（demo 即观察整条图带）。
    observer.observe(el.parentElement ?? el)
    ;(el as HTMLElement & { __revealXObserver?: IntersectionObserver }).__revealXObserver = observer
  },
  unmounted(el) {
    const holder = el as HTMLElement & { __revealXObserver?: IntersectionObserver }
    holder.__revealXObserver?.disconnect()
    delete holder.__revealXObserver
  }
}

export default vReveal
