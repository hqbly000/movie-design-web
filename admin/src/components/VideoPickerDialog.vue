<script setup lang="ts">
/**
 * 「选择视频」弹框（§5.5 / R23）：
 * - 叠在新建分发弹框之上（默认遮罩 50%）
 * - 搜索（标题 / BV 号）+ 分类筛选胶囊
 * - 勾选顺序即生成清单顺序（Map 保序）
 * - 底部「已选 N 支」+ 取消/确定选择，确定后回填
 */
import { computed, ref, watch } from 'vue'
import { listVideos } from '@/api/videos'
import { assetUrl } from '@/utils/asset'
import { CATEGORIES, MAX_PAGE_SIZE } from '@/utils/constants'
import { categoryLabel } from '@/utils/labels'
import { friendlyErrorMessage } from '@/utils/errors'
import { useToastStore } from '@/stores/toast'
import type { Video } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    selected?: Video[]
    zIndex?: number
    overlayOpacity?: number
  }>(),
  { selected: () => [], zIndex: 1200, overlayOpacity: 0.5 }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', videos: Video[]): void
}>()

const toast = useToastStore()
const all = ref<Video[]>([])
const loading = ref(false)
const keyword = ref('')
const category = ref('')
/** 保序的已选集合：key=video.id，value=Video */
const picked = ref<Map<number, Video>>(new Map())

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return all.value.filter((v) => {
    const matchKw =
      !kw || v.title.toLowerCase().includes(kw) || v.bv_id.toLowerCase().includes(kw)
    const matchCat = !category.value || v.category_id === category.value
    return matchKw && matchCat
  })
})

async function load(): Promise<void> {
  loading.value = true
  try {
    // 草稿不出现在合选中（§5.2 设计决策）
    const res = await listVideos({ page: 1, size: MAX_PAGE_SIZE, status: 'published' })
    const list = res.items.slice()
    // 已选项（如板块既有清单）即使非 published 也需可见，避免确认时被静默丢弃
    for (const v of props.selected ?? []) {
      if (!list.some((x) => x.id === v.id)) list.push(v)
    }
    all.value = list
  } catch (e) {
    console.error('[选择视频] 加载视频库失败', e)
    toast.error(friendlyErrorMessage(e, '视频列表加载失败'))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const map = new Map<number, Video>()
      // 保留「视频库→生成临时合集」预选顺序
      for (const v of props.selected ?? []) map.set(v.id, v)
      picked.value = map
      keyword.value = ''
      category.value = ''
      void load()
    }
  }
)

function isPicked(id: number): boolean {
  return picked.value.has(id)
}
function toggle(video: Video): void {
  const map = picked.value
  if (map.has(video.id)) map.delete(video.id)
  else map.set(video.id, video)
  picked.value = new Map(map)
}
function close(): void {
  emit('update:modelValue', false)
}
function confirm(): void {
  emit('confirm', [...picked.value.values()])
  close()
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="选择视频"
    :width="600"
    :overlay-opacity="overlayOpacity"
    :z-index="zIndex"
    body-padding
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <div class="relative">
        <AppIcon name="search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-ad-text-4" />
        <input v-model="keyword" class="ad-input pl-9" placeholder="搜索标题 / BV 号" />
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="ad-chip"
          :class="{ 'is-active': category === '' }"
          @click="category = ''"
        >
          全部
        </button>
        <button
          v-for="c in CATEGORIES"
          :key="c.key"
          type="button"
          class="ad-chip"
          :class="{ 'is-active': category === c.key }"
          @click="category = c.key"
        >
          {{ c.label }}
        </button>
      </div>
    </div>

    <div class="mt-3 -mx-1 max-h-[46vh] overflow-y-auto">
      <div v-if="loading" class="flex flex-col gap-2 px-1">
        <div v-for="i in 5" :key="i" class="ad-skeleton h-[52px] rounded-ctrl" />
      </div>
      <p v-else-if="!filtered.length" class="py-10 text-center text-[13px] text-ad-text-3">没有符合条件的视频</p>
      <template v-else>
        <button
          v-for="v in filtered"
          :key="v.id"
          type="button"
          data-video-item
          class="w-full flex items-center gap-3 px-2 py-2 rounded-ctrl text-left hover:bg-row-hover transition-colors"
          @click="toggle(v)"
        >
        <span
          class="w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors"
          :class="isPicked(v.id) ? 'bg-accent border-accent text-white' : 'border-ad-border-control bg-white'"
        >
          <AppIcon v-if="isPicked(v.id)" name="check" :size="12" :stroke-width="3" />
        </span>
        <img
          :src="assetUrl(v.cover_url)"
          alt=""
          class="w-[52px] h-[30px] rounded-[4px] object-cover bg-ad-fill shrink-0"
        />
        <span class="min-w-0 flex-1">
          <span class="block text-[13px] text-ad-text truncate">{{ v.title }}</span>
          <span class="block text-[11px] text-ad-text-4 truncate">
            {{ v.year ?? '—' }} · {{ categoryLabel(v.category_id) }} · {{ v.bv_id }}
          </span>
        </span>
        </button>
      </template>
    </div>

    <template #footer>
      <span class="text-[13px] text-ad-text-2">已选 <b class="text-accent">{{ picked.size }}</b> 支</span>
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="close">取消</AppButton>
        <AppButton variant="primary" :disabled="picked.size === 0" @click="confirm">确定选择</AppButton>
      </div>
    </template>
  </AppModal>
</template>
