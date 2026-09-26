<script setup lang="ts">
/**
 * VideoWorksBody —— 视频集内容体（content_type=video，R9 / R10 / §2.6 / §6.4）。
 * 自原 VideoWorksOverlay 平移：16:9 播放器（两侧待播小卡）+ 底栏
 * （序号 / 缩略图条 / 箭头），Esc 与关闭由外层 DetailOverlay 统一处理。
 * 移动端隐藏缩略图条，改 5 点指示。
 */
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import VideoPlayer from '@/components/home/VideoPlayer.vue'
import VideoThumbStrip from '@/components/home/VideoThumbStrip.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { assetUrl } from '@/utils/asset'
import { pad2 } from '@/utils/format'
import type { VideoItem } from '@/types/site'

const props = defineProps<{
  /** 已发布视频列表 */
  videos: VideoItem[]
  /** 是否加载中 */
  loading: boolean
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

/** ≥768 使用桌面尺寸。 */
const isMdUp = useMediaQuery('(min-width: 768px)')

const activeIndex = ref(0)
watch(
  () => props.videos,
  () => {
    activeIndex.value = 0
  }
)

const total = computed(() => props.videos.length)
const currentVideo = computed<VideoItem | null>(() => props.videos[activeIndex.value] ?? null)

/** 相邻待播小卡（环状）。 */
const prevVideo = computed<VideoItem | null>(() =>
  total.value ? props.videos[(activeIndex.value - 1 + total.value) % total.value] : null
)
const nextVideo = computed<VideoItem | null>(() =>
  total.value ? props.videos[(activeIndex.value + 1) % total.value] : null
)

/** 移动端指示点数量（最多 5）。 */
const mobileDots = computed(() => Math.min(total.value, 5))

/** 环状切换。 */
function go(index: number): void {
  const count = total.value
  if (count === 0) return
  activeIndex.value = ((index % count) + count) % count
}

function prev(): void {
  go(activeIndex.value - 1)
}

function nextWork(): void {
  go(activeIndex.value + 1)
}

/** 两侧小卡内联尺寸与位置（含 50% 透明 + 模糊 2px）。 */
function sideCardStyle(direction: 'prev' | 'next'): Record<string, string> {
  if (isMdUp.value) {
    return direction === 'prev'
      ? {
          width: '300px',
          height: '169px',
          left: 'calc(50% - 762px)',
          top: '50%',
          transform: 'translateY(-50%)'
        }
      : {
          width: '300px',
          height: '169px',
          left: 'calc(50% + 462px)',
          top: '50%',
          transform: 'translateY(-50%)'
        }
  }
  return direction === 'prev'
    ? { width: '132px', height: '74px', left: '-100px', bottom: '8px' }
    : { width: '132px', height: '74px', right: '-100px', bottom: '8px' }
}
</script>

<template>
  <div>
    <!-- 主区 -->
    <div class="relative flex items-center justify-center py-2 md:py-6">
      <!-- 两侧待播小卡（50% 透明 + 模糊 2px） -->
      <div
        v-for="card in [
          { key: 'prev', video: prevVideo },
          { key: 'next', video: nextVideo }
        ]"
        :key="card.key"
        v-show="card.video"
        class="pointer-events-none absolute overflow-hidden rounded-[2px] opacity-45 blur-[2px] md:top-1/2 md:-translate-y-1/2 md:opacity-50"
        :style="sideCardStyle(card.key as 'prev' | 'next')"
        aria-hidden="true"
      >
        <img
          v-if="card.video?.cover_url"
          :src="assetUrl(card.video.cover_url)"
          :alt="card.video.title"
          class="h-full w-full object-cover"
          draggable="false"
        />
      </div>

      <!-- 16:9 播放器：桌面宽度按视口高度封顶，保证 顶栏+播放器+底栏 一屏放下 -->
      <div
        class="v-frame relative z-10 aspect-video w-[342px] overflow-hidden rounded-[2px] border border-[rgba(196,154,74,0.3)] shadow-player"
      >
        <VideoPlayer v-if="currentVideo" :video="currentVideo" variant="overlay" />

        <!-- 加载 / 空状态 -->
        <div
          v-if="!currentVideo"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#100D0A]"
        >
          <p class="font-sans text-[13px] text-white/60">
            {{ loading ? '作品加载中…' : '该板块暂无作品' }}
          </p>
          <button
            v-if="!loading"
            type="button"
            class="font-sans text-[12px] text-accent-gold underline-offset-4 hover:underline"
            @click="emit('close')"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>

    <!-- 底栏 -->
    <footer class="pt-6">
      <div class="flex flex-col items-center gap-4">
        <span class="font-latin text-[12px] text-accent-gold" style="letter-spacing: 3px">
          {{ pad2(activeIndex + 1) }} / {{ pad2(total) }}
        </span>

        <!-- 桌面：箭头 + 缩略图条 -->
        <div class="hidden w-full items-center justify-center gap-6 md:flex">
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="上一支"
            @click="prev"
          >
            <AppIcon name="arrow-left" :size="18" />
          </button>
          <VideoThumbStrip :videos="videos" :active-index="activeIndex" @select="go" />
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="下一支"
            @click="nextWork"
          >
            <AppIcon name="arrow-right" :size="18" />
          </button>
        </div>

        <!-- 移动：5 点指示 -->
        <div class="flex items-center gap-1 md:hidden">
          <button
            v-for="dot in mobileDots"
            :key="dot"
            type="button"
            class="flex h-11 w-6 items-center justify-center"
            :aria-label="`第 ${dot} 支`"
            @click="go(dot - 1)"
          >
            <span
              class="block rounded-full transition-all"
              :class="
                dot - 1 === activeIndex
                  ? 'h-[3px] w-[20px] bg-accent-gold'
                  : 'h-[3px] w-[8px] bg-white/30'
              "
            />
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 桌面：播放器宽度受视口高度约束（顶栏 + 底栏约占 360px），900px 为宽度上限，
   保证 顶栏 + 播放器 + 底栏 一屏全貌、无需滚动 */
@media (min-width: 768px) {
  .v-frame {
    width: min(900px, calc((100vh - 360px) * 16 / 9));
  }
}
</style>
