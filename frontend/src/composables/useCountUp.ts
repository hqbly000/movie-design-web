/**
 * 数字滚动计数（R5 / §10）：进入视口触发一次，700ms ease-out。
 */

import { onScopeDispose, ref, type Ref } from 'vue'

export interface UseCountUpReturn {
  /** 当前显示值。 */
  value: Ref<number>
  /** 触发计数（幂等，重复调用无效）。 */
  start: () => void
}

/**
 * 从 0 计数到目标值。
 * @param getTo 目标值 getter（延迟取值，避免数据异步到达时取到 0）
 * @param duration 时长毫秒，默认 700
 */
export function useCountUp(getTo: () => number, duration = 700): UseCountUpReturn {
  const value = ref(0)
  let rafId = 0
  let done = false

  function start(): void {
    if (done) return
    done = true

    const to = Math.max(0, Math.round(getTo()))
    if (to === 0) {
      value.value = 0
      return
    }

    const startedAt = performance.now()
    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      value.value = Math.round(to * eased)
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        value.value = to
      }
    }
    rafId = requestAnimationFrame(step)
  }

  onScopeDispose(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { value, start }
}

export default useCountUp
