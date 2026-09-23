<script setup lang="ts">
/** 分页：`共 N 条 · 每页 M 条` + 页码（§5.2） */
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    total: number
    page: number
    size?: number
  }>(),
  { size: 10 }
)
const emit = defineEmits<{ (e: 'update:page', value: number): void }>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.size)))
const canPrev = computed(() => props.page > 1)
const canNext = computed(() => props.page < pageCount.value)

/** 最多展示 5 个页码，含首尾与省略 */
const pages = computed<(number | '...')[]>(() => {
  const count = pageCount.value
  const cur = props.page
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const list: (number | '...')[] = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(count - 1, cur + 1)
  if (start > 2) list.push('...')
  for (let i = start; i <= end; i++) list.push(i)
  if (end < count - 1) list.push('...')
  list.push(count)
  return list
})

function go(p: number): void {
  if (p < 1 || p > pageCount.value || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <div class="flex items-center justify-between gap-4 px-4 py-3 border-t border-ad-border bg-ad-surface">
    <p class="text-[12px] text-ad-text-3 shrink-0">共 {{ total }} 条 · 每页 {{ size }} 条</p>
    <div class="flex items-center gap-1">
      <button class="ad-page-btn" :disabled="!canPrev" aria-label="上一页" @click="go(page - 1)">
        <AppIcon name="chevronDown" :size="16" class="rotate-90" />
      </button>
      <template v-for="(p, i) in pages" :key="`${p}-${i}`">
        <span v-if="p === '...'" class="px-1 text-ad-text-4 text-[13px]">…</span>
        <button
          v-else
          class="ad-page-btn"
          :class="{ 'is-active': p === page }"
          @click="go(p as number)"
        >
          {{ p }}
        </button>
      </template>
      <button class="ad-page-btn" :disabled="!canNext" aria-label="下一页" @click="go(page + 1)">
        <AppIcon name="chevronDown" :size="16" class="-rotate-90" />
      </button>
    </div>
  </div>
</template>
