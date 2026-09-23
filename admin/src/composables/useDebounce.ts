import { customRef, type Ref } from 'vue'

/** 防抖 ref：搜索框输入防抖（默认 300ms） */
export function useDebouncedRef<T>(initial: T, delay = 300): Ref<T> {
  let timer: number | undefined
  let value = initial
  return customRef<T>((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(next: T) {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        value = next
        trigger()
      }, delay)
    }
  }))
}
