<script setup lang="ts">
/**
 * DefaultLayout —— 官网首页布局（architecture.md §5.1）。
 * 固定透明 Header 悬浮于首屏之上 + 内容 + 页脚；
 * 任一全屏层（移动菜单 / 作品页）打开时统一锁定 body 滚动。
 */
import { computed } from 'vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

/** 任一全屏层打开 → 锁定滚动（关闭后还原 scrollY，滚动位置不跳变）。 */
useBodyScrollLock(computed(() => ui.isScrollLocked))
</script>

<template>
  <div class="relative min-h-screen bg-bg-base">
    <SiteHeader />
    <main>
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
