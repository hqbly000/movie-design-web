<script setup lang="ts">
/**
 * DetailOverlay —— 二级页通用遮罩外壳（一套壳 + 多种内容体）。
 * fixed inset-0 + 容器内滚动；body 滚动锁由 DefaultLayout 统一处理；
 * Esc 关闭；板块切换时由父级调用 scrollToTop 回到顶部。
 * 内容体（视频集 / 图片集 / 图文 / 公司页）经默认插槽装入。
 */
import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps<{
  /** 是否打开 */
  open: boolean
  /** 顶栏 kicker，如 `PORTRAIT · 人像写真` */
  kicker: string
  /** 主标题（板块名 / 公司名） */
  title: string
  /** 标题旁类型 chip（视频集 / 图片集 / 图文介绍） */
  chip?: string
  /** 标题下的拉丁字母注记（公司页英文名） */
  caption?: string
  /** 类型与数量说明行 */
  meta?: string
  /** 无障碍标签（dialog aria-label） */
  dialogLabel: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const scrollRef = ref<HTMLElement | null>(null)

/** 滚动容器回到顶部（切换板块时调用）。 */
function scrollToTop(): void {
  scrollRef.value?.scrollTo({ top: 0 })
}
defineExpose({ scrollToTop })

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (props.open && event.key === 'Escape') emit('close')
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out-soft"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        ref="scrollRef"
        class="fixed inset-0 z-[90] overflow-y-auto bg-[#050505]"
        role="dialog"
        aria-modal="true"
        :aria-label="dialogLabel"
      >
        <!-- 顶栏 -->
        <header class="ly-container flex items-start justify-between gap-6 pt-8 lg:pt-10">
          <div>
            <p class="font-sans text-[12px] text-accent-gold" style="letter-spacing: 4px">
              {{ kicker }}
            </p>
            <div class="mt-2 flex items-center gap-4">
              <h2 class="font-serif text-[24px] leading-tight text-txt-primary lg:text-[28px]">
                {{ title }}
              </h2>
              <span
                v-if="chip"
                class="shrink-0 rounded-full border border-[rgba(196,154,74,0.45)] px-3 py-[3px] font-sans text-[11px] text-hl-gold"
                style="letter-spacing: 2px"
              >
                {{ chip }}
              </span>
            </div>
            <p
              v-if="caption"
              class="mt-2 font-latin text-[13px] text-white/40"
              style="letter-spacing: 6px"
            >
              {{ caption }}
            </p>
            <p v-if="meta" class="mt-2 font-sans text-[12px] text-white/40">{{ meta }}</p>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="关闭（Esc）"
            @click="emit('close')"
          >
            <AppIcon name="close" :size="20" />
          </button>
        </header>

        <!-- 内容体 -->
        <div class="ly-container pb-4 pt-7 lg:pt-9">
          <slot />
        </div>

        <!-- 底部提示 -->
        <div v-if="$slots.hint" class="ly-container pb-10 pt-6 text-center">
          <slot name="hint" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
