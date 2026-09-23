/**
 * Ken Burns 缓慢缩放（§6.1 / §10）。
 * 切换时重置 scale 1.0，再于下一帧放大到 1.08，与停留时长同步。
 */

import { onScopeDispose, ref, type Ref } from 'vue'

export interface UseKenBurnsReturn {
  /** 是否处于放大态。 */
  zooming: Ref<boolean>
  /** 目标缩放值。 */
  scale: number
  /** 动画时长（毫秒）。 */
  duration: number
  /** 重启动画（切回该张时调用）。 */
  restart: () => void
  /** 重置为 1.0。 */
  reset: () => void
}

/**
 * @param durationMs 与停留时长同步，默认 6000
 * @param targetScale 放大目标，默认 1.08
 */
export function useKenBurns(durationMs = 6000, targetScale = 1.08): UseKenBurnsReturn {
  const zooming = ref(false)
  let rafId = 0
  let rafId2 = 0

  function restart(): void {
    cancelAnimationFrame(rafId)
    cancelAnimationFrame(rafId2)
    zooming.value = false
    // 双 rAF 确保 transform 从 1.0 重新起跳
    rafId = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        zooming.value = true
      })
    })
  }

  function reset(): void {
    cancelAnimationFrame(rafId)
    cancelAnimationFrame(rafId2)
    zooming.value = false
  }

  onScopeDispose(() => {
    cancelAnimationFrame(rafId)
    cancelAnimationFrame(rafId2)
  })

  return { zooming, scale: targetScale, duration: durationMs, restart, reset }
}

export default useKenBurns
