import { onMounted, onUnmounted, watchEffect, type Ref, type ComputedRef } from 'vue'
import { useUiStore } from '@/stores/ui'

type TextSource = string | Ref<string> | ComputedRef<string>

function read(source: TextSource): string {
  return typeof source === 'string' ? source : source.value
}

/**
 * 设置顶栏的页面标题与副行（副行常为动态统计文案）。
 * 视图挂载时调用即可；源变化时自动同步。
 */
export function usePageHeader(title: string, subtitle: TextSource = '', _searchPlaceholder = ''): void {
  const ui = useUiStore()
  const stop = watchEffect(() => {
    ui.setPage(title, read(subtitle))
  })
  onMounted(() => {
    ui.setPage(title, read(subtitle))
  })
  onUnmounted(() => stop())
}
