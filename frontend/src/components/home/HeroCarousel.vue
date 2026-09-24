<script setup lang="ts">
/**
 * HeroCarousel —— 首屏三图轮播（R2 / R3 / R4 / §2.2 / §6.1）。
 * 6s 自动轮播、悬停暂停、Ken Burns、指示点切换；**不含任何 CTA 按钮**（R4）。
 *
 * ⚠️ 首屏是 `h-screen` 满视口区域：PC 上指针几乎永远落在区域内，只靠 `mouseleave`
 * 恢复会把「悬停暂停」退化成「永久暂停」（现象 = PC 端不自动轮播、移动端正常）。
 * 因此接入 `idleResume`：指针在首屏内移动才暂停，静止 2.6s 自动续播。
 */
import { onMounted } from 'vue'
import HeroSlideView from '@/components/home/HeroSlide.vue'
import { useAutoRotate } from '@/composables/useAutoRotate'
import type { HeroSlide } from '@/types/site'

const props = defineProps<{
  /** hero_slides（恰好 3 条） */
  slides: HeroSlide[]
}>()

const { activeIndex, setActive, play, resume, onHoverStart, onHoverEnd, onPointerMove } =
  useAutoRotate({
    interval: 6000,
    count: () => props.slides.length,
    pauseOnHover: true,
    idleResume: 2600
  })

/** 点击指示点：切到该张并立即续播（指针可能正停在首屏上）。 */
function selectSlide(index: number): void {
  setActive(index)
  resume()
  play()
}

onMounted(play)

defineExpose({ activeIndex })
</script>

<template>
  <section
    id="hero"
    class="relative h-screen min-h-[600px] w-full overflow-hidden bg-[#050505]"
    @mouseenter="onHoverStart"
    @mousemove="onPointerMove"
    @mouseleave="onHoverEnd"
  >
    <HeroSlideView
      v-for="(slide, index) in slides"
      :key="slide.id"
      :slide="slide"
      :active="index === activeIndex"
    />

    <!-- 底部：指示点 + SCROLL -->
    <div
      class="absolute inset-x-0 bottom-8 z-[5] flex flex-col items-center gap-4 lg:bottom-10"
    >
      <div class="flex items-center gap-3" role="tablist" aria-label="首屏轮播指示">
        <button
          v-for="(slide, index) in slides"
          :key="slide.id"
          type="button"
          role="tab"
          class="flex h-11 w-6 items-center justify-center"
          :aria-selected="index === activeIndex"
          :aria-label="`第 ${index + 1} 张：${slide.slogan}`"
          @click="selectSlide(index)"
        >
          <span
            class="block rounded-full transition-all duration-300"
            :class="
              index === activeIndex
                ? 'h-[3px] w-7 bg-accent-gold'
                : 'h-[3px] w-2 bg-white/40'
            "
          />
        </button>
      </div>
      <span
        class="font-latin text-[10px] text-white/50"
        style="letter-spacing: 6px"
        >SCROLL</span
      >
    </div>
  </section>
</template>
