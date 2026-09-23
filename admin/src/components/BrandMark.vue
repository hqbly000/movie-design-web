<script setup lang="ts">
/** 品牌光标 logo（金色光圈）。品牌金 #C49A4A 仅用于此处（§1.3 唯一暖色桥梁） */
withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <circle cx="20" cy="20" r="17" stroke="#C49A4A" stroke-width="1.6" />
    <circle cx="20" cy="20" r="11.5" stroke="#C49A4A" stroke-width="1.2" stroke-opacity="0.55" />
    <circle cx="20" cy="20" r="5.4" stroke="#C49A4A" stroke-width="1.4" />
    <circle cx="20" cy="20" r="1.7" fill="#C49A4A" />
  </svg>
</template>
