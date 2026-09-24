<script setup lang="ts">
/**
 * HonorHall —— 荣誉展示 · 全息圆柱（R6 / R7 / §2.4 新方案）。
 *
 * 结构：纯 CSS 3D —— perspective 舞台 + preserve-3d 转盘，
 *       n 张等大全息卡各 rotateY(i×step) translateZ(R) 围成圆柱（n = 荣誉条数，≤6）。
 * 动效：转盘整体匀速自转（rAF 驱动角度，纯 CSS transform 渲染）；
 *       顶部三层叠加射灯光锥 + 地面椭圆光斑（§2.4-3）打在正对镜头的卡上；
 *       底部一个径向渐变光晕作"地面反射"；无透视网格 / 轨道。
 * 交互：hover 暂停；点击当前正对镜头的卡放大查看详情（Esc / 点遮罩关闭）。
 * 约束：无左右箭头（R6）；荣誉最多 6 条；prefers-reduced-motion 时不自转、点击步进。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMediaQuery, usePreferredReducedMotion } from '@vueuse/core'
import HonorPanel from '@/components/home/HonorPanel.vue'
import SectionKicker from '@/components/common/SectionKicker.vue'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'
import type { Honor } from '@/types/site'

const props = withDefaults(
  defineProps<{
    /** 荣誉条目（调用方已截断至 ≤6） */
    honors: Honor[]
  }>(),
  { honors: () => [] }
)

/* ---------- 视口档位 → 半径 / 卡片尺寸 / 舞台高度 ---------- */
const isWide = useMediaQuery('(min-width: 1280px)')
const isTabletUp = useMediaQuery('(min-width: 768px)')
const reducedMotion = usePreferredReducedMotion()

const geometry = computed(() => {
  if (isWide.value) return { radius: 320, cardW: 300, cardH: 190, stageH: 540, perspective: 1150 }
  if (isTabletUp.value) return { radius: 260, cardW: 250, cardH: 162, stageH: 460, perspective: 950 }
  return { radius: 160, cardW: 168, cardH: 110, stageH: 340, perspective: 640 }
})

/** 相邻两卡夹角（荣誉不足 6 条时自动放大夹角，不写死 60°）。 */
const stepAngle = computed(() => 360 / Math.max(props.honors.length, 1))

/* ---------- 匀速自转（rAF 驱动角度，渲染仍走 CSS transform） ---------- */
const DEG_PER_SEC = 12 // 30s 一圈

const angle = ref(0)
const hovering = ref(false)
const entered = ref(false)
const activeIndex = ref(0)

const cardEls = ref<(HTMLElement | null)[]>([])
const ringEl = ref<HTMLElement | null>(null)

let rafId = 0
let lastTs = 0

/** 逐帧只写 DOM：转盘角度 + 逐卡景深透明度（不走 Vue 响应式，避免 60fps 重渲染）。 */
function applyFrame(): void {
  if (ringEl.value) {
    ringEl.value.style.transform = `rotateY(${angle.value.toFixed(2)}deg)`
    ringEl.value.style.transformStyle = 'preserve-3d'
  }
  const n = props.honors.length
  for (let i = 0; i < n; i += 1) {
    const el = cardEls.value[i]
    if (!el) continue
    const d = (((i * stepAngle.value + angle.value) % 360) + 360) % 360
    const dist = Math.min(d, 360 - d) // 0 = 正对镜头
    const t = Math.min(dist / 90, 1)
    el.style.opacity = (dist > 90 ? 0 : 1 - t * 0.58).toFixed(3)
    el.style.filter = t * 1.6 > 0.05 ? `blur(${(t * 1.6).toFixed(2)}px)` : 'none'
  }
}

function loop(ts: number): void {
  rafId = requestAnimationFrame(loop)
  if (!lastTs) {
    lastTs = ts
    return
  }
  const dt = Math.min((ts - lastTs) / 1000, 0.05)
  lastTs = ts
  const spinning =
    entered.value && !hovering.value && !detailOpen.value && reducedMotion.value !== 'reduce'
  if (spinning) angle.value = (angle.value + DEG_PER_SEC * dt) % 360
  applyFrame()
}

/** 当前正对镜头的卡：由转盘角度反算（i×step + angle ≡ 0 mod 360）。 */
function recomputeActive(): void {
  const n = props.honors.length
  if (n === 0) return
  const normalized = ((-angle.value % 360) + 360) % 360
  const idx = Math.round(normalized / stepAngle.value) % n
  if (idx !== activeIndex.value) activeIndex.value = idx
}

