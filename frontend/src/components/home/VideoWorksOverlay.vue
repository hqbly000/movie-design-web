<script setup lang="ts">
/**
 * VideoWorksOverlay —— 全屏视频作品页（R9 / R10 / §2.6 / §6.4）。
 * 遮罩 #050505；顶栏 + 16:9 播放器（两侧待播小卡）+ 底栏（序号 / 缩略图条 / 箭头）。
 * `Esc` 关闭；←/→ 切换；关闭后滚动位置不跳变（由 DefaultLayout 的滚动锁保证）。
 * 移动端隐藏缩略图条，改 5 点指示。
 */
import { computed, ref, watch } from 'vue'
import { useEventListener, useMediaQuery } from '@vueuse/core'
import VideoPlayer from '@/components/home/VideoPlayer.vue'
import VideoThumbStrip from '@/components/home/VideoThumbStrip.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useSiteStore } from '@/stores/site'
import { useUiStore } from '@/stores/ui'
import { assetUrl } from '@/utils/asset'
import { pad2, segmentEnglish } from '@/utils/format'
import type { VideoItem } from '@/types/site'

const site = useSiteStore()
const ui = useUiStore()

/** ≥768 使用桌面尺寸。 */
const isMdUp = useMediaQuery('(min-width: 768px)')

const videos = ref<VideoItem[]>([])
const loading = ref(false)
const activeIndex = ref(0)

/** 当前板块（找不到时回退首个）。 */
const segment = computed(
  () => site.segments.find((item) => item.id === ui.activeSegmentId) ?? site.segments[0] ?? null
)

/** 顶栏 kicker：「板块名 · 英文名」。 */
const kicker = computed(() => {
  const seg = segment.value
  return seg ? `${segmentEnglish(seg.name)} · ${seg.name}` : 'WORKS · 视频作品'
})

const total = computed(() => videos.value.length)
const currentVideo = computed<VideoItem | null>(() => videos.value[activeIndex.value] ?? null)

/** 相邻待播小卡（环状）。 */
const prevVideo = computed<VideoItem | null>(() =>
  total.value ? videos.value[(activeIndex.value - 1 + total.value) % total.value] : null
)
const nextVideo = computed<VideoItem | null>(() =>
  total.value ? videos.value[(activeIndex.value + 1) % total.value] : null
)

/** 移动端指示点数量（最多 5）。 */
const mobileDots = computed(() => Math.min(total.value, 5))

/** 加载当前板块作品（store 内含缓存与兜底）。 */
async function loadWorks(): Promise<void> {
  const seg = segment.value
  if (!seg) {
    videos.value = []
    return
  }
  loading.value = true
  try {
    const data = await site.loadSegmentVideos(seg)
    videos.value = data.videos
    activeIndex.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  () => [ui.worksOpen, ui.activeSegmentId],
  () => {
    if (ui.worksOpen) void loadWorks()
  },
  { immediate: true }
)

function close(): void {
  ui.closeWorks()
}

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
    const size = {
      width: '300px',
      height: '169px',
      opacity: '0.5',
      filter: 'blur(2px)',
      top: '50%',
      transform: 'translateY(-50%)'
    }
    return direction === 'prev'
      ? { ...size, left: 'calc(50% - 762px)' }
      : { ...size, left: 'calc(50% + 462px)' }
  }
  const size = {
    width: '132px',
    height: '74px',
    opacity: '0.45',
    filter: 'blur(2px)',
    top: 'auto',
    bottom: '8px',
    transform: 'none'
  }
  return direction === 'prev' ? { ...size, left: '-100px' } : { ...size, right: '-100px' }
}

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (!ui.worksOpen) return
  if (event.key === 'Escape') {
    close()
  } else if (event.key === 'ArrowLeft') {
    prev()
  } else if (event.key === 'ArrowRight') {
    nextWork()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out-soft"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="ui.worksOpen"
        class="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-[#050505]"
        role="dialog"
        aria-modal="true"
        :aria-label="`${kicker} 视频作品`"
      >
        <!-- 顶栏 -->
        <header class="ly-container flex shrink-0 items-start justify-between gap-6 pt-8 lg:pt-10">
          <div>
            <p
              class="font-sans text-[12px] text-accent-gold"
              style="letter-spacing: 4px"
            >
              {{ kicker }}
            </p>
            <h2 class="mt-2 font-serif text-[24px] leading-tight text-txt-primary lg:text-[28px]">
              视频作品
            </h2>
            <p class="mt-2 font-sans text-[12px] text-white/40">
              共 {{ total }} 支短片 · 支持 B 站嵌入播放
            </p>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="关闭（Esc）"
            @click="close"
          >
            <AppIcon name="close" :size="20" />
          </button>
        </header>

        <!-- 主区 -->
        <div class="relative flex flex-1 items-center justify-center px-4 py-8 lg:py-12">
          <!-- 两侧待播小卡（50% 透明 + 模糊 2px） -->
          <div
            v-for="card in [
              { key: 'prev', video: prevVideo },
              { key: 'next', video: nextVideo }
            ]"
            :key="card.key"
            v-show="card.video"
            class="pointer-events-none absolute top-1/2 -translate-y-1/2 overflow-hidden rounded-[2px]"
            :style="
              isMdUp
                ? { ...sideCardStyle(card.key as 'prev' | 'next'), opacity: '0.5', filter: 'blur(2px)' }
                : {
                    ...sideCardStyle(card.key as 'prev' | 'next'),
                    opacity: '0.45',
                    filter: 'blur(2px)',
                    top: 'auto',
                    bottom: '8px',
                    transform: 'none'
                  }
            "
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

          <!-- 16:9 播放器 -->
          <div
            class="relative z-10 aspect-video w-[342px] overflow-hidden rounded-[2px] border border-[rgba(196,154,74,0.3)] shadow-player md:w-[900px]"
          >
            <VideoPlayer v-if="currentVideo" :video="currentVideo" variant="overlay" />

            <!-- 加载 / 空状态 -->
            <div
              v-if="!currentVideo"
              class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#100D0A]"
            >
              <p class="font-sans text-[13px] text-white/60">
                {{ loading ? '作品加载中…' : '该板块暂无已发布作品' }}
              </p>
              <button
                v-if="!loading"
                type="button"
                class="font-sans text-[12px] text-accent-gold underline-offset-4 hover:underline"
                @click="close"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>

        <!-- 底栏 -->
        <footer class="ly-container shrink-0 pb-8 lg:pb-10">
          <div class="flex flex-col items-center gap-4">
            <span
              class="font-latin text-[12px] text-accent-gold"
              style="letter-spacing: 3px"
            >
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
              <VideoThumbStrip
                :videos="videos"
                :active-index="activeIndex"
                @select="go"
              />
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

            <p class="font-sans text-[11px] text-white/40">
              <span class="md:hidden">点击播放 · 支持 B 站嵌入</span>
              <span class="hidden md:inline">点击播放 · 支持 B 站嵌入 · Esc 关闭</span>
            </p>
          </div>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>
