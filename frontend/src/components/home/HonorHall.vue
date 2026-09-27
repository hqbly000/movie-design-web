<script setup lang="ts">
/**
 * HonorHall —— 荣誉展示 · 射灯舞台横向展签轮播（参考 honor-demo v2）。
 *
 * 结构：横向 scroll-snap 轮播，两侧伪元素占位保证任何一张卡（含首尾）都能滚到正中；
 *       非当前卡压暗 + 模糊 + 缩小，当前卡点亮。麦穗枝（官网抠图素材）分列当前卡两侧。
 * 舞台感沿用原圆柱方案的家底：体积光锥（雾/锥/亮芯）+ 浮尘 canvas + 透视地格 +
 *       地平线亮边 + 落点亮池 + 后墙幕布 + 全场暗角。
 * 展签卡：HonorPanel（左上绶带 = 奖级，右上旋转印章 = 年份，右下幽灵字 = 题名首字）。
 * 交互：自动播放 5s（悬停 / 触摸 / 详情打开时暂停），左右按钮 / 圆点 / 计数 /
 *       方向键切换；点击当前卡放大查看详情（Esc / 点遮罩关闭）。
 * 约束：麦穗仅 ≥1024 显示（侧边空间充足）；prefers-reduced-motion 时不自动播放。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMediaQuery, useIntersectionObserver, usePreferredReducedMotion } from '@vueuse/core'
import HonorPanel from '@/components/home/HonorPanel.vue'
import SectionKicker from '@/components/common/SectionKicker.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'
import { useSiteStore } from '@/stores/site'
import type { Honor } from '@/types/site'

const props = withDefaults(
  defineProps<{
    /** 荣誉条目 */
    honors: Honor[]
  }>(),
  { honors: () => [] }
)

const site = useSiteStore()
const reducedMotion = usePreferredReducedMotion()

/* ---------- 视口档位 → 卡片尺寸 ---------- */
const isTabletUp = useMediaQuery('(min-width: 768px)')
const isWide = useMediaQuery('(min-width: 1280px)')

const geometry = computed(() => {
  if (isWide.value) return { cardW: 340, cardH: 216 }
  if (isTabletUp.value) return { cardW: 288, cardH: 186 }
  return { cardW: 192, cardH: 126 }
})

const foundedYear = computed(() => site.companyProfile?.founded_year ?? 2017)

/* ---------- 轮播对位（scroll-snap + 居中对齐） ---------- */
const viewportEl = ref<HTMLElement | null>(null)
const slideEls = ref<(HTMLElement | null)[]>([])
const activeIndex = ref(0)
const single = computed(() => props.honors.length < 2)

function setSlideRef(el: unknown, index: number): void {
  slideEls.value[index] = (el as HTMLElement | null) ?? null
}

/** 把当前卡滚到视口正中（两侧占位保证首尾同样居中）。 */
function align(smooth = false): void {
  const vp = viewportEl.value
  const s = slideEls.value[activeIndex.value]
  if (!vp || !s) return
  const x = s.offsetLeft - vp.offsetLeft - (vp.clientWidth - s.offsetWidth) / 2
  const behavior = smooth && reducedMotion.value !== 'reduce' ? 'smooth' : 'auto'
  vp.scrollTo({ left: Math.max(0, x), behavior: behavior as ScrollBehavior })
}

function goTo(i: number): void {
  const n = props.honors.length
  if (!n) return
  activeIndex.value = ((i % n) + n) % n
  align(true)
  restartAutoplay()
}

function step(delta: number): void {
  goTo(activeIndex.value + delta)
}

/** 滚动时按「离视口中心最近」反推当前卡（rAF 节流）。 */
let scrollRaf = 0
function onViewportScroll(): void {
  cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    const vp = viewportEl.value
    if (!vp) return
    const center = vp.scrollLeft + vp.clientWidth / 2
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    slideEls.value.forEach((s, i) => {
      if (!s) return
      const d = Math.abs(s.offsetLeft - vp.offsetLeft + s.offsetWidth / 2 - center)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    if (best !== activeIndex.value) activeIndex.value = best
  })
}

