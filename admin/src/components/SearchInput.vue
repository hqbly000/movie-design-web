<script setup lang="ts">
/**
 * 列表内搜索框（放大镜 + 可清空）。
 * 2026-09-23：顶栏全局搜索属无效装饰已删除，搜索改为按列表就近提供 ——
 * 视频库走后端 keyword（标题/BV），分发 / 留言 / 成员为本页前端过滤。
 * 使用 Tailwind 工具类 + ad-input，无动态拼接类名（防内容扫描清除）。
 */
import AppIcon from '@/components/AppIcon.vue'

withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** 视觉宽度（px） */
    width?: number
  }>(),
  { placeholder: '搜索…', width: 220 }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

function onInput(e: Event): void {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="relative shrink-0" :style="{ width: `${width}px` }">
    <AppIcon
      name="search"
      :size="15"
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ad-text-4"
    />
    <input
      class="ad-input !h-9 pl-9 pr-8"
      :value="modelValue"
      :placeholder="placeholder"
      type="search"
      :aria-label="placeholder"
      @input="onInput"
    />
    <button
      v-if="modelValue"
      type="button"
      class="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ad-text-4 transition-colors hover:bg-ad-fill hover:text-ad-text-2"
      aria-label="清空搜索"
      @click="emit('update:modelValue', '')"
    >
      <AppIcon name="close" :size="12" />
    </button>
  </div>
</template>
