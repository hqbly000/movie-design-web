<script setup lang="ts">
/** 移动端底部 Tab（高 64，白色 + 上边框 + 安全区，§4.4） */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MOBILE_TABS } from './nav'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const currentName = computed(() => String(route.name ?? ''))
</script>

<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-30 h-tabbar bg-ad-surface border-t border-ad-border-strong flex items-stretch safe-bottom"
  >
    <RouterLink
      v-for="tab in MOBILE_TABS"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
      :class="currentName === tab.name ? 'text-accent' : 'text-ad-text-4'"
    >
      <AppIcon :name="tab.icon" :size="20" />
      <span class="text-[11px]">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>
