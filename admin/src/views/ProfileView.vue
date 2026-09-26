<script setup lang="ts">
/** 我的（移动端底部 Tab 第五项）：账号信息 + 模块入口 + 退出登录 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NAV_ITEMS } from '@/layouts/nav'
import { ROLE_LABELS } from '@/utils/constants'
import { usePageHeader } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'

const auth = useAuthStore()
const router = useRouter()

usePageHeader('我的', '账号信息与功能入口')

const items = computed(() => NAV_ITEMS.filter((i) => !i.adminOnly || auth.isAdmin))
const roleLabel = computed(() => (auth.role ? ROLE_LABELS[auth.role] : ''))
const initials = computed(() => (auth.displayName || '交').slice(0, 1))

async function onLogout(): Promise<void> {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="ad-card p-5 flex items-center gap-3.5">
      <span class="ad-avatar !w-12 !h-12 !text-[16px]">{{ initials }}</span>
      <div class="min-w-0 flex-1">
        <p class="text-[16px] font-medium text-ad-text truncate">{{ auth.displayName || '—' }}</p>
        <p class="text-[12px] text-ad-text-4 truncate mt-0.5">{{ auth.user?.email }}</p>
      </div>
      <span class="ad-pill ad-pill-accent">{{ roleLabel }}</span>
    </div>

    <div class="ad-card overflow-hidden">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex items-center gap-3 px-5 h-14 border-b border-ad-border last:border-b-0 hover:bg-row-hover transition-colors"
      >
        <AppIcon :name="item.icon" :size="18" class="text-ad-text-3" />
        <span class="flex-1 text-[14px] text-ad-text">{{ item.label }}</span>
        <AppIcon name="chevronRight" :size="16" class="text-ad-text-4" />
      </RouterLink>
    </div>

    <button
      type="button"
      class="ad-card h-12 w-full flex items-center justify-center gap-2 text-[14px] text-[#c0392b] hover:bg-[#fdecea] transition-colors"
      @click="onLogout"
    >
      <AppIcon name="logout" :size="17" />
      退出登录
    </button>
  </div>
</template>
