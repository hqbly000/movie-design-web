<script setup lang="ts">
/**
 * VideoPlayer —— 16:9 播放器（R9 / R10 / §2.6 / §6.4）。
 * 未播放：封面态 = 封面 + 顶部压暗 + 左上标题/副信息 + 右上「BILIBILI」来源标注 + 中央播放键。
 * 不做假进度条 / 假时长 / 假控制条——未点播放前不呈现任何"正在播放"的假象。
 * 点击播放：挂载 B 站 iframe 接管播放（切换视频时先卸载再重建）。
 * ⚠️ 右上角**不出现 4K / HDR 等画质标识**（R10）。
 */
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import AppIcon from '@/components/common/AppIcon.vue'
import { assetUrl } from '@/utils/asset'
import { buildEmbedUrl } from '@/utils/bilibili'
import { categoryLabel } from '@/utils/format'

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
const playIcon = computed(() => (isLarge.value ? 32 : 22))
const playButtonClass = computed(() =>
  isLarge.value ? 'h-[88px] w-[88px]' : 'h-14 w-14'
)

/** 切换视频：卸载 iframe 并重置为封面态。 */
watch(
  () => props.video.bv_id,
  () => {
    isEmbedded.value = false
  },
  { immediate: true }
)

/** 交给 B 站 iframe 接管播放。 */
function onPlay(): void {
  isEmbedded.value = true
}
</script>

<template>
  <div class="absolute inset-0 overflow-hidden bg-[#050505]">
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

    <!-- 封面控件层（未播放） -->
    <div v-if="!isEmbedded" class="absolute inset-0">
      <!-- 顶部压暗，保证标题可读 -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-1/3"
        style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.55), transparent)"
        aria-hidden="true"
      />

      <!-- 左上：白色标题 + 副信息（不含时长） -->
      <div class="absolute left-4 right-4 top-4 md:left-7 md:right-7 md:top-6">
        <p class="font-serif leading-snug text-white" :class="titleClass">
          {{ video.title }}
        </p>
        <p class="mt-1 font-sans text-white/65" :class="subClass">{{ subInfo }}</p>
      </div>

      <!-- 右上：BILIBILI 来源标注（无 4K/HDR 画质标识，R10） -->
      <div class="absolute top-4 right-4 md:top-6 md:right-7">
        <span
          class="inline-flex items-center rounded-[2px] border border-white/[0.22] bg-black/40 px-2 py-1 font-sans text-white/80"
          :class="badgeClass"
          style="letter-spacing: 1px"
          >BILIBILI</span
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
    </div>
  </div>
</template>
