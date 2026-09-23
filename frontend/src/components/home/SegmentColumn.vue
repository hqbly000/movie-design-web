<script setup lang="ts">
/**
 * SegmentColumn —— 单个业务板块（R8 / R26 / §2.5）。
 * 桌面：五列之一，预览图为底 + 上下渐变压暗；首列为展开态（象牙白实心按钮）。
 * 移动：纵向图带（390×96），左侧名称 + 右侧箭头。
 */
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import AppButton from '@/components/common/AppButton.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import ImagePlaceholder from '@/components/common/ImagePlaceholder.vue'
import { ref } from 'vue'
import { assetUrl } from '@/utils/asset'
import { segmentIcon } from '@/utils/format'
import type { Segment } from '@/types/site'

const props = defineProps<{
  /** 板块数据 */
  segment: Segment
  /** 桌面列 flex-grow 值（手风琴展开） */
  grow: number
  /** 是否为首列（展开态） */
  isFirst: boolean
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'hover', value: boolean): void
}>()

/** ≥768 使用桌面五列布局，否则使用纵向图带。 */
const isTabletUp = useMediaQuery('(min-width: 768px)')

const imageLoaded = ref(false)

/** 预览图绝对地址。 */
const preview = computed(() => assetUrl(props.segment.preview_image_url))

/** 副文案（设计未给定具体文案，此处按板块语义给出短句）。 */
const SUB_COPY: Record<string, string> = {
  人像写真: '自然光 · 真实情绪',
  婚礼纪实: '记录仪式每一刻',
  商业摄影: '品牌影像 · 器物之光',
  活动跟拍: '现场纪实 · 舞台瞬间',
  视频短片: '电影感画面叙事'
}

const subCopy = computed(() => SUB_COPY[props.segment.name] ?? '光影影像作品')

const columnStyle = computed<Record<string, string>>(() => ({
  flexGrow: String(props.grow),
  flexShrink: '1',
  flexBasis: '0%',
  transition: 'flex-grow 220ms cubic-bezier(0.22, 0.61, 0.36, 1)'
}))

/** 移动端图带也支持内容类型预留（gallery/article 暂按视频处理）。 */
const contentTypeHint = computed(() => {
  if (props.segment.content_type === 'gallery') return '图集'
  if (props.segment.content_type === 'article') return '文章'
  return ''
})
</script>

<template>
  <!-- 桌面：纵向列（容器整体可点，内部「查看作品」为唯一可聚焦控件，
       避免出现 button 嵌套 button 的无效结构） -->
  <div
    v-if="isTabletUp"
    class="group relative flex h-[560px] cursor-pointer flex-col items-center justify-center overflow-hidden text-center"
    :style="columnStyle"
    @click="emit('open')"
    @mouseenter="emit('hover', true)"
    @mouseleave="emit('hover', false)"
    @focusin="emit('hover', true)"
    @focusout="emit('hover', false)"
  >
    <img
      v-if="preview"
      :src="preview"
      :alt="segment.name"
      class="absolute inset-0 h-full w-full object-cover transition-transform duration-500"
      draggable="false"
      @load="imageLoaded = true"
      @error="imageLoaded = true"
    />
    <ImagePlaceholder :active="!imageLoaded" />

    <!-- 上下渐变压暗（56% → 24% → 60%） -->
    <span
      class="pointer-events-none absolute inset-0"
      style="
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.56) 0%,
          rgba(0, 0, 0, 0.24) 50%,
          rgba(0, 0, 0, 0.6) 100%
        );
      "
      aria-hidden="true"
    />

    <span class="relative z-[2] flex flex-col items-center gap-4 px-6">
      <AppIcon :name="segmentIcon(segment.name)" :size="40" :stroke-width="1.3" class="text-white" />
      <span
        class="font-serif text-[24px] text-white xl:text-[26px]"
        style="letter-spacing: 4px"
        >{{ segment.name }}</span
      >
      <span class="font-sans text-[13px] text-white/70">{{ subCopy }}</span>
      <AppButton
        :variant="isFirst ? 'ivory' : 'ivory-outline'"
        class="mt-2"
        :aria-label="`查看「${segment.name}」作品`"
        @click.stop="emit('open')"
      >
        查看作品
      </AppButton>
    </span>
  </div>

  <!-- 移动：纵向图带 -->
  <button
    v-else
    type="button"
    class="relative flex h-24 w-full items-center justify-between overflow-hidden px-6 text-left"
    :aria-label="`查看「${segment.name}」作品`"
    @click="emit('open')"
  >
    <img
      v-if="preview"
      :src="preview"
      :alt="segment.name"
      class="absolute inset-0 h-full w-full object-cover"
      draggable="false"
      @load="imageLoaded = true"
      @error="imageLoaded = true"
    />
    <ImagePlaceholder :active="!imageLoaded" />
    <span
      class="pointer-events-none absolute inset-0"
      style="background: linear-gradient(90deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.32))"
      aria-hidden="true"
    />
    <span class="relative z-[2] flex items-center gap-3">
      <AppIcon :name="segmentIcon(segment.name)" :size="22" :stroke-width="1.4" class="text-white" />
      <span class="font-serif text-[18px] text-white" style="letter-spacing: 3px">{{
        segment.name
      }}</span>
      <span v-if="contentTypeHint" class="font-sans text-[10px] text-white/50">{{
        contentTypeHint
      }}</span>
    </span>
    <AppIcon
      name="chevron-right"
      :size="20"
      class="relative z-[2] text-white/80"
    />
  </button>
</template>
