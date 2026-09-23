<script setup lang="ts">
/**
 * ShareExpired —— 链接失效页（R18 / §3.4）。
 * 中央「链接已失效」+ 说明 + 下方品牌 logo；**不提供自助重新申请入口**。
 */
import AppIcon from '@/components/common/AppIcon.vue'
</script>

<template>
  <div
    class="mx-auto flex min-h-[68vh] w-full max-w-[520px] flex-col items-center justify-center gap-5 px-8 text-center"
  >
    <h1 class="font-serif text-[26px] text-txt-primary">链接已失效</h1>
    <p class="font-sans text-[13px] leading-6 text-white/70">
      该预览链接已到期或被关闭，请联系摄影师重新获取
    </p>
    <div class="mt-6 flex items-center gap-3">
      <AppIcon name="aperture" :size="26" class="text-accent-gold" />
      <span
        class="font-serif text-[16px] font-semibold text-white/80"
        style="letter-spacing: 5px"
        >光屿摄影</span
      >
    </div>
  </div>
</template>
