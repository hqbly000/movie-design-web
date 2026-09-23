<script setup lang="ts">
/**
 * VideoPlayer —— 16:9 播放器（R9 / R10 / §2.6 / §6.4）。
 * 未播放：封面 + 自研控件层（左上白标题 / 右上「BILIBILI 嵌入播放」/ 中央播放键 / 进度条 / 控制条）。
 * 点击播放：挂载 B 站 iframe 接管播放（切换视频时先卸载再重建）。
 * ⚠️ 右上角**不出现 4K / HDR 等画质标识**（R10）。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import AppIcon from '@/components/common/AppIcon.vue'
import { assetUrl } from '@/utils/asset'
import { buildEmbedUrl } from '@/utils/bilibili'
import { categoryLabel, formatDuration } from '@/utils/format'

/** 播放器可接受的最小视频结构（兼容 VideoItem 与 ShareVideo）。 */
interface PlayableVideo {
  id?: number
  title: string
  bv_id: string
  year: number | null
  category_id: string | null
  cover_url: string | null
}

const props = withDefaults(
  defineProps<{
    /** 视频数据 */
    video: PlayableVideo
    /** 变体：overlay（全屏作品页）/ share（分享页，尺寸恒定偏小） */
    variant?: 'overlay' | 'share'
  }>(),
  { variant: 'overlay' }
)

/** ≥768 使用大尺寸控件。 */
const isMdUp = useMediaQuery('(min-width: 768px)')

/** 是否已交由 B 站 iframe 接管。 */
const isEmbedded = ref(false)
/** 自研控件层的模拟播放状态。 */
const isPlaying = ref(true)
/** 模拟进度秒数。 */
const elapsed = ref(0)
let timer: number | null = null

const rootRef = ref<HTMLElement | null>(null)

/** 稳定伪时长（82~204s），避免每次渲染跳动。 */
function hashBv(text: string): number {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 100000
  }
  return hash
}

const duration = computed(() => {
  const seed = props.video.id ?? hashBv(props.video.bv_id)
  return 82 + (Math.abs(seed) * 37) % 123
})

const progress = computed(() =>
  duration.value > 0 ? Math.min(1, elapsed.value / duration.value) : 0
)

/** 副信息「2024 · 城市影像」（**不含时长**）。 */
const subInfo = computed(() => {
  const parts: string[] = []
  if (props.video.year) parts.push(String(props.video.year))
  parts.push(categoryLabel(props.video.category_id))
  return parts.join(' · ')
})

const cover = computed(() => assetUrl(props.video.cover_url))
const embedSrc = computed(() => buildEmbedUrl(props.video.bv_id, true))

const isLarge = computed(() => props.variant === 'overlay' && isMdUp.value)

const titleClass = computed(() => (isLarge.value ? 'text-[22px]' : 'text-[13px]'))
const subClass = computed(() => (isLarge.value ? 'text-[12px]' : 'text-[9px]'))
const badgeClass = computed(() => (isLarge.value ? 'text-[11px]' : 'text-[9px]'))
const ctrlIcon = computed(() => (isLarge.value ? 18 : 16))
const playIcon = computed(() => (isLarge.value ? 32 : 22))
const playButtonClass = computed(() =>
  isLarge.value ? 'h-[88px] w-[88px]' : 'h-14 w-14'
)
const edgeClass = computed(() => (isLarge.value ? 'left-7 right-7' : 'left-4 right-4'))
const edgeTopClass = computed(() =>
  isLarge.value ? 'left-7 right-7 top-6' : 'left-4 right-4 top-4'
)
const barBottom = computed(() => (isLarge.value ? 'bottom-[62px]' : 'bottom-[52px]'))
const ctrlBottom = computed(() => (isLarge.value ? 'bottom-4' : 'bottom-3'))

function clearTimer(): void {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function startTimer(): void {
  clearTimer()
  timer = window.setInterval(() => {
    if (isEmbedded.value || !isPlaying.value) return
    elapsed.value = elapsed.value >= duration.value ? 0 : elapsed.value + 1
  }, 1000)
}

/** 交给 B 站 iframe 接管播放。 */
function onPlay(): void {
  isEmbedded.value = true
}

/** 切换视频：卸载 iframe 并重置为封面态。 */
watch(
  () => props.video.bv_id,
  () => {
    isEmbedded.value = false
    isPlaying.value = true
    elapsed.value = Math.round(duration.value * 0.4)
    startTimer()
  },
  { immediate: true }
)

onUnmounted(clearTimer)

function toggleFullscreen(): void {
  const el = rootRef.value
  if (!el) return
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void el.requestFullscreen?.()
  }
}

