<script setup lang="ts">
/**
 * HonorHall —— 荣誉展示 · 舞台射灯圆柱。
 *
 * 结构：纯 CSS 3D —— perspective 舞台 + preserve-3d 转盘，
 *       n 张卡各 rotateY(i×step) translateZ(R) 围成圆柱（n = 荣誉条数，≤6）。
 * 舞台感来源（对齐 honor-stage-demo.html 的「新方案」）：
 *   1. 体积光锥 —— 边缘清晰的 cone(blur5) + 外扩雾 haze(blur26) + 亮芯 core(blur9)，
 *      不再对整个光束层糊 18px（那会把锥体边界擦掉）；
 *   2. 浮尘 canvas —— 丁达尔介质，粒子在锥内缓慢上浮，亮度按「离锥轴距离 + 离光源高度」衰减；
 *   3. 地面 —— 透视地格 + 地平线亮边 + 落点亮池，让光有地方落；
 *   4. 景深 —— 按夹角做 scale / opacity / blur 三通道衰减，侧后方沉入暗处；
 *   5. 节奏 —— 步进 + 停顿（走一张 1.5s easeInOutCubic，到位停 1.6s），取代匀速转圈；
 *   6. 空间边界 —— 后墙幕布 + 全场暗角。
 * 交互：hover 暂停；点击当前正对镜头的卡放大查看详情（Esc / 点遮罩关闭）。
 * 约束：无左右箭头（R6）；荣誉最多 6 条；prefers-reduced-motion 时不自转、无浮尘、点击步进。
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
  if (isWide.value) return { radius: 340, cardW: 300, cardH: 190, stageH: 580, perspective: 1400 }
  if (isTabletUp.value) return { radius: 268, cardW: 250, cardH: 162, stageH: 450, perspective: 1150 }
  return { radius: 164, cardW: 168, cardH: 110, stageH: 330, perspective: 780 }
})

/** 相邻两卡夹角（荣誉不足 6 条时自动放大夹角，不写死 60°）。 */
const stepAngle = computed(() => 360 / Math.max(props.honors.length, 1))

/* ---------- 步进旋转（转 → 停 → 再转） ---------- */
const MOVE_MS = 1500
const DWELL_MS = 1600

const hovering = ref(false)
const entered = ref(false)
const activeIndex = ref(0)

/** 逐帧写入 DOM，不走响应式，避免 60fps 重渲染。 */
let angle = 0
let moving = false
let moveFrom = 0
let targetAngle = 0
let moveStart = 0
let holdUntil = 0
let lastTs = 0
let clockMs = 0

const cardEls = ref<(HTMLElement | null)[]>([])
const ringEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** 当前正对镜头的卡：由转盘角度反算（i×step + angle ≡ 0 mod 360）。 */
function recomputeActive(): void {
  const n = props.honors.length
  if (n === 0) return
  const normalized = ((-angle % 360) + 360) % 360
  const idx = Math.round(normalized / stepAngle.value) % n
  if (idx !== activeIndex.value) activeIndex.value = idx
}

/** 逐帧写 DOM：转盘角度 + 每卡的景深（scale / opacity / blur）。 */
function applyFrame(): void {
  if (ringEl.value) {
    ringEl.value.style.transform = `rotateY(${angle.toFixed(2)}deg)`
    ringEl.value.style.transformStyle = 'preserve-3d'
  }
  const n = props.honors.length
  const r = geometry.value.radius
  for (let i = 0; i < n; i += 1) {
    const el = cardEls.value[i]
    if (!el) continue
    const raw = (((i * stepAngle.value + angle) % 360) + 360) % 360
    const dist = Math.min(raw, 360 - raw) // 0 = 正对镜头
    const t = Math.min(dist / 90, 1)
    const behind = dist > 90
    const scale = 1 - t * 0.26
    el.style.transform =
      `rotateY(${(i * stepAngle.value).toFixed(2)}deg) translateZ(${r}px) scale(${scale.toFixed(3)})`
    el.style.opacity = behind ? '0' : (1 - t * 0.78).toFixed(3)
    el.style.filter = t * 2.6 > 0.05 ? `blur(${(t * 2.6).toFixed(2)}px)` : 'none'
  }
  recomputeActive()
}

/* ---------- 浮尘（丁达尔介质） ---------- */
/** 与 CSS 光锥共享的几何比例：顶点 y 占比、锥底 y 占比、锥底半宽占比。 */
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

function loop(ts: number): void {
  rafId = requestAnimationFrame(loop)
  if (!lastTs) lastTs = ts
  const dt = Math.min(ts - lastTs, 50)
  lastTs = ts
  clockMs += dt

  const paused = hovering.value || detailOpen.value || !entered.value
  const spinning = reducedMotion.value !== 'reduce'

  if (paused || !spinning) {
    // 暂停时把计时基准顺延，避免恢复瞬间立刻跳步
    if (moving) moveStart += dt
    holdUntil = ts + 400
  } else if (moving) {
    const p = Math.min((ts - moveStart) / MOVE_MS, 1)
    angle = moveFrom + (targetAngle - moveFrom) * easeInOutCubic(p)
    if (p >= 1) {
      moving = false
      angle = targetAngle
      holdUntil = ts + DWELL_MS
    }
  } else if (ts >= holdUntil) {
    moving = true
    moveFrom = angle
    targetAngle = angle - stepAngle.value
    moveStart = ts
  }

  applyFrame()
  stepDust(dt)
  drawDust()
}

let rafId = 0

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

