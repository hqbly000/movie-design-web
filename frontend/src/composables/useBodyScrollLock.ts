/**
 * 全屏弹层时的 body 滚动锁（§7.3：关闭后滚动位置不跳变）。
 * 记录并还原 scrollY，同时补偿滚动条宽度避免横向抖动。
 */

import { nextTick, onScopeDispose, watch, type Ref } from 'vue'

export function useBodyScrollLock(locked: Ref<boolean>): void {
  let savedTop = 0
  let savedOverflow = ''
  let savedPaddingRight = ''
  let isLocked = false

  function lock(): void {
    if (isLocked) return
    savedTop = window.scrollY || document.documentElement.scrollTop || 0
    savedOverflow = document.body.style.overflow
    savedPaddingRight = document.body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    isLocked = true
  }

  function unlock(): void {
    if (!isLocked) return
    document.body.style.overflow = savedOverflow
    document.body.style.paddingRight = savedPaddingRight
    isLocked = false
    // 还原滚动位置，避免关闭弹层后页面跳回顶部
    window.scrollTo({ top: savedTop, left: 0, behavior: 'auto' })
  }

  watch(
    locked,
    (value) => {
      if (value) {
        lock()
      } else {
        // 等 DOM 更新后再还原，避免与弹层卸载竞态
        void nextTick(unlock)
      }
    },
    { immediate: true }
  )

  onScopeDispose(unlock)
}

export default useBodyScrollLock
