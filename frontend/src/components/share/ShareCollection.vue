<script setup lang="ts">
/**
 * ShareCollection —— 合集体信息区（§3.2-2）。
 * kicker「TEMPORARY COLLECTION · 临时合集」→ 合集名 → 说明行 → note（有值才展示）。
 */
import { computed } from 'vue'
import type { ShareCollection } from '@/types/share'

const props = defineProps<{
  /** 合集数据 */
  collection: ShareCollection
}>()

/** 说明行：「共 N 支短片 · 供预览确认」。 */
const infoLine = computed(() => `共 ${props.collection.videos.length} 支短片 · 供预览确认`)
</script>

<template>
  <section class="mx-auto w-full max-w-[520px] px-6 pt-8">
    <p class="font-sans text-[11px] text-accent-gold" style="letter-spacing: 4px">
      TEMPORARY COLLECTION · 临时合集
    </p>
    <h1 class="mt-4 font-serif text-[32px] leading-[44px] text-txt-primary">
      {{ collection.collection_name }}
    </h1>
    <p class="mt-3 font-sans text-[13px] leading-6 text-white/70">{{ infoLine }}</p>
    <p
      v-if="collection.note"
      class="mt-3 rounded-[2px] border border-white/[0.12] bg-surface p-4 font-sans text-[13px] leading-6 text-white/[0.85]"
    >
      {{ collection.note }}
    </p>
  </section>
</template>