watch(angle, recomputeActive)

/** 数据异步到达 / 条数变化时，重建卡片元素引用。 */
watch(
  () => props.honors.length,
  async () => {
    cardEls.value = []
    await nextTick()
    recomputeActive()
    applyFrame()
  }
)

onMounted(() => {
  recomputeActive()
  applyFrame()
  rafId = requestAnimationFrame(loop)
})

onBeforeUnmount(() => cancelAnimationFrame(rafId))

/** 进入视口后才开始自转（避免首屏外空转）。 */
const stageEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
onMounted(() => {
  const el = stageEl.value
  if (!el || typeof IntersectionObserver === 'undefined') {
    entered.value = true
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        entered.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0.2 }
  )
  observer.observe(el)
})

/* ---------- reduced-motion 降级：不自转，点击舞台步进一张 ---------- */
function onStageClick(): void {
  if (reducedMotion.value !== 'reduce') return
  angle.value = (angle.value + stepAngle.value) % 360
  recomputeActive()
  applyFrame()
}

/* ---------- 点击当前卡 → 放大详情 ---------- */
const detailOpen = ref(false)
const detailHonor = ref<Honor | null>(null)
useBodyScrollLock(detailOpen)

function openDetail(honor: Honor, index: number): void {
  if (index !== activeIndex.value) return // 只有正对镜头的卡可点
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
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

function setCardRef(el: unknown, index: number): void {
  cardEls.value[index] = (el as HTMLElement | null) ?? null
}

const cardStyle = (index: number): Record<string, string> => ({
  transform: `rotateY(${(index * stepAngle.value).toFixed(2)}deg) translateZ(${geometry.value.radius}px)`,
  left: `${-geometry.value.cardW / 2}px`,
  top: `${-geometry.value.cardH / 2}px`,
  width: `${geometry.value.cardW}px`,
  height: `${geometry.value.cardH}px`
})
</script>

<template>
  <section id="honors" class="relative w-full overflow-hidden bg-[#0A0A0A]">
    <div class="ly-container ly-section">
      <!-- 标题行 -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div v-reveal>
          <SectionKicker text="HONOR · 荣誉资质" />
          <h2 class="mt-4 font-serif text-[34px] leading-tight text-txt-primary lg:text-[44px]">
            荣誉展示
          </h2>
        </div>
        <!-- 旋转状态胶囊 -->
        <div v-reveal="80" class="hidden items-center gap-2 sm:flex">
          <span
            class="inline-flex items-center gap-2 rounded-full border border-[rgba(196,154,74,0.35)] bg-[rgba(196,154,74,0.08)] px-4 py-2 font-sans text-[11px] text-accent-gold"
            style="letter-spacing: 2px"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-accent-gold-light" />
            {{ hovering || detailOpen ? '已暂停' : '自动旋转中' }}
          </span>
        </div>
      </div>

      <!-- 空状态 -->
      <p v-if="honors.length === 0" class="mt-10 text-center font-sans text-[14px] text-white/60">
        荣誉资料整理中，敬请期待
      </p>

      <!-- 3D 圆柱舞台 -->
      <div
        v-else
        ref="stageEl"
        class="honor-stage relative mx-auto mt-10 w-full touch-pan-y select-none"
        :style="{
          height: `${geometry.stageH}px`,
          perspective: `${geometry.perspective}px`,
          perspectiveOrigin: 'center 42%'
        }"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
        @click="onStageClick"
      >
        <!-- 底部径向光晕：充当地面反射 -->
        <div
          class="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
          style="
            width: 88%;
            height: 180px;
            background: radial-gradient(
              ellipse at center bottom,
              rgba(196, 154, 74, 0.22),
              rgba(196, 154, 74, 0.07) 42%,
              transparent 72%
            );
            filter: blur(6px);
          "
          aria-hidden="true"
        />

        <!-- 顶部射灯：灯具 + 三层叠加光锥（外 6% → 中 10% → 内 16%）+ 聚焦光斑 + 地面椭圆光斑（§2.4-3） -->
        <div class="honor-light" aria-hidden="true">
          <span class="lamp" />
          <span class="beam beam-outer" />
          <span class="beam beam-mid" />
          <span class="beam beam-inner" />
          <span class="focus" />
          <span class="pool" />
        </div>

        <!-- 圆柱转盘 -->
        <div class="absolute inset-0" style="transform-style: preserve-3d">
          <div ref="ringEl" class="absolute left-1/2 top-[44%] h-0 w-0">
            <div
              v-for="(honor, index) in honors"
              :key="honor.id"
              :ref="(el) => setCardRef(el, index)"
              class="absolute"
              :class="index === activeIndex ? 'is-active' : ''"
              :style="cardStyle(index)"
            >
              <button
                type="button"
                class="block h-full w-full text-left"
                :class="index === activeIndex ? 'cursor-pointer' : 'cursor-default'"
                :aria-label="`查看荣誉详情：${honor.title}`"
                @click.stop="openDetail(honor, index)"
              >
                <HonorPanel :honor="honor" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 提示文案 -->
      <p v-if="honors.length" class="mt-4 text-center font-sans text-[12px] text-white/50">
        {{
          reducedMotion === 'reduce'
            ? '点击切换 · 自动旋转已关闭'
            : '点击当前卡片查看详情 · 悬停暂停'
        }}
      </p>
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
/* ===== 舞台射灯（§2.4-3）：顶部光源 + 三层叠加光锥 + 地面椭圆光斑，整层模糊软化边缘 ===== */
.honor-light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* 设计稿要求 20~22 的模糊量；收窄光锥后取 18 保证锥形可辨 */
  filter: blur(18px);
}