/* ---------- 自动播放：5s 步进；悬停 / 触摸 / 详情 / 减弱动态时暂停 ---------- */
const AUTOPLAY_MS = 5000
let autoplayTimer: number | undefined

function pauseAutoplay(): void {
  if (autoplayTimer !== undefined) {
    clearInterval(autoplayTimer)
    autoplayTimer = undefined
  }
}

function playAutoplay(): void {
  pauseAutoplay()
  if (reducedMotion.value === 'reduce' || single.value || detailOpen.value) return
  autoplayTimer = window.setInterval(() => step(1), AUTOPLAY_MS)
}

function restartAutoplay(): void {
  playAutoplay()
}

const stageEl = ref<HTMLElement | null>(null)
const hovering = ref(false)

function onStagePointerEnter(): void {
  hovering.value = true
  pauseAutoplay()
}
function onStagePointerLeave(): void {
  hovering.value = false
  playAutoplay()
}
function onStageTouchStart(): void {
  pauseAutoplay()
}
function onStageTouchEnd(): void {
  window.setTimeout(playAutoplay, 3000)
}
function onVisibilityChange(): void {
  if (document.hidden) pauseAutoplay()
  else playAutoplay()
}
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowLeft') {
    step(-1)
    e.preventDefault()
  } else if (e.key === 'ArrowRight') {
    step(1)
    e.preventDefault()
  }
}

/* ---------- 浮尘（丁达尔介质）：与 CSS 光锥共享几何比例 ---------- */
const CONE_APEX_Y = 0.008
const CONE_BOTTOM_Y = 0.78
const CONE_HALF_W = 0.23

interface Dust {
  /** 沿锥体 0（顶点）→ 1（锥底）的进度 */
  v: number
  /** 归一化横向偏移 -1..1 */
  u: number
  vy: number
  vx: number
  r: number
  ph: number
}

const dustEl = ref<HTMLCanvasElement | null>(null)
let dustCtx: CanvasRenderingContext2D | null = null
let dustW = 0
let dustH = 0
const dust: Dust[] = Array.from({ length: 170 }, () => ({
  v: Math.random(),
  u: (Math.random() * 2 - 1) * 0.86,
  vy: 0.012 + Math.random() * 0.038,
  vx: (Math.random() - 0.5) * 0.05,
  r: 0.5 + Math.random() * 1.5,
  ph: Math.random() * Math.PI * 2
}))