defineExpose({ isEmbedded })
</script>

<template>
  <div ref="rootRef" class="absolute inset-0 overflow-hidden bg-[#050505]">
    <!-- 封面 -->
    <img
      v-if="!isEmbedded && cover"
      :src="cover"
      :alt="video.title"
      class="absolute inset-0 h-full w-full object-cover"
      draggable="false"
    />
    <div v-else-if="!isEmbedded" class="absolute inset-0 bg-[#100D0A]" />

    <!-- B 站 iframe（点击播放后挂载，铺满 16:9 容器） -->
    <iframe
      v-if="isEmbedded"
      :src="embedSrc"
      class="absolute inset-0 h-full w-full"
      allowfullscreen
      scrolling="no"
      frameborder="0"
      :title="video.title"
    />

    <!-- 自研控件层（未播放） -->
    <div v-if="!isEmbedded" class="absolute inset-0">
      <!-- 顶部 / 底部压暗，保证文字与控件可读 -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-1/3"
        style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), transparent)"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-[50%]"
        style="background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent)"
        aria-hidden="true"
      />

      <!-- 左上：白色标题 + 副信息（不含时长） -->
      <div class="absolute" :class="edgeTopClass">
        <p class="font-serif leading-snug text-white" :class="titleClass">
          {{ video.title }}
        </p>
        <p class="mt-1 font-sans text-white/65" :class="subClass">{{ subInfo }}</p>
      </div>

      <!-- 右上：仅「BILIBILI 嵌入播放」标识（无 4K/HDR） -->
      <div class="absolute top-4 right-4 md:top-6 md:right-7">
        <span
          class="inline-flex items-center rounded-[2px] border border-white/[0.22] bg-black/40 px-2 py-1 font-sans text-white/80"
          :class="badgeClass"
          style="letter-spacing: 1px"
          >BILIBILI 嵌入播放</span
        >
      </div>

      <!-- 中央播放键 -->
      <button
        type="button"
        class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/75 bg-white/15 transition-colors hover:bg-white/25"
        :class="playButtonClass"
        aria-label="播放"
        @click="onPlay"
      >
        <AppIcon name="play" :size="playIcon" class="translate-x-[2px] text-white" />
      </button>

      <!-- 进度条 -->
      <div class="absolute" :class="[edgeClass, barBottom]">
        <div class="relative h-[3px] w-full rounded-full bg-white/[0.28]">
          <div
            class="absolute inset-y-0 left-0 rounded-full bg-accent-gold"
            :style="{ width: `${progress * 100}%` }"
          />
          <span
            class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-gold"
            :style="{ left: `${progress * 100}%` }"
          />
        </div>
      </div>

      <!-- 控制条：仅全屏作品页（overlay）展示；
           分享页（share）按 §3.2-3 只保留「底部压暗 + 进度条」，**不显示时长/控制条**（R16）。 -->
      <div
        v-if="variant === 'overlay'"
        class="absolute flex items-center justify-between"
        :class="[edgeClass, ctrlBottom]"
      >
        <div class="flex items-center gap-3 text-white md:gap-4">
          <button
            type="button"
            :aria-label="isPlaying ? '暂停' : '播放'"
            @click="isPlaying = !isPlaying"
          >
            <AppIcon :name="isPlaying ? 'pause' : 'play'" :size="ctrlIcon" />
          </button>
          <span class="font-latin text-[11px] text-white/85 md:text-[12px]">
            {{ formatDuration(elapsed) }} / {{ formatDuration(duration) }}
          </span>
        </div>
        <div class="flex items-center gap-3 text-white md:gap-4">
          <button type="button" aria-label="音量">
            <AppIcon name="volume" :size="ctrlIcon" />
          </button>
          <button type="button" aria-label="全屏" @click="toggleFullscreen">
            <AppIcon name="fullscreen" :size="ctrlIcon" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
