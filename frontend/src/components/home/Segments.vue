<script setup lang="ts">
/**
 * Segments —— 业务板块五列（R8 / R9 / §2.5 / §6.7）。
 * 桌面整幅宽 560 高五列横排（首列展开 360 + 其余 4×270），悬浮轻微展开；
 * 移动端为纵向图带。点击板块进入全屏视频作品页。
 */
import { computed, ref } from 'vue'
import SegmentColumn from '@/components/home/SegmentColumn.vue'
import { useUiStore } from '@/stores/ui'
import type { Segment } from '@/types/site'

const props = defineProps<{
  /** 板块列表（恰好 5 条） */
  segments: Segment[]
}>()

const ui = useUiStore()

/** 当前悬浮（或聚焦）的列索引。 */
const hoveredIndex = ref<number | null>(null)

/** 各列 flex-grow：首列 36、其余 27；悬浮列 +5（手风琴轻微展开）。 */
const grows = computed(() =>
  props.segments.map((segment, index) => {
    const base = index === 0 ? 36 : 27
    return index === hoveredIndex.value ? base + 5 : base
  })
)

function openSegment(segment: Segment): void {
  ui.openWorks(segment.id, segment.preview_image_url ?? '')
}

function setHover(index: number, value: boolean): void {
  if (value) {
    hoveredIndex.value = index
  } else if (hoveredIndex.value === index) {
    hoveredIndex.value = null
  }
}
</script>

<template>
  <section id="segments" class="relative w-full bg-[#0A0A0A]">
    <!-- 「作品展示」导航锚点（与业务板块同一区块，稍下偏移） -->
    <span id="works" class="block h-0 w-0" aria-hidden="true" />

    <!-- 单容器渲染，避免桌面/移动重复 DOM：桌面五列手风琴，移动纵向图带。
         列布局由 SegmentColumn 内部按断点切换。 -->
    <div class="mx-auto flex w-full flex-col md:max-w-[1440px] md:flex-row">
      <SegmentColumn
        v-for="(segment, index) in segments"
        :key="segment.id"
        :segment="segment"
        :grow="grows[index] ?? 27"
        :is-first="index === 0"
        @open="openSegment(segment)"
        @hover="(value) => setHover(index, value)"
      />
    </div>
  </section>
</template>