function resizeDust(): void {
  const cv = dustEl.value
  const stage = stageEl.value
  if (!cv || !stage) return
  const rect = stage.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  dustW = rect.width
  dustH = rect.height
  cv.width = Math.max(1, Math.round(dustW * dpr))
  cv.height = Math.max(1, Math.round(dustH * dpr))
  dustCtx = cv.getContext('2d')
  if (dustCtx) dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawDust(): void {
  const ctx = dustCtx
  if (!ctx || dustW === 0) return
  ctx.clearRect(0, 0, dustW, dustH)
  if (!entered.value || reducedMotion.value === 'reduce') return

  const apexY = CONE_APEX_Y * dustH
  const coneH = (CONE_BOTTOM_Y - CONE_APEX_Y) * dustH
  const halfBottom = CONE_HALF_W * dustW
  const cx = dustW / 2

  ctx.globalCompositeOperation = 'lighter'
  for (const p of dust) {
    const y = apexY + p.v * coneH
    const half = halfBottom * Math.max(p.v, 0.02)
    const x = cx + p.u * half
    const axis = 1 - Math.min(Math.abs(p.u), 1)
    const vert = 0.25 + 0.75 * (1 - p.v)
    const twinkle = 0.55 + 0.45 * Math.sin(clockMs / 590 + p.ph)
    const a = 0.3 * axis * axis * vert * twinkle
    if (a <= 0.004) continue
    ctx.beginPath()
    ctx.fillStyle = `rgba(255, 240, 208, ${a.toFixed(3)})`
    ctx.arc(x, y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}

function stepDust(dt: number): void {
  if (!entered.value || reducedMotion.value === 'reduce') return
  const paused = hovering.value || detailOpen.value
  const k = paused ? 0 : dt / 1000
  for (const p of dust) {
    p.v -= p.vy * k
    p.u += p.vx * k
    if (p.v < 0) {
      p.v = 0.94 + Math.random() * 0.06
      p.u = (Math.random() * 2 - 1) * 0.86
    }
    if (p.u < -1) p.u = 1
    else if (p.u > 1) p.u = -1
  }
}

let rafId = 0
let lastTs = 0
let clockMs = 0

function loop(ts: number): void {
  rafId = requestAnimationFrame(loop)
  if (!lastTs) lastTs = ts
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts
  clockMs += dt

  stepDust(dt)
  drawDust()
}

/** 进入视口后才开始浮尘。 */
const stageInObserver = useIntersectionObserver(stageEl, (entries) => {
  if (entries[0]?.isIntersecting) {
    entered.value = true
    stageInObserver.stop()
  }
})
const entered = ref(false)

/* ---------- 数据 / 档位变化 → 重新对位 ---------- */
watch(
  () => props.honors.length,
  async () => {
    slideEls.value = []
    activeIndex.value = 0
    await nextTick()
    align(false)
  }
)

watch(geometry, async () => {
  await nextTick()
  resizeDust()
  align(false)
})

watch(reducedMotion, () => restartAutoplay())

onMounted(() => {
  resizeDust()
  rafId = requestAnimationFrame(loop)
  window.addEventListener('resize', resizeDust)
  document.addEventListener('visibilitychange', onVisibilityChange)
  nextTick(() => requestAnimationFrame(() => align(false)))
  playAutoplay()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  cancelAnimationFrame(scrollRaf)
  pauseAutoplay()
  window.removeEventListener('resize', resizeDust)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('keydown', onEsc)
})

/* ---------- 点击当前卡 → 放大详情 ---------- */
const detailOpen = ref(false)
const detailHonor = ref<Honor | null>(null)
useBodyScrollLock(detailOpen)

function openDetail(honor: Honor, index: number): void {
  if (index !== activeIndex.value) return // 只有当前卡可点
  detailHonor.value = honor
  detailOpen.value = true
}

function closeDetail(): void {
  detailOpen.value = false
  detailHonor.value = null
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape' && detailOpen.value) closeDetail()
}

onMounted(() => window.addEventListener('keydown', onEsc))
</script>

<template>
  <section id="honors" class="relative w-full overflow-hidden bg-[#0A0A0A]">
    <div class="ly-container ly-section">
      <!-- 标题行 -->
      <div v-reveal class="flex items-end justify-between gap-6">
        <div>
          <SectionKicker text="HONOR · 荣誉资质" />
          <h2 class="mt-4 font-serif text-[34px] leading-tight text-txt-primary lg:text-[44px]">
            荣誉展示
          </h2>
        </div>
        <p v-if="honors.length" class="honor-meta">
          SINCE {{ foundedYear }} · 已收录 <b>{{ honors.length }}</b> 项荣誉记录
        </p>
      </div>

      <!-- 空状态 -->
      <p v-if="honors.length === 0" class="mt-10 text-center font-sans text-[14px] text-white/60">
        荣誉资料整理中，敬请期待
      </p>

      <!-- 舞台 -->
      <div
        v-else
        ref="stageEl"
        class="honor-stage relative mx-auto mt-10 w-full select-none"
        tabindex="0"
        role="region"
        aria-label="荣誉轮播，可用左右方向键切换"
        @mouseenter="onStagePointerEnter"
        @mouseleave="onStagePointerLeave"
        @touchstart="onStageTouchStart"
        @touchend="onStageTouchEnd"
        @keydown="onKeydown"
      >
        <!-- 后墙幕布：给空间一个边界（竖向褶皱 + 顶部受光） -->
        <div class="backwall" aria-hidden="true" />

        <!-- 地面：透视地格 + 地平线 + 落点亮池 -->
        <div class="floor" aria-hidden="true">
          <span class="edge" />
          <span class="pool" />
          <span class="grid" />
        </div>

        <!-- 体积光锥：外扩雾 + 清晰锥体 + 亮芯 -->
        <div class="beam" aria-hidden="true">
          <span class="haze" />
          <span class="cone" />
          <span class="core" />
        </div>
        <!-- 浮尘（丁达尔介质） -->
        <canvas ref="dustEl" class="dust" aria-hidden="true" />
        <!-- 顶部灯具亮带 -->
        <span class="lampbar" aria-hidden="true" />

        <!-- 横向轮播 -->
        <div
          ref="viewportEl"
          class="viewport"
          :style="{ '--slide-w': `${geometry.cardW}px`, '--slide-h': `${geometry.cardH}px` }"
          @scroll.passive="onViewportScroll"
        >
          <div
            v-for="(honor, index) in honors"
            :key="honor.id"
            :ref="(el) => setSlideRef(el, index)"
            class="slide"
            :class="{ 'is-active': index === activeIndex }"
          >
            <img
              class="laurel laurel--l"
              src="/images/laurel-branch.png"
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <img
              class="laurel laurel--r"
              src="/images/laurel-branch.png"
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <button
              type="button"
              class="slide-btn"
              :aria-label="`查看荣誉详情：${honor.title}`"
              @click="openDetail(honor, index)"
            >
              <HonorPanel :honor="honor" />
            </button>
          </div>
        </div>

        <!-- 控制区 -->
        <div v-show="!single" class="controls">
          <button type="button" class="ctr" aria-label="上一项" @click="step(-1)">
            <AppIcon name="chevron-right" :size="16" class="rotate-180" />
          </button>
          <div class="dots" role="tablist" aria-label="荣誉导航">
            <button
              v-for="(honor, i) in honors"
              :key="honor.id"
              type="button"
              :class="{ on: i === activeIndex }"
              :aria-label="`第 ${i + 1} 项`"
              @click="goTo(i)"
            />
          </div>
          <button type="button" class="ctr" aria-label="下一项" @click="step(1)">
            <AppIcon name="chevron-right" :size="16" />
          </button>
          <span class="counter">
            <b>{{ String(activeIndex + 1).padStart(2, '0') }}</b> /
            {{ String(honors.length).padStart(2, '0') }}
          </span>
        </div>

        <!-- 暗角：把注意力压到中央光区 -->
        <div class="vignette" aria-hidden="true" />
      </div>
    </div>

    <!-- 放大详情（Teleport 到 body，Esc / 点遮罩关闭） -->
    <Teleport to="body">
      <Transition name="holo-fade">
        <div
          v-if="detailOpen && detailHonor"
          class="fixed inset-0 z-[100] flex items-center justify-center px-6"
          style="background: rgba(5, 5, 5, 0.88); backdrop-filter: blur(8px)"
          role="dialog"
          aria-modal="true"
          :aria-label="`荣誉详情：${detailHonor.title}`"
          @click.self="closeDetail"
        >
          <div class="w-[420px] max-w-[88vw]">
            <div class="h-[300px] md:h-[320px]">
              <HonorPanel :honor="detailHonor" large />
            </div>
            <button
              type="button"
              class="mx-auto mt-6 block font-sans text-[12px] tracking-[3px] text-white/55 transition-colors hover:text-white/90"
              @click="closeDetail"
            >
              关闭 ESC
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
/* ===== 舞台：高度由内容（顶部受光区 + 卡 + 倒影 + 控制区）撑出 ===== */
.honor-stage {
  padding: 104px 0 34px;
  outline: none;
}
@media (min-width: 768px) {
  .honor-stage {
    padding: 120px 0 40px;
  }
}
@media (min-width: 1280px) {
  .honor-stage {
    padding: 136px 0 44px;
  }
}
.honor-stage:focus-visible {
  outline: 1px solid rgba(196, 154, 74, 0.4);
  outline-offset: 4px;
}

/* ===== 后墙幕布（双向遮罩融进区块底色） ===== */
.backwall {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(196, 154, 74, 0.1), transparent 60%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.022) 0 2px, transparent 2px 46px),
    linear-gradient(180deg, #0b0a08 0%, #0a0a0a 55%, #070706 100%);
  -webkit-mask-image:
    linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%),
    linear-gradient(180deg, #000 0%, #000 80%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%),
    linear-gradient(180deg, #000 0%, #000 80%, transparent 100%);
  mask-composite: intersect;
}

/* ===== 地面（地平线 78% = 脚本 CONE_BOTTOM_Y，两者必须同步改） ===== */
.floor {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: 10%;
  height: 12%;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(
      60% 100% at 50% 0%,
      rgba(196, 154, 74, 0.14),
      rgba(196, 154, 74, 0.035) 45%,
      transparent 72%
    ),
    radial-gradient(70% 110% at 50% 0%, rgba(255, 255, 255, 0.03), transparent 62%);
}

.floor .grid {
  position: absolute;
  inset: 0;
  transform: perspective(420px) rotateX(56deg);
  transform-origin: 50% 0%;
  background-image:
    repeating-linear-gradient(90deg, rgba(196, 154, 74, 0.14) 0 1px, transparent 1px 92px),
    repeating-linear-gradient(0deg, rgba(196, 154, 74, 0.12) 0 1px, transparent 1px 60px);
  -webkit-mask-image:
    linear-gradient(180deg, transparent 0%, #000 14%, transparent 92%),
    linear-gradient(90deg, transparent 0%, #000 26%, #000 74%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(180deg, transparent 0%, #000 14%, transparent 92%),
    linear-gradient(90deg, transparent 0%, #000 26%, #000 74%, transparent 100%);
  mask-composite: intersect;
  opacity: 0.55;
}

.floor .edge {
  position: absolute;
  top: 0;
  left: 8%;
  right: 8%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(232, 199, 122, 0.34), transparent);
}

.floor .pool {
  position: absolute;
  top: 0;
  left: 50%;
  width: 320px;
  height: 52px;
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse at center,
    rgba(255, 240, 205, 0.28),
    rgba(196, 154, 74, 0.09) 42%,
    transparent 72%
  );
  filter: blur(12px);
}

/* ===== 体积光锥 ===== */
.beam {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.beam .cone,
.beam .haze,
.beam .core {
  position: absolute;
  left: 50%;
  top: 0.8%;
  transform: translateX(-50%);
}

.beam .haze {
  width: 74%;
  height: 86%;
  clip-path: polygon(48.5% 0, 51.5% 0, 100% 100%, 0% 100%);
  background: linear-gradient(
    to bottom,
    rgba(196, 154, 74, 0.07),
    rgba(196, 154, 74, 0.02) 60%,
    transparent
  );
  filter: blur(26px);
}

.beam .cone {
  width: 46%;
  height: 78%;
  clip-path: polygon(47.5% 0, 52.5% 0, 100% 100%, 0% 100%);
  background: linear-gradient(
    to bottom,
    rgba(255, 240, 205, 0.3) 0%,
    rgba(240, 217, 160, 0.14) 26%,
    rgba(196, 154, 74, 0.07) 62%,
    rgba(196, 154, 74, 0.02) 88%,
    transparent 100%
  );
  filter: blur(5px);
}

.beam .core {
  width: 9%;
  height: 76%;
  background: linear-gradient(
    to bottom,
    rgba(255, 248, 228, 0.5),
    rgba(255, 240, 205, 0.06) 70%,
    transparent
  );
  filter: blur(9px);
}

.dust {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.lampbar {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 12px;
  z-index: 6;
  pointer-events: none;
  background: radial-gradient(ellipse at center top, rgba(240, 217, 160, 0.75), transparent 70%);
}

/* ===== 横向轮播：两侧占位让首尾卡也能居中 ===== */
.viewport {
  --slide-w: 300px;
  --slide-h: 190px;
  position: relative;
  z-index: 4;
  display: flex;
  gap: 26px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  /* 顶部给绶带出框（上端达卡顶上方 ~25px）留足空间，底部留出倒影空间 */
  padding: 34px 0 64px;
}
.viewport::-webkit-scrollbar {
  display: none;
}
.viewport::before,
.viewport::after {
  content: '';
  flex: 0 0 calc((100% - var(--slide-w)) / 2);
}

.slide {
  position: relative;
  flex: 0 0 var(--slide-w);
  height: var(--slide-h);
  scroll-snap-align: center;
  opacity: 0.16;
  filter: blur(2px) saturate(0.5);
  transform: scale(0.93);
  transition:
    opacity 0.6s ease,
    filter 0.6s ease,
    transform 0.6s ease;
  pointer-events: none;
}
.slide.is-active {
  opacity: 1;
  filter: none;
  transform: none;
  pointer-events: auto;
}

.slide-btn {
  display: block;
  width: 100%;
  height: 100%;
  text-align: left;
}

/* ===== 麦穗枝（当前卡两侧，≥1024 显示） ===== */
.laurel {
  position: absolute;
  top: 50%;
  left: -88px;
  width: 78px;
  z-index: 4;
  transform: translateY(-50%);
  opacity: 0;
  transition:
    opacity 0.5s ease,
    rotate 0.7s ease;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 0 16px rgba(232, 199, 122, 0.22));
}
.laurel--r {
  left: auto;
  right: -88px;
  transform: translateY(-50%) scaleX(-1);
}
.slide.is-active .laurel {
  opacity: 1;
  animation: laurel-sway 4.5s 1.3s ease-in-out infinite alternate;
}
@keyframes laurel-sway {
  from {
    rotate: -1.6deg;
  }
  to {
    rotate: 1.6deg;
  }
}
@media (max-width: 1023px) {
  .laurel {
    display: none;
  }
}

/* ===== 控制区 ===== */
.controls {
  position: relative;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 6px;
}
.ctr {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(196, 154, 74, 0.35);
  background: transparent;
  color: var(--ivory);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    background-color 0.35s ease,
    border-color 0.35s ease,
    color 0.35s ease;
}
.ctr:hover {
  background: var(--accent-gold);
  border-color: var(--accent-gold);
  color: #171106;
}
.dots {
  display: flex;
  gap: 10px;
}
.dots button {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  border: none;
  cursor: pointer;
  background: rgba(196, 154, 74, 0.3);
  padding: 0;
  transition:
    width 0.35s ease,
    background-color 0.35s ease;
}
.dots button.on {
  width: 22px;
  background: var(--accent-gold);
}
.counter {
  position: absolute;
  right: 0;
  font-family: var(--font-serif);
  font-size: 13px;
  letter-spacing: 0.18em;
  color: rgba(255, 255, 255, 0.4);
}
.counter b {
  color: var(--accent-gold-light);
  font-weight: 400;
}
@media (max-width: 767px) {
  .controls {
    gap: 16px;
  }
  .ctr {
    width: 38px;
    height: 38px;
  }
  .counter {
    display: none;
  }
}

/* ===== 标题行 meta ===== */
.honor-meta {
  font-size: 12px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.4);
  padding-bottom: 8px;
  white-space: nowrap;
}
.honor-meta b {
  color: var(--accent-gold-light);
  font-weight: 400;
}
@media (max-width: 767px) {
  .honor-meta {
    display: none;
  }
}

/* ===== 当前卡金边提亮 + 受光面 ===== */
.is-active :deep(.card-body) {
  border-color: rgba(240, 224, 176, 0.9);
  box-shadow:
    0 0 110px rgba(255, 236, 190, 0.34),
    0 26px 60px rgba(0, 0, 0, 0.6),
    inset 0 0 54px rgba(196, 154, 74, 0.12);
}

.is-active :deep(.lit) {
  opacity: 1;
  animation: honor-lamp 6s ease-in-out infinite;
}

@keyframes honor-lamp {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.94;
  }
}

/* ===== 暗角 ===== */
.vignette {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: radial-gradient(
    120% 90% at 50% 40%,
    transparent 38%,
    rgba(0, 0, 0, 0.55) 78%,
    rgba(0, 0, 0, 0.82) 100%
  );
  -webkit-mask-image:
    linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%),
    linear-gradient(180deg, transparent 0%, #000 12%, #000 76%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%),
    linear-gradient(180deg, transparent 0%, #000 12%, #000 76%, transparent 100%);
  mask-composite: intersect;
}

.holo-fade-enter-active,
.holo-fade-leave-active {
  transition: opacity 220ms ease;
}
.holo-fade-enter-from,
.holo-fade-leave-to {
  opacity: 0;
}
</style>
