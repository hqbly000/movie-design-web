<script setup lang="ts">
/**
 * GalleryBody —— 图片集内容体（content_type=gallery）。
 * 三列错落网格（按 assets 宽高比），点击进入灯箱；灯箱内 ←/→ 翻页、
 * Esc 关灯箱（capture 阶段拦截并 stopPropagation，避免同时关闭外层遮罩）。
 */
import { computed, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import AppIcon from '@/components/common/AppIcon.vue'
import ImagePlaceholder from '@/components/common/ImagePlaceholder.vue'
import { assetUrl } from '@/utils/asset'
import { pad2 } from '@/utils/format'
import type { SegmentImage } from '@/types/site'

const props = defineProps<{
  /** 图集列表（按 segment_items.sort） */
  images: SegmentImage[]
}>()

const lightboxOpen = ref(false)
const activeIndex = ref(0)

/** 当前大图。 */
const current = computed<SegmentImage | null>(() => props.images[activeIndex.value] ?? null)

function openLightbox(index: number): void {
  activeIndex.value = index
  lightboxOpen.value = true
}

function closeLightbox(): void {
  lightboxOpen.value = false
}

/** 环状翻页。 */
function go(index: number): void {
  const count = props.images.length
  if (count === 0) return
  activeIndex.value = ((index % count) + count) % count
}

useEventListener(
  window,
  'keydown',
  (event: KeyboardEvent) => {
    if (!lightboxOpen.value) return
    if (event.key === 'Escape') {
      event.stopPropagation()
      closeLightbox()
    } else if (event.key === 'ArrowLeft') {
      event.stopPropagation()
      go(activeIndex.value - 1)
    } else if (event.key === 'ArrowRight') {
      event.stopPropagation()
      go(activeIndex.value + 1)
    }
  },
  { capture: true }
)
</script>

<template>
  <div>
    <!-- 错落网格：宽高比取自 assets（width/height），缺省 4:3 -->
    <div v-if="images.length" class="columns-1 gap-[14px] sm:columns-2 lg:columns-3">
      <button
        v-for="(img, index) in images"
        :key="img.id"
        type="button"
        class="group relative mb-[14px] block w-full overflow-hidden rounded-[2px] border border-white/10 bg-surface"
        :style="{ aspectRatio: img.width && img.height ? `${img.width} / ${img.height}` : '4 / 3' }"
        :aria-label="`查看第 ${index + 1} 张大图`"
        @click="openLightbox(index)"
      >
        <img
          :src="assetUrl(img.url)"
          alt=""
          class="h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.035]"
          loading="lazy"
          draggable="false"
        />
      </button>
    </div>
    <ImagePlaceholder v-else :active="true" class="aspect-[4/3] w-full" />

    <!-- 灯箱 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out-soft"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="lightboxOpen"
          class="fixed inset-0 z-[1200] flex flex-col items-center justify-center gap-5 bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="图片大图浏览"
          @click.self="closeLightbox"
        >
          <img
            v-if="current"
            :src="assetUrl(current.url)"
            alt=""
            class="max-h-[76vh] max-w-[86vw] rounded-[2px] border border-[rgba(196,154,74,0.25)]"
            draggable="false"
          />
          <div class="flex items-center gap-6">
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
              aria-label="上一张"
              @click="go(activeIndex - 1)"
            >
              <AppIcon name="arrow-left" :size="18" />
            </button>
            <span class="font-latin text-[13px] text-accent-gold" style="letter-spacing: 3px">
              {{ pad2(activeIndex + 1) }} / {{ pad2(images.length) }}
            </span>
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
              aria-label="下一张"
              @click="go(activeIndex + 1)"
            >
              <AppIcon name="arrow-right" :size="18" />
            </button>
          </div>
          <button
            type="button"
            class="absolute right-6 top-7 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="关闭大图（Esc）"
            @click="closeLightbox"
          >
            <AppIcon name="close" :size="20" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
