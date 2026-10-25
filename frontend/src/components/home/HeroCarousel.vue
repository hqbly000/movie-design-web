<script setup lang="ts">
/**
 * HeroCarousel —— 首屏 3 图轮播 + 1 个标题（R2 / R3 / R4 / §2.2 / §6.1）。
 * 6s 自动轮播、悬停暂停、Ken Burns、指示点切换；**不含任何 CTA 按钮**（R4）。
 *
 * 文案只有一套（取第一条 hero_slides 的 slogan / sub_slogan），由本组件统一渲染在图片之上；
 * 切换图片时文案重放淡入上移，不再随图换词。
 *
 * ⚠️ 首屏是 `h-screen` 满视口区域：PC 上指针几乎永远落在区域内，只靠 `mouseleave`
 * 恢复会把「悬停暂停」退化成「永久暂停」（现象 = PC 端不自动轮播、移动端正常）。
 * 因此接入 `idleResume`：指针在首屏内移动才暂停，静止 2.6s 自动续播。
 */
import { computed, onMounted } from 'vue'
import HeroSlideView from '@/components/home/HeroSlide.vue'
import SectionKicker from '@/components/common/SectionKicker.vue'
import { useAutoRotate } from '@/composables/useAutoRotate'
import type { HeroSlide } from '@/types/site'

const props = defineProps<{
  /** hero_slides（恰好 3 条，共用一套文案） */
  slides: HeroSlide[]
}>()

const { activeIndex, setActive, play, resume, onHoverStart, onHoverEnd, onPointerMove } =
  useAutoRotate({
    interval: 6000,
    count: () => props.slides.length,
    pauseOnHover: true,
    idleResume: 2600
  })

/** 共用标题（历史数据三张各一套时，以第一条为准）。 */
const title = computed(() => props.slides[0]?.slogan?.trim() ?? '')
/** 共用副标题。 */
const subTitle = computed(() => props.slides[0]?.sub_slogan?.trim() ?? '')

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

    <!-- 文案区：整屏唯一一套标题，随图片切换重放淡入 -->
    <div class="pointer-events-none absolute inset-0 z-[2]">
      <div class="ly-container flex h-full flex-col">
        <div :key="activeIndex" class="pt-[310px] lg:pt-[320px]">
          <div class="animate-fade-up">
            <SectionKicker text="JIAO DIAN FILM AND TELEVISION" :size="14" line />
          </div>
          <h1
            v-if="title"
            class="mt-5 animate-fade-up font-serif font-light text-white lg:mt-6"
            style="
              animation-delay: 80ms;
              font-size: 46px;
              line-height: 64px;
            "
          >
            <span class="lg:hidden">{{ title }}</span>
            <span class="hidden lg:inline" style="font-size: 84px; line-height: 1.08">{{ title }}</span>
          </h1>
          <p
            v-if="subTitle"
            class="mt-4 animate-fade-up font-sans font-light text-white/70 lg:mt-5"
            style="animation-delay: 160ms; font-size: 14px"
          >
            <span class="lg:hidden">{{ subTitle }}</span>
            <span class="hidden lg:inline" style="font-size: 20px">{{ subTitle }}</span>
          </p>
        </div>
      </div>
    </div>

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
          :aria-label="`第 ${index + 1} 张`"
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
