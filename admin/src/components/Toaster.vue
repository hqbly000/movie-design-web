<script setup lang="ts">
/** 轻提示容器：成功绿 / 错误红 / 信息中性（§7.1） */
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'
import AppIcon from './AppIcon.vue'

const store = useToastStore()
const { items } = storeToRefs(store)

const ICON: Record<string, string> = { success: 'check', error: 'close', info: 'info' }
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] flex flex-col items-center gap-2 pointer-events-none">
      <TransitionGroup name="ad-toast">
        <div
          v-for="t in items"
          :key="t.id"
          class="flex items-center gap-2 h-9 px-3.5 rounded-ctrl text-[13px] font-medium shadow-modal-soft"
          :class="{
            'bg-ok-bg text-ok-text': t.kind === 'success',
            'bg-[#FDECEA] text-[#C0392B]': t.kind === 'error',
            'bg-[#1D1D1F] text-white': t.kind === 'info'
          }"
        >
          <AppIcon :name="ICON[t.kind]" :size="15" />
          <span>{{ t.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style>
.ad-toast-enter-active,
.ad-toast-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.ad-toast-enter-from,
.ad-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
