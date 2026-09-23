<script setup lang="ts">
/**
 * SiteHeader —— 顶部导航（R1 / §2.1）。
 * 首屏内透明底；滚动超过首屏高度后转 rgba(10,10,10,.85) + 背景模糊。
 * 桌面横排导航；移动端汉堡按钮 + 全屏面板。
 */
import { onMounted, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import AppIcon from '@/components/common/AppIcon.vue'
import MobileMenu from '@/components/layout/MobileMenu.vue'
import { useUiStore } from '@/stores/ui'
import { NAV_ITEMS, scrollToId } from '@/utils/scroll'

const ui = useUiStore()

/** 是否已滚过首屏（切换为毛玻璃底）。 */
const isSolid = ref(false)
/** 当前高亮的导航目标 id。 */
const activeId = ref<string>(NAV_ITEMS[0]?.target ?? 'hero')

const NAV_TARGETS = NAV_ITEMS.map((item) => item.target)

/** 汇总滚动状态：毛玻璃 + 当前区块高亮。 */
function syncScrollState(): void {
  const offsetY = window.scrollY || window.pageYOffset || 0
  isSolid.value = offsetY > window.innerHeight * 0.8

  let current = NAV_TARGETS[0] ?? 'hero'
  for (const id of NAV_TARGETS) {
    const el = document.getElementById(id)
    if (!el) continue
    if (el.getBoundingClientRect().top <= 140) {
      current = id
    }
  }
  activeId.value = current
}

function goTo(target: string): void {
  scrollToId(target)
}

function goHome(): void {
  scrollToId(NAV_TARGETS[0] ?? 'hero')
}

useEventListener(window, 'scroll', syncScrollState, { passive: true })
useEventListener(window, 'resize', syncScrollState, { passive: true })

onMounted(syncScrollState)
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
    :class="isSolid ? 'bg-[rgba(10,10,10,0.85)] backdrop-blur-md' : 'bg-transparent'"
  >
    <div
      class="ly-container flex h-[68px] items-center justify-between lg:h-24"
    >
      <!-- 品牌 -->
      <button
        type="button"
        class="flex items-center gap-3 text-left"
        aria-label="光屿摄影 首页"
        @click="goHome"
      >
        <AppIcon name="aperture" :size="26" class="text-accent-gold" />
        <span class="flex flex-col leading-none">
          <span
            class="font-serif text-[17px] font-semibold text-txt-primary lg:text-[22px]"
            style="letter-spacing: 6px"
            >光屿摄影</span
          >
          <span
            class="mt-1 font-latin text-[9px] text-accent-gold lg:text-[10px]"
            style="letter-spacing: 4px"
            >LIGHT ISLE STUDIO</span
          >
        </span>
      </button>

      <!-- 桌面导航 -->
      <nav class="hidden items-center gap-8 lg:flex" aria-label="主导航">
        <button
          v-for="item in NAV_ITEMS"
          :key="item.target"
          type="button"
          class="group relative flex items-center gap-2 py-2 text-[15px] transition-colors"
          :class="
            activeId === item.target
              ? 'text-white'
              : 'text-white/80 hover:text-white'
          "
          @click="goTo(item.target)"
        >
          <span
            v-if="activeId === item.target"
            class="inline-block h-[5px] w-[5px] rounded-full bg-accent-gold"
            aria-hidden="true"
          />
          {{ item.label }}
        </button>
      </nav>

      <!-- 移动端汉堡（24×24，触摸目标 44×44） -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center text-white lg:hidden"
        aria-label="打开菜单"
        :aria-expanded="ui.mobileMenuOpen"
        @click="ui.openMobileMenu()"
      >
        <AppIcon name="menu" :size="24" :stroke-width="1.6" />
      </button>
    </div>

    <MobileMenu />
  </header>
</template>
