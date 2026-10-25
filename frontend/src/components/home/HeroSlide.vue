<script setup lang="ts">
/**
 * HeroSlide —— 首屏单张图（R2 / R3 / §2.2）。
 * 全屏独占一层；Ken Burns 缓慢缩放。文案只有一套，由 `HeroCarousel` 统一渲染。
 *
 * 加载策略（2026-10-25 首访提速）：
 * - 只有 `load=true` 的这张才挂 `<img>`，避免三张 ~2MB 大图同时抢带宽；
 * - 优先取同名 `.webp`（q85，体积约为 PNG 的 1/15），不支持则回退 PNG；
 * - `priority` 只给第一张，配合 `fetchpriority=high` 抢首屏 LCP。
 */
import { onMounted, ref, watch } from 'vue'
import { useKenBurns } from '@/composables/useKenBurns'
import ImagePlaceholder from '@/components/common/ImagePlaceholder.vue'
import SmartImage from '@/components/common/SmartImage.vue'
import { assetUrl } from '@/utils/asset'
import type { HeroSlide } from '@/types/site'

const props = withDefaults(
  defineProps<{
    /** 轮播数据 */
    slide: HeroSlide
    /** 是否为当前张 */
    active: boolean
    /** 是否该加载这张图（当前图 / 预取图） */
    load?: boolean
    /** 首屏首张：最高优先级 */
    priority?: boolean
  }>(),
  { load: false, priority: false }
)

/** Ken Burns 动画与切换时长同步（6s）。 */
const { zooming, scale, duration, restart, reset } = useKenBurns(6000, 1.08)

/** 图片是否已加载。 */
const imageLoaded = ref(false)

watch(
  () => props.active,
  (isActive) => {
    if (isActive) restart()
    else reset()
  }
)

onMounted(() => {
  if (props.active) restart()
})

/** Ken Burns 内联样式。 */
function imageStyle(): Record<string, string> {
  return {
    transform: `scale(${zooming.value ? scale : 1})`,
    transition: `transform ${duration}ms linear`
  }
}
</script>

<template>
  <div
    class="absolute inset-0 overflow-hidden transition-opacity duration-500 ease-out"
    :class="active ? 'z-[1] opacity-100' : 'z-0 opacity-0'"
    :aria-hidden="!active"
  >
    <SmartImage
      v-if="load"
      :src="assetUrl(slide.image_url)"
      alt="首屏轮播图"
      class="h-full w-full object-cover will-change-transform"
      :style="imageStyle()"
      :fetchpriority="priority ? 'high' : 'low'"
      decoding="async"
      draggable="false"
      @load="imageLoaded = true"
      @error="imageLoaded = true"
    />
    <ImagePlaceholder :active="!imageLoaded" />

    <!-- 暗角渐变遮罩：顶部 62% → 中部 15% → 底部 55% -->
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.62) 0%,
          rgba(0, 0, 0, 0.15) 48%,
          rgba(0, 0, 0, 0.55) 100%
        );
      "
      aria-hidden="true"
    />
  </div>
</template>
