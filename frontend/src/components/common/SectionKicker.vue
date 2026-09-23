<script setup lang="ts">
/**
 * SectionKicker —— 金色小标签（§2.3 / §2.7）。
 * 可选前置 44×1 金色短线（首屏 kicker 使用）。
 */
withDefaults(
  defineProps<{
    /** 文案，如「ABOUT · 关于我们」 */
    text: string
    /** 字号（px） */
    size?: number
    /** 是否显示前置金线 */
    line?: boolean
    /** 字距（px） */
    tracking?: number
  }>(),
  { size: 13, line: false, tracking: 5 }
)
</script>

<template>
  <div class="flex items-center gap-3">
    <span
      v-if="line"
      class="inline-block bg-accent-gold"
      style="width: 44px; height: 1px"
      aria-hidden="true"
    />
    <span
      class="font-sans text-accent-gold"
      :style="{ fontSize: `${size}px`, letterSpacing: `${tracking}px` }"
    >
      {{ text }}
    </span>
  </div>
</template>
