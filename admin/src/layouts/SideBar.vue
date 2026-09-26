<script setup lang="ts">
/** 侧栏（桌面，固定 232）：品牌块 + 9 项导航 + 底部账号块 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAV_ITEMS } from './nav'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS } from '@/utils/constants'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const items = computed(() => NAV_ITEMS.filter((i) => !i.adminOnly || auth.isAdmin))
const currentName = computed(() => String(route.name ?? ''))
const roleLabel = computed(() => (auth.role ? ROLE_LABELS[auth.role] : ''))
const initials = computed(() => (auth.displayName || '交').slice(0, 1))

async function onLogout(): Promise<void> {
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <!-- 桌面侧栏：脱离文档流（fixed），避免占用 100vh 块流把主内容下推一屏；
       主内容容器用 md:ml-sidebar 预留左侧空间。scrollTop 时侧栏保持固定。 -->
  <aside class="w-sidebar shrink-0 h-screen fixed top-0 left-0 flex-col bg-ad-surface border-r border-ad-border-strong">
    <!-- 品牌块 -->
    <div class="flex items-center gap-3 px-5 h-topbar border-b border-ad-border-strong">
      <img
        src="/logo-on-light.png"
        alt="交点影视"
        class="h-6 w-auto"
        width="1200"
        height="259"
      />
      <span class="border-l border-ad-border-strong pl-3 text-[12px] leading-tight text-ad-text-3"
        >管理后台</span
      >
    </div>

    <!-- 导航 -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="{ name: item.name }"
        class="ad-nav-item"
        :class="{ 'is-active': currentName === item.name }"
      >
        <AppIcon :name="item.icon" :size="18" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- 账号块 -->
    <div class="px-3 py-3 border-t border-ad-border-strong">
      <div class="flex items-center gap-2.5 px-2 py-2">
        <span class="ad-avatar">{{ initials }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-medium text-ad-text truncate">{{ auth.displayName || '—' }}</p>
          <p class="text-[11px] text-ad-text-4">{{ roleLabel }}</p>
        </div>
        <button class="ad-icon-btn" type="button" title="退出登录" @click="onLogout">
          <AppIcon name="logout" :size="17" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.ad-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--ad-text-secondary);
  transition: background-color 150ms ease, color 150ms ease;
}
.ad-nav-item:hover {
  background: var(--ad-fill-control);
  color: var(--ad-text-primary);
}
.ad-nav-item.is-active {
  background: var(--ad-accent-soft);
  color: var(--ad-accent);
  font-weight: 500;
}
</style>
