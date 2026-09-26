<script setup lang="ts">
/**
 * SegmentDetailOverlay —— 业务板块详情遮罩（一套壳 + 三种内容体）。
 * 按 segments.content_type 切换内容体：video → 播放器作品页；
 * gallery → 图集 + 灯箱；article → 轻格式图文。
 * video / gallery 的 body 作为板块简介展示；底部统一「上一 / 下一板块」导流。
 */
import { computed, ref, watch } from 'vue'
import DetailOverlay from '@/components/detail/DetailOverlay.vue'
import VideoWorksBody from '@/components/detail/VideoWorksBody.vue'
import GalleryBody from '@/components/detail/GalleryBody.vue'
import ArticleBody from '@/components/detail/ArticleBody.vue'
import { assetUrl } from '@/utils/asset'
import { segmentEnglish, segmentTypeLabel } from '@/utils/format'
import { useSiteStore } from '@/stores/site'
import { useUiStore } from '@/stores/ui'
import type { SegmentContent } from '@/types/site'

const site = useSiteStore()
const ui = useUiStore()

const detailRef = ref<InstanceType<typeof DetailOverlay> | null>(null)
const content = ref<SegmentContent | null>(null)
const loading = ref(false)

/** 当前板块（找不到时回退首个）。 */
const segment = computed(
  () => site.segments.find((item) => item.id === ui.activeSegmentId) ?? site.segments[0] ?? null
)

const kicker = computed(() => {
  const seg = segment.value
  return seg ? `${segmentEnglish(seg.name)} · ${seg.name}` : 'WORKS · 板块详情'
})
const chip = computed(() => (segment.value ? segmentTypeLabel(segment.value.content_type) : ''))
const ariaLabel = computed(() => `${segment.value?.name ?? ''} · 板块详情`)

/** 类型与数量说明行。 */
const meta = computed(() => {
  const seg = segment.value
  if (!seg) return ''
  if (seg.content_type === 'video') {
    const count = content.value ? content.value.videos.length : seg.item_count
    return `共 ${count} 支短片`
  }
  if (seg.content_type === 'gallery') {
    const count = content.value ? content.value.images.length : seg.item_count
    return `${count} 张图片 · 点击查看大图`
  }
  return '图文介绍'
})

/** 板块简介（video / gallery 可选；article 的 body 即正文不在此展示）。 */
const intro = computed(() => {
  const type = segment.value?.content_type
  return type && type !== 'article' ? content.value?.body ?? '' : ''
})

/** 相邻板块（环状）。 */
const adjacent = computed(() => {
  const list = site.segments
  const index = list.findIndex((item) => item.id === segment.value?.id)
  if (index < 0) return { prev: null, next: null }
  return {
    prev: list[(index - 1 + list.length) % list.length] ?? null,
    next: list[(index + 1) % list.length] ?? null
  }
})

/** 加载当前板块内容（store 内含会话缓存与兜底）。 */
async function load(): Promise<void> {
  const seg = segment.value
  if (!seg) return
  loading.value = true
  content.value = null
  try {
    content.value = await site.loadSegmentContent(seg)
  } finally {
    loading.value = false
  }
}

watch(
  () => [ui.worksOpen, ui.activeSegmentId],
  () => {
    if (ui.worksOpen) {
      detailRef.value?.scrollToTop()
      void load()
    }
  },
  { immediate: true }
)

function openAdjacent(id: number, preview: string | null): void {
  ui.openWorks(id, preview ?? '')
}
</script>

<template>
  <DetailOverlay
    ref="detailRef"
    :open="ui.worksOpen"
    :kicker="kicker"
    :title="segment?.name ?? ''"
    :chip="chip"
    :meta="meta"
    :dialog-label="ariaLabel"
    @close="ui.closeWorks()"
  >
    <!-- 图片集：简介在网格上方（内容页，滚动为预期行为） -->
    <ArticleBody
      v-if="segment?.content_type === 'gallery' && intro"
      :body="intro"
      class="mb-9"
    />

    <!-- 视频集：主体保持一屏全貌，简介挪到首屏之下 -->
    <VideoWorksBody
      v-if="segment?.content_type === 'video'"
      :key="`video-${segment.id}`"
      :videos="content?.videos ?? []"
      :loading="loading"
      @close="ui.closeWorks()"
    />

    <!-- 视频集的板块简介（首屏之下） -->
    <ArticleBody
      v-if="segment?.content_type === 'video' && intro"
      :body="intro"
      class="mt-12"
    />

    <!-- 图片集 -->
    <GalleryBody
      v-if="segment?.content_type === 'gallery'"
      :key="`gallery-${segment.id}`"
      :images="content?.images ?? []"
    />

    <!-- 图文介绍 -->
    <ArticleBody
      v-if="segment?.content_type === 'article'"
      :key="`article-${segment.id}`"
      :body="content?.body ?? null"
    />

    <!-- 相邻板块导流（三种内容体统一收尾） -->
    <nav
      class="mt-14 grid grid-cols-2 divide-x divide-border-hairline border border-border-hairline"
      aria-label="相邻板块"
    >
      <button
        v-if="adjacent.prev"
        type="button"
        class="flex items-center gap-4 overflow-hidden px-4 py-4 text-left transition-colors hover:bg-white/[0.03] md:px-[22px] md:py-[18px]"
        :aria-label="`上一板块：${adjacent.prev.name}`"
        @click="openAdjacent(adjacent.prev.id, adjacent.prev.preview_image_url)"
      >
        <img
          v-if="adjacent.prev.preview_image_url"
          :src="assetUrl(adjacent.prev.preview_image_url)"
          alt=""
          class="h-[54px] w-24 shrink-0 rounded-[2px] object-cover md:h-[72px] md:w-32"
          draggable="false"
        />
        <span>
          <span class="block font-sans text-[11px] text-white/45" style="letter-spacing: 2px">
            ← 上一板块 · {{ segmentEnglish(adjacent.prev.name) }}
          </span>
          <span class="mt-1.5 block font-serif text-[16px] tracking-[2px] text-ivory md:text-[17px]">
            {{ adjacent.prev.name }}
          </span>
        </span>
      </button>
      <button
        v-if="adjacent.next"
        type="button"
        class="flex items-center justify-end gap-4 overflow-hidden px-4 py-4 text-right transition-colors hover:bg-white/[0.03] md:px-[22px] md:py-[18px]"
        :aria-label="`下一板块：${adjacent.next.name}`"
        @click="openAdjacent(adjacent.next.id, adjacent.next.preview_image_url)"
      >
        <span>
          <span class="block font-sans text-[11px] text-white/45" style="letter-spacing: 2px">
            下一板块 · {{ segmentEnglish(adjacent.next.name) }} →
          </span>
          <span class="mt-1.5 block font-serif text-[16px] tracking-[2px] text-ivory md:text-[17px]">
            {{ adjacent.next.name }}
          </span>
        </span>
        <img
          v-if="adjacent.next.preview_image_url"
          :src="assetUrl(adjacent.next.preview_image_url)"
          alt=""
          class="h-[54px] w-24 shrink-0 rounded-[2px] object-cover md:h-[72px] md:w-32"
          draggable="false"
        />
      </button>
    </nav>

    <template #hint>
      <p class="font-sans text-[11px] text-white/35" style="letter-spacing: 2px">Esc 关闭</p>
    </template>
  </DetailOverlay>
</template>
