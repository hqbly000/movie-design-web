<script setup lang="ts">
/** 工作台统计卡（§5.1） */
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    label: string
    value: number | string
    sub?: string
    icon?: string
    tone?: 'default' | 'accent'
  }>(),
  { sub: '', icon: '', tone: 'default' }
)
</script>

<template>
  <div class="ad-card p-5">
    <div class="flex items-start justify-between">
      <p class="text-[13px] text-ad-text-3">{{ label }}</p>
      <span
        v-if="icon"
        class="w-8 h-8 rounded-full flex items-center justify-center"
        :class="tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-ad-fill text-ad-text-4'"
      >
        <AppIcon :name="icon" :size="16" />
      </span>
    </div>
    <p class="text-[30px] leading-none font-semibold text-ad-text mt-3">{{ value }}</p>
    <p v-if="sub" class="text-[12px] text-ad-text-3 mt-2">{{ sub }}</p>
  </div>
</template>
