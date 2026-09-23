import { defineStore } from 'pinia'

export interface ConfirmOptions {
  title?: string
  text?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState extends Required<Omit<ConfirmOptions, 'text'>> {
  open: boolean
  text: string
}

/** 二次确认的 resolve 保存在模块作用域，避免把函数放进可序列化的 store state */
let pendingResolve: ((value: boolean) => void) | null = null

/** UI 共享态：页面标题/副行（顶栏显示）+ 二次确认 + 移动端导航 */
export const useUiStore = defineStore('ui', {
  state: () => ({
    pageTitle: '',
    pageSubtitle: '',
    confirm: {
      open: false,
      title: '确认操作',
      text: '',
      confirmText: '确认',
      cancelText: '取消',
      danger: false
    } as ConfirmState,
    mobileNavOpen: false
  }),
  actions: {
    setPage(title: string, subtitle = ''): void {
      this.pageTitle = title
      this.pageSubtitle = subtitle
    },
    askConfirm(opts: ConfirmOptions = {}): Promise<boolean> {
      return new Promise<boolean>((resolve) => {
        pendingResolve = resolve
        this.confirm = {
          open: true,
          title: opts.title ?? '确认操作',
          text: opts.text ?? '',
          confirmText: opts.confirmText ?? '确认',
          cancelText: opts.cancelText ?? '取消',
          danger: opts.danger ?? false
        }
      })
    },
    answerConfirm(value: boolean): void {
      this.confirm.open = false
      const resolve = pendingResolve
      pendingResolve = null
      resolve?.(value)
    }
  }
})