/* 顶部灯具：一条极淡的横向亮带，暗示光源（不抢主体） */
.lamp {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: 26%;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(240, 217, 160, 0.55), transparent);
}

.beam {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  /* 上窄（光源）→ 下宽（铺到展板），形成光锥 */
  clip-path: polygon(49% 0, 51% 0, 100% 100%, 0% 100%);
}

.beam-outer {
  width: 54%;
  height: 56%;
  background: linear-gradient(
    to bottom,
    rgba(196, 154, 74, 0.1) 0%,
    rgba(196, 154, 74, 0.09) 58%,
    rgba(196, 154, 74, 0.03) 84%,
    transparent 100%
  );
}

.beam-mid {
  width: 36%;
  height: 52%;
  background: linear-gradient(
    to bottom,
    rgba(232, 199, 122, 0.15) 0%,
    rgba(232, 199, 122, 0.13) 56%,
    rgba(232, 199, 122, 0.05) 84%,
    transparent 100%
  );
}

.beam-inner {
  width: 22%;
  height: 54%;
  background: linear-gradient(
    to bottom,
    rgba(240, 217, 160, 0.24) 0%,
    rgba(240, 217, 160, 0.19) 52%,
    rgba(240, 217, 160, 0.06) 82%,
    transparent 100%
  );
}

/* 聚焦光斑：光锥落在正中展板（top 44% 处）的照度中心 */
.focus {
  position: absolute;
  left: 50%;
  top: 44%;
  transform: translate(-50%, -50%);
  width: 34%;
  height: 64%;
  background: radial-gradient(
    ellipse at center,
    rgba(240, 217, 160, 0.2),
    rgba(196, 154, 74, 0.07) 46%,
    transparent 74%
  );
}

/* 地面椭圆光斑：光锥落到展板脚下的落点 */
.pool {
  position: absolute;
  left: 50%;
  bottom: 3%;
  transform: translateX(-50%);
  width: 52%;
  height: 150px;
  background: radial-gradient(
    ellipse at center bottom,
    rgba(196, 154, 74, 0.13),
    rgba(196, 154, 74, 0.05) 46%,
    transparent 74%
  );
}

/* 当前正对镜头的卡：金边提亮 + 「自上而下受光」的舞台高光（其余卡由 rAF 控制景深透明度） */
.is-active :deep(.card-body) {
  border-color: rgba(232, 199, 122, 0.86);
  box-shadow:
    0 0 96px rgba(240, 217, 120, 0.3),
    inset 0 0 52px rgba(196, 154, 74, 0.12),
    inset 0 30px 46px -18px rgba(255, 246, 218, 0.4);
}

/* 受光面：卡片顶部往下衰减的暖白高光，模拟射灯打在正面展板上 */
.is-active :deep(.card-body)::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 246, 218, 0.4) 0%,
    rgba(240, 217, 160, 0.2) 22%,
    rgba(196, 154, 74, 0.06) 48%,
    transparent 72%
  );
  mix-blend-mode: screen;
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

.holo-fade-enter-active,
.holo-fade-leave-active {
  transition: opacity 220ms ease;
}
.holo-fade-enter-from,
.holo-fade-leave-to {
  opacity: 0;
}
</style>
