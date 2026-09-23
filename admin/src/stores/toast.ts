import { defineStore } from 'pinia'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

let seq = 0

/** 轻提示：成功=绿、错误=红、信息=中性（§7.1） */
export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastItem[]
  }),
  actions: {
    push(kind: ToastKind, text: string, duration = 2600): void {
      const id = ++seq
      this.items.push({ id, kind, text })
      window.setTimeout(() => this.remove(id), duration)
    },
    success(text: string): void {
      this.push('success', text)
    },
    error(text: string): void {
      this.push('error', text)
    },
    info(text: string): void {
      this.push('info', text)
    },
    remove(id: number): void {
      this.items = this.items.filter((t) => t.id !== id)
    }
  }
})
