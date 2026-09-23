<script setup lang="ts">
/**
 * 白卡内嵌表格（§4.3）。
 * 通过 `row` 作用域插槽渲染整行 <td>，列头由 columns 驱动。
 *
 * 响应式（R27 / §4.4）：≥768 用表格；<768 切换为「卡片流」，由 `mobileCard` 插槽渲染。
 * 关键实现点：用 JS 媒体查询**条件渲染**（而非 CSS 隐藏），
 * 确保移动端 DOM 中不残留 <table> 节点（否则窄屏仍会横向挤压）。
 */
import { useMediaQuery } from '@/composables/useMediaQuery'
import type { TableColumn } from '@/types/ui'

withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: unknown[]
    rowKey?: string
    minWidth?: string
  }>(),
  { rowKey: 'id', minWidth: '720px' }
)

/** 移动端断点与设计方案一致：< 768px */
const isMobile = useMediaQuery('(max-width: 767px)')

function keyOf(row: unknown, rowKey: string, index: number): string | number {
  const value = (row as Record<string, unknown>)[rowKey]
  return typeof value === 'string' || typeof value === 'number' ? value : index
}

/** 未提供 mobileCard 插槽时的通用兜底：按列头展示原始字段 */
function cellText(row: unknown, key: string): string {
  const value = (row as Record<string, unknown>)[key]
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return '—'
  return String(value)
}
</script>

<template>
  <div class="ad-card overflow-hidden">
    <!-- 桌面 / 平板（≥768）：表格 -->
    <div v-if="!isMobile" class="ad-scroll-x">
      <table class="w-full border-collapse" :style="{ minWidth }">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="ad-th"
              :style="{ width: col.width, textAlign: col.align ?? 'left' }"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="keyOf(row, rowKey, index)"
            class="ad-tbody-row"
          >
            <slot name="row" :row="row" :index="index" />
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="columns.length">
              <slot name="empty" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 移动（<768）：卡片流 -->
    <div v-else class="flex flex-col gap-3 p-3">
      <article
        v-for="(row, index) in rows"
        :key="keyOf(row, rowKey, index)"
        class="rounded-card border border-ad-border bg-ad-surface p-3.5"
      >
        <slot name="mobileCard" :row="row" :index="index">
          <dl class="flex flex-col gap-1.5">
            <div v-for="col in columns.filter((c) => c.label)" :key="col.key" class="flex gap-3">
              <dt class="w-20 shrink-0 text-[12px] text-ad-text-4">{{ col.label }}</dt>
              <dd class="min-w-0 text-[13px] text-ad-text break-words">{{ cellText(row, col.key) }}</dd>
            </div>
          </dl>
        </slot>
      </article>
      <div v-if="!rows.length" class="py-6">
        <slot name="empty" />
      </div>
    </div>

    <slot name="footer" />
  </div>
</template>
