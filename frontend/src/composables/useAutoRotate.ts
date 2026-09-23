/**
 * 通用自动轮播 / 自动旋转（architecture.md §6.1 / §6.2）。
 * interval + 悬停暂停 + 手动定位；供首屏轮播与荣誉展厅复用。
 */

import { onScopeDispose, ref, watch, type Ref } from 'vue'

export interface UseAutoRotateOptions {
  /** 切换间隔毫秒，默认 6000。 */
  interval?: number
  /** 条目总数 getter（可能异步变化）。 */
  count: () => number
  /** 是否悬停暂停，默认 true。 */
  pauseOnHover?: boolean
}

export interface UseAutoRotateReturn {
  /** 当前索引。 */
  activeIndex: Ref<number>
  /** 是否处于暂停态。 */
  isPaused: Ref<boolean>
  /** 定位到指定索引（自动取模）。 */
  setActive: (index: number) => void
  /** 下一条。 */
  next: () => void
  /** 上一条。 */
  prev: () => void
  /** 启动计时器。 */
  play: () => void
  /** 停止计时器。 */
  stop: () => void
  /** 暂停（不停止计时器）。 */
  pause: () => void
  /** 恢复。 */
  resume: () => void
  /** 悬停进入处理。 */
  onHoverStart: () => void
  /** 悬停离开处理。 */
  onHoverEnd: () => void
}

export function useAutoRotate(options: UseAutoRotateOptions): UseAutoRotateReturn {
  const { interval = 6000, pauseOnHover = true } = options
  const activeIndex = ref(0)
  const isPaused = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const size = (): number => Math.max(1, options.count())

  function setActive(index: number): void {
    const total = size()
    activeIndex.value = ((index % total) + total) % total
  }

  function next(): void {
    setActive(activeIndex.value + 1)
  }

  function prev(): void {
    setActive(activeIndex.value - 1)
  }

  function stop(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function play(): void {
    stop()
    if (size() <= 1) return
    timer = setInterval(() => {
      if (!isPaused.value) next()
    }, interval)
  }

  function pause(): void {
    isPaused.value = true
  }

  function resume(): void {
    isPaused.value = false
  }

  function onHoverStart(): void {
    if (pauseOnHover) pause()
  }

  function onHoverEnd(): void {
    if (pauseOnHover) resume()
  }

  // 条目数变化时重置计时并夹紧索引
  watch(
    () => options.count(),
    (total) => {
      activeIndex.value = Math.min(activeIndex.value, Math.max(0, total - 1))
      play()
    }
  )

  onScopeDispose(stop)

  return {
    activeIndex,
    isPaused,
    setActive,
    next,
    prev,
    play,
    stop,
    pause,
    resume,
    onHoverStart,
    onHoverEnd
  }
}

export default useAutoRotate
