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
  /**
   * 交互暂停后，指针静止多少毫秒自动恢复轮播（0 = 不自动恢复，默认 0）。
   *
   * 首屏这类**全屏铺满视口**的轮播必须开启此项：PC 上指针几乎永远落在区域内，
   * 只靠 `mouseleave` 恢复会退化成"永久暂停"（表现为 PC 端不自动轮播，移动端正常）。
   */
  idleResume?: number
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
  /** 指针在区域内移动：暂停并重置"静止自动恢复"计时。 */
  onPointerMove: () => void
}

export function useAutoRotate(options: UseAutoRotateOptions): UseAutoRotateReturn {
  const { interval = 6000, pauseOnHover = true, idleResume = 0 } = options
  const activeIndex = ref(0)
  const isPaused = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let lastMoveTs = 0

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
    clearIdle()
  }

  function play(): void {
    stop()
    if (size() <= 1) return
    timer = setInterval(() => {
      if (!isPaused.value) next()
    }, interval)
  }

  /** 清掉"静止自动恢复"计时。 */
  function clearIdle(): void {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  /** 指针静止 idleResume 毫秒后自动恢复轮播。 */
  function scheduleIdleResume(): void {
    if (idleResume <= 0) return
    clearIdle()
    idleTimer = setTimeout(() => {
      idleTimer = null
      isPaused.value = false
    }, idleResume)
  }

  function pause(): void {
    isPaused.value = true
    scheduleIdleResume()
  }

  function resume(): void {
    clearIdle()
    isPaused.value = false
  }

  function onHoverStart(): void {
    if (pauseOnHover) pause()
  }

  function onHoverEnd(): void {
    if (pauseOnHover) resume()
  }

  /** 指针移动（节流 400ms）：暂停 + 重置静止计时，避免高频重建定时器。 */
  function onPointerMove(): void {
    if (!pauseOnHover) return
    const now = Date.now()
    if (now - lastMoveTs < 400) return
    lastMoveTs = now
    pause()
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
    onHoverEnd,
    onPointerMove
  }
}

export default useAutoRotate
