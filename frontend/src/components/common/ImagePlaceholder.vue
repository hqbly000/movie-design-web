<script setup lang="ts">
/**
 * ImagePlaceholder —— 图片加载占位骨架（§7.1 加载中）。
 * 绝对铺满父容器，父容器需 position: relative。
 */
withDefaults(
  defineProps<{
    /** 是否显示（加载中为 true） */
    active?: boolean
    /** 是否加微光动画 */
    pulse?: boolean
  }>(),
  { active: true, pulse: true }
)
</script>

<template>
  <div
    v-if="active"
    class="pointer-events-none absolute inset-0 z-[1] bg-surface"
    :class="pulse ? 'animate-pulse' : ''"
    aria-hidden="true"
  />
</template>
