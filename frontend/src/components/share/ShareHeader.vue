<script setup lang="ts">
/**
 * ShareHeader —— 分享页品牌顶栏（§3.2-1）。
 * 高 68，仅左侧 logo + 「光屿摄影」；**无分享入口**（R16）。
 */
import AppIcon from '@/components/common/AppIcon.vue'
</script>

<template>
  <header class="w-full border-b border-border-hairline bg-[#0A0A0A]">
    <div class="mx-auto flex h-[68px] w-full max-w-[520px] items-center gap-3 px-6">
      <AppIcon name="aperture" :size="24" class="text-accent-gold" />
      <span
        class="font-serif text-[17px] font-semibold text-txt-primary"
        style="letter-spacing: 5px"
        >光屿摄影</span
      >
      <span
        class="ml-auto font-latin text-[9px] text-white/40"
        style="letter-spacing: 3px"
        >LIGHT ISLE STUDIO</span
      >
    </div>
  </header>
</template>