/** 档位切换会改半径与舞台尺寸，需要重算景深并同步 canvas。 */
watch(geometry, async () => {
  await nextTick()
  resizeDust()
  applyFrame()
})

onMounted(() => {
  recomputeActive()
  resizeDust()
  applyFrame()
  rafId = requestAnimationFrame(loop)
  window.addEventListener('resize', resizeDust)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resizeDust)
  observer?.disconnect()
})

/* ---------- 进入视口后才开始转与浮尘 ---------- */
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
  angle -= stepAngle.value
  moving = false
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

/**
 * 状态胶囊文案。必须把 reduced-motion 算进来 ——
 * 之前只看 hovering/detailOpen，无障碍降级下会显示「自动旋转中」而下方提示是「已关闭」，自相矛盾。
 */
const pillText = computed(() => {
  if (reducedMotion.value === 'reduce') return '已按系统偏好停用动效'
  if (hovering.value || detailOpen.value) return '已暂停'
  return '自动旋转中'
})

function setCardRef(el: unknown, index: number): void {
  cardEls.value[index] = (el as HTMLElement | null) ?? null
}

/** 静态盒模型定位；transform 由 applyFrame 逐帧写入。 */
const cardStyle = (index: number): Record<string, string> => ({
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
            {{ pillText }}
          </span>
        </div>
      </div>

      <!-- 空状态 -->
      <p v-if="honors.length === 0" class="mt-10 text-center font-sans text-[14px] text-white/60">
        荣誉资料整理中，敬请期待
      </p>

      <!-- 舞台 -->
      <div
        v-else
        ref="stageEl"
        class="honor-stage relative mx-auto mt-10 w-full touch-pan-y select-none"
        :style="{
          height: `${geometry.stageH}px`,
          perspective: `${geometry.perspective}px`,
          perspectiveOrigin: 'center 34%'
        }"
        @mouseenter="hovering = true"
        @mouseleave="hovering = false"
        @click="onStageClick"
      >
        <!-- 后墙幕布：给空间一个边界（竖向褶皱 + 顶部受光） -->
        <div class="backwall" aria-hidden="true" />

        <!-- 地面：透视地格 + 地平线 + 落点亮池 -->
        <div class="floor" aria-hidden="true">
          <span class="edge" />
          <span class="pool" />
          <span class="grid" />
        </div>

        <!-- 体积光锥：外扩雾 + 清晰锥体 + 亮芯（分工，不再整层糊掉） -->
        <div class="beam" aria-hidden="true">
          <span class="haze" />
          <span class="cone" />
          <span class="core" />
        </div>
        <!-- 浮尘（丁达尔介质） -->
        <canvas ref="dustEl" class="dust" aria-hidden="true" />
        <!-- 顶部灯具亮带 -->
        <span class="lampbar" aria-hidden="true" />

        <!-- 圆柱转盘 -->
        <div class="absolute inset-0 z-[4]" style="transform-style: preserve-3d">
          <div ref="ringEl" class="absolute left-1/2 top-[40%] h-0 w-0">
            <div
              v-for="(honor, index) in honors"
              :key="honor.id"
              :ref="(el) => setCardRef(el, index)"
              class="absolute"
              :class="index === activeIndex ? 'is-active' : ''"
              :style="cardStyle(index)"
              style="transform-style: preserve-3d"
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
/* ===== 后墙幕布 =====
   幕布只画在舞台盒内，盒外是区块纯色 #0A0A0A，四边会留下亮度台阶（实测约 4 级）。
   用双向遮罩把幕布融进区块底色，舞台边界不再显形。 */
.backwall {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(196, 154, 74, 0.1), transparent 60%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.022) 0 2px,
      transparent 2px 46px
    ),
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

/* ===== 地面 =====
   地平线固定在 78%（= 脚本 CONE_BOTTOM_Y，光锥底边正好落在地面上，两者必须同步改）。
   地面只保留 12% 厚度，下移到贴近舞台底部，与上方卡片区拉开留白。 */
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

/* 透视地格：rotateX 让横线向地平线收拢。
   双向遮罩（上下淡出 + 左右淡出）削掉矩形硬边，地格才会「铺开」而不是一块亮板。
   地面压薄后倾角同步放缓（66°→56°），否则投影高度只剩十几像素、地格会整条消失。 */
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

/* 光落在地上的亮池（随地面一起收窄，避免亮池溢出到地面带之外） */
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

/* ===== 体积光锥（几何比例必须与脚本里的 CONE_* 常量一致） ===== */
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

/* 外扩雾 */
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

/* 主锥：blur 只给 5px，保住锥体边缘。高度 = 地平线 78%，底面落在新地平线上 */
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

/* 亮芯 */
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
  background: radial-gradient(
    ellipse at center top,
    rgba(240, 217, 160, 0.75),
    transparent 70%
  );
}

/* 暗角：把注意力压到中央光区（四边同样做遮罩过渡，避免与区块底色接缝） */
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

/* ===== 当前正对镜头的卡：金边提亮 + 自上而下的受光面 ===== */
.is-active :deep(.card-body) {
  border-color: rgba(240, 224, 176, 0.9);
  box-shadow:
    0 0 110px rgba(255, 236, 190, 0.34),
    0 26px 60px rgba(0, 0, 0, 0.6),
    inset 0 0 54px rgba(196, 154, 74, 0.12);
}

.is-active :deep(.lit) {
  opacity: 1;
  /* 呼吸挂在 .is-active 上而不是 .lit 本身：动画会接管 opacity，
     写在 .lit 上会把非活跃卡的 opacity: 0 也覆盖成亮 */
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
