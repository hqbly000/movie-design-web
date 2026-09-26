<script setup lang="ts">
/**
 * MobileMenu —— 全屏深色面板菜单（§2.1 / §8）。
 * 项纵向排列；`Esc` 关闭；打开时由 DefaultLayout 锁定 body 滚动。
 */
import { useEventListener } from '@vueuse/core'
import AppIcon from '@/components/common/AppIcon.vue'
import { useUiStore } from '@/stores/ui'
import { NAV_ITEMS, scrollToId } from '@/utils/scroll'

const ui = useUiStore()

function close(): void {
  ui.closeMobileMenu()
}

function goTo(target: string): void {
  close()
  // 等面板关闭、滚动解锁后再滚动，避免锁定态下滚动失效
  window.setTimeout(() => scrollToId(target), 60)
}

useEventListener(window, 'keydown', (ev: KeyboardEvent) => {
  if (ev.key === 'Escape' && ui.mobileMenuOpen) {
    close()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-[250ms]"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="ui.mobileMenuOpen"
        class="fixed inset-0 z-[70] flex flex-col bg-[#0A0A0A] lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
      >
        <div class="ly-container flex h-[68px] items-center justify-between">
          <img
            src="/images/logo-on-dark.png"
            alt="交点影视"
            class="h-7 w-auto"
            width="1200"
            height="259"
          />
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center text-white"
            aria-label="关闭菜单"
            @click="close"
          >
            <AppIcon name="close" :size="24" />
          </button>
        </div>

        <nav class="mt-6 flex flex-col px-6" aria-label="移动端导航">
          <button
            v-for="(item, index) in NAV_ITEMS"
            :key="item.target"
            type="button"
            class="flex min-h-[56px] items-center justify-between border-b border-border-hairline py-4 text-left"
            @click="goTo(item.target)"
          >
            <span class="font-serif text-[22px] text-txt-primary">{{ item.label }}</span>
            <span class="font-latin text-[12px] text-white/40">
              0{{ index + 1 }}
            </span>
          </button>
        </nav>

        <div class="mt-auto px-6 pb-10">
          <p class="font-latin text-[10px] text-white/40" style="letter-spacing: 4px">
            JIAO DIAN FILM AND TELEVISION
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
