<script setup lang="ts">
/**
 * SharePlayer —— 分享页主播放器（§3.2-3 / 4）。
 * 342×192 的 16:9；点击播放由 B 站 iframe 接管（复用 VideoPlayer 只读样式）。
 * 主视频信息行：序号（金 / Cormorant）+ 标题（Noto Serif SC 14）；**不显示时长**。
 * **不提供切换能力**（R16）。
 */
import { computed } from 'vue'
import VideoPlayer from '@/components/home/VideoPlayer.vue'
import { pad2 } from '@/utils/format'
import type { ShareVideo } from '@/types/share'

const props = defineProps<{
  /** 视频清单 */
  videos: ShareVideo[]
  /** 当前展示索引（固定为首支，分享页不切换） */
  activeIndex: number
}>()

const current = computed<ShareVideo | null>(() => props.videos[props.activeIndex] ?? null)
</script>

<template>
  <section v-if="current" class="mx-auto w-full max-w-[520px] px-6 pt-6">
    <div
      class="relative aspect-video w-full max-w-[342px] overflow-hidden rounded-[2px] border border-[rgba(196,154,74,0.3)]"
    >
      <VideoPlayer :video="current" variant="share" />
    </div>

    <!-- 主视频信息行（无时长） -->
    <div class="mt-4 flex items-center gap-3">
      <span class="font-latin text-[13px] text-accent-gold">{{ pad2(activeIndex + 1) }}</span>
      <span class="font-serif text-[14px] leading-6 text-txt-primary">{{ current.title }}</span>
    </div>
  </section>
</template>
