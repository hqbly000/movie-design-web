<script setup lang="ts">
/**
 * ShareList —— 合集清单（§3.2-5 / R17）。
 * 每行：缩略图 88×50 + 标题 13 + 类型/年份 10（白 50%）。
 * 当前项**只用金色描边高亮（40%）+ 极淡暖底**，**不加左侧竖条**（R17）；**不可点击切换**（R16）。
 */
import { computed } from 'vue'
import { assetUrl } from '@/utils/asset'
import { categoryLabel, formatDate } from '@/utils/format'
import type { ShareVideo } from '@/types/share'

const props = defineProps<{
  /** 视频清单 */
  videos: ShareVideo[]
  /** 当前项索引 */
  activeIndex: number
  /** 生成时间 */
  generatedAt: string | null
}>()

const generatedLabel = computed(() =>
  props.generatedAt ? `生成于 ${formatDate(props.generatedAt)}` : ''
)

/** 类型 · 年份。 */
function metaOf(video: ShareVideo): string {
  const parts: string[] = [categoryLabel(video.category_id)]
  if (video.year) parts.push(String(video.year))
  return parts.join(' · ')
}
</script>

<template>
  <section class="mx-auto w-full max-w-[520px] px-6 pt-10">
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="font-serif text-[16px] text-txt-primary">
        本合集包含 · {{ videos.length }} 支
      </h2>
      <span v-if="generatedLabel" class="font-sans text-[11px] text-white/50">{{
        generatedLabel
      }}</span>
    </div>

    <ul class="mt-5 flex flex-col gap-2">
      <li
        v-for="(video, index) in videos"
        :key="`${video.bv_id}-${index}`"
        class="flex items-center gap-3 rounded-[2px] border px-2 py-2"
        :class="
          index === activeIndex
            ? 'border-[rgba(196,154,74,0.4)] bg-[rgba(196,154,74,0.06)]'
            : 'border-transparent'
        "
        :aria-current="index === activeIndex"
      >
        <img
          v-if="video.cover_url"
          :src="assetUrl(video.cover_url)"
          :alt="video.title"
          class="h-[50px] w-[88px] shrink-0 rounded-[2px] object-cover"
          draggable="false"
        />
        <span v-else class="h-[50px] w-[88px] shrink-0 rounded-[2px] bg-[#1A1712]" />
        <span class="min-w-0 flex-1">
          <span class="block truncate font-sans text-[13px] text-txt-primary">{{
            video.title
          }}</span>
          <span class="mt-1 block font-sans text-[10px] text-white/50">{{
            metaOf(video)
          }}</span>
        </span>
      </li>
    </ul>
  </section>
</template>
