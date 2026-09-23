<script setup lang="ts">
/**
 * HeroSlide —— 首屏单张图（R2 / R3 / §2.2）。
 * 全屏独占一层；Ken Burns 缓慢缩放；标语随图淡入上移（12px / 400ms）。
 */
import { onMounted, ref, watch } from 'vue'
import { useKenBurns } from '@/composables/useKenBurns'
import SectionKicker from '@/components/common/SectionKicker.vue'
import ImagePlaceholder from '@/components/common/ImagePlaceholder.vue'
import { assetUrl } from '@/utils/asset'
import type { HeroSlide } from '@/types/site'

const props = defineProps<{
  /** 轮播数据 */
  slide: HeroSlide
  /** 是否为当前张 */
  active: boolean
}>()

/** Ken Burns 动画与切换时长同步（6s）。 */
const { zooming, scale, duration, restart, reset } = useKenBurns(6000, 1.08)

/** 用于重放文案动画的 key。 */
const animKey = ref(0)
/** 图片是否已加载。 */
const imageLoaded = ref(false)

watch(
  () => props.active,
  (isActive) => {
    if (isActive) {
      animKey.value += 1
      restart()
    } else {
      reset()
    }
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
    <img
      :src="assetUrl(slide.image_url)"
      :alt="slide.slogan"
      class="h-full w-full object-cover will-change-transform"
      :style="imageStyle()"
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

    <!-- 文案区 -->
    <div class="absolute inset-0 z-[2]">
      <div class="ly-container flex h-full flex-col">
        <div :key="animKey" class="pt-[310px] lg:pt-[320px]">
          <div class="animate-fade-up">
            <SectionKicker text="LIGHT ISLE STUDIO · 光屿影像" :size="14" line />
          </div>
          <h1
            class="mt-5 animate-fade-up font-serif font-light text-white lg:mt-6"
            style="
              animation-delay: 80ms;
              font-size: 46px;
              line-height: 64px;
            "
          >
            <span class="lg:hidden">{{ slide.slogan }}</span>
            <span class="hidden lg:inline" style="font-size: 84px; line-height: 1.08">{{
              slide.slogan
            }}</span>
          </h1>
          <p
            v-if="slide.sub_slogan"
            class="mt-4 animate-fade-up font-sans font-light text-white/70 lg:mt-5"
            style="animation-delay: 160ms; font-size: 14px"
          >
            <span class="lg:hidden">{{ slide.sub_slogan }}</span>
            <span class="hidden lg:inline" style="font-size: 20px">{{ slide.sub_slogan }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
