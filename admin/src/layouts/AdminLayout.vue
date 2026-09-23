<script setup lang="ts">
/** 后台框架：桌面侧栏 + 顶栏 + 内容区；移动端底部 Tab + 卡片流 */
import { RouterView } from 'vue-router'
import SideBar from './SideBar.vue'
import TopBar from './TopBar.vue'
import MobileTabBar from './MobileTabBar.vue'
import Toaster from '@/components/Toaster.vue'
import ConfirmHost from '@/components/ConfirmHost.vue'
</script>

<template>
  <div class="min-h-screen bg-bg-page">
    <SideBar class="hidden md:flex" />
    <div class="md:ml-sidebar flex flex-col min-h-screen">
      <TopBar />
      <main class="flex-1 px-5 md:px-8 py-5 md:py-8 pb-[88px] md:pb-10">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>
    <MobileTabBar class="md:hidden" />
    <Toaster />
    <ConfirmHost />
  </div>
</template>
