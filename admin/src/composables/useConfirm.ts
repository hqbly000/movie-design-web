import { useUiStore, type ConfirmOptions } from '@/stores/ui'

/** 二次确认（关闭分发 / 删除视频与荣誉 / 切换状态等） */
export function useConfirm() {
  const ui = useUiStore()
  return {
    confirm: (opts?: ConfirmOptions): Promise<boolean> => ui.askConfirm(opts)
  }
}
