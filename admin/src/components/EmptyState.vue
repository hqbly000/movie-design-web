<script setup lang="ts">
/** 空状态（§7.1）：文案 + 主操作入口 */
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    title?: string
    hint?: string
    compact?: boolean
  }>(),
  { icon: 'layers', title: '暂无数据', hint: '', compact: false }
)
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="compact ? 'py-10' : 'py-16'">
    <div class="w-12 h-12 rounded-full bg-ad-fill flex items-center justify-center text-ad-text-4 mb-3">
      <AppIcon :name="icon" :size="22" />
    </div>
    <p class="text-[14px] font-medium text-ad-text-2">{{ title }}</p>
    <p v-if="hint" class="text-[12px] text-ad-text-3 mt-1">{{ hint }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
