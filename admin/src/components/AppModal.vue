<script setup lang="ts">
/**
 * 通用弹框：圆角 16 + 柔和投影，遮罩 45%（可选 50%），Esc 关闭，移动端可全屏（slide-up）。
 */
import { computed, onBeforeUnmount, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    subtitle?: string
    width?: number
    overlayOpacity?: number
    zIndex?: number
    showClose?: boolean
    closeOnOverlay?: boolean
    mobileFullscreen?: boolean
    bodyPadding?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    width: 560,
    overlayOpacity: 0.45,
    zIndex: 1000,
    showClose: true,
    closeOnOverlay: true,
    mobileFullscreen: false,
    bodyPadding: true
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'close'): void }>()

const panelStyle = computed(() => ({ width: `${props.width}px`, maxWidth: 'calc(100vw - 32px)' }))

function close(): void {
  emit('update:modelValue', false)
  emit('close')
}
function onOverlay(): void {
  if (props.closeOnOverlay) close()
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="ad-fade">
      <div v-if="modelValue" class="fixed inset-0" :style="{ zIndex }">
        <div
          class="absolute inset-0"
          :style="{ background: `rgba(0,0,0,${overlayOpacity})` }"
          @click="onOverlay"
        />
        <div
          class="ad-modal-panel absolute left-1/2 top-1/2 bg-ad-surface rounded-modal shadow-modal-soft flex flex-col max-h-[calc(100vh-64px)]"
          :class="{ 'is-mobile-full': mobileFullscreen }"
          :style="panelStyle"
          role="dialog"
          aria-modal="true"
        >
          <header v-if="title || showClose" class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 shrink-0">
            <div class="min-w-0">
              <h3 class="text-[17px] font-semibold text-ad-text">{{ title }}</h3>
              <p v-if="subtitle" class="text-[12px] text-ad-text-3 mt-1">{{ subtitle }}</p>
            </div>
            <button v-if="showClose" type="button" class="ad-icon-btn" aria-label="关闭" @click="close">
              <AppIcon name="close" :size="18" />
            </button>
          </header>
          <div class="overflow-y-auto flex-1" :class="bodyPadding ? 'px-6 pb-5' : ''">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="shrink-0 px-6 py-4 border-t border-ad-border flex items-center justify-between gap-3"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.ad-fade-enter-active,
.ad-fade-leave-active {
  transition: opacity 160ms ease;
}
.ad-fade-enter-from,
.ad-fade-leave-to {
  opacity: 0;
}
.ad-modal-panel {
  animation: ad-pop-in 200ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}
@keyframes ad-pop-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
@media (max-width: 767px) {
  .ad-modal-panel.is-mobile-full {
    left: 0;
    top: 0;
    width: 100vw !important;
    max-width: none;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    animation: ad-slide-up 240ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }
}
@keyframes ad-slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
