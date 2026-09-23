<script setup lang="ts">
/**
 * VideoThumbStrip —— 底部 16:9 缩略图条（§2.6）。
 * 桌面 96×54，当前项金框；移动端不显示（父级改渲染 5 点指示）。
 */
import { computed } from 'vue'
import { assetUrl } from '@/utils/asset'

interface ThumbVideo {
  title: string
  cover_url: string | null
}

const props = defineProps<{
  /** 视频列表 */
  videos: ThumbVideo[]
  /** 当前索引 */
  activeIndex: number
}>()

const emit = defineEmits<{ (e: 'select', index: number): void }>()

const thumbWidth = 96
const thumbHeight = 54

/** 当前项居中所需的横向滚动偏移。 */
const offset = computed(() => {
  const center = props.activeIndex * (thumbWidth + 10)
  return Math.max(0, center - 220)
})
</script>

<template>
  <div class="relative w-full max-w-[520px] overflow-hidden">
    <div
      class="flex gap-[10px] transition-transform duration-[360ms] ease-out-soft"
      :style="{ transform: `translateX(-${offset}px)` }"
    >
      <button
        v-for="(video, index) in videos"
        :key="`${video.title}-${index}`"
        type="button"
        class="relative shrink-0 overflow-hidden rounded-[2px] border transition-colors"
        :class="
          index === activeIndex
            ? 'border-accent-gold'
            : 'border-transparent hover:border-white/40'
        "
        :style="{ width: `${thumbWidth}px`, height: `${thumbHeight}px` }"
        :aria-label="`播放第 ${index + 1} 支：${video.title}`"
        :aria-current="index === activeIndex"
        @click="emit('select', index)"
      >
        <img
          v-if="video.cover_url"
          :src="assetUrl(video.cover_url)"
          :alt="video.title"
          class="h-full w-full object-cover"
          :class="index === activeIndex ? 'opacity-100' : 'opacity-60'"
          draggable="false"
        />
        <span v-else class="block h-full w-full bg-[#1A1712]" />
      </button>
    </div>
  </div>
</template>
