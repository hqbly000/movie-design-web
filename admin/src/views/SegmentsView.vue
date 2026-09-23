<script setup lang="ts">
/** 业务板块（§5.6，R8/R26）：固定 5 张板块卡，支持拖拽排序与编辑 */
import { computed, onMounted, ref } from 'vue'
import { ApiError } from '@/api/request'
import { listSegments, saveSegmentOrder } from '@/api/segments'
import { assetUrl } from '@/utils/asset'
import { contentTypeLabel } from '@/utils/labels'
import { SEGMENT_COUNT } from '@/utils/constants'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { Segment } from '@/types/models'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import PageHint from '@/components/PageHint.vue'
import DragSortList from '@/components/DragSortList.vue'
import SegmentEditDialog from '@/components/SegmentEditDialog.vue'

const toast = useToastStore()
const auth = useAuthStore()

const segments = ref<Segment[]>([])
const loading = ref(true)
const errorText = ref('')
const dialogOpen = ref(false)
const editing = ref<Segment | null>(null)

usePageHeader(
  '业务板块',
  computed(() => `预置 ${SEGMENT_COUNT} 个 · 名称可改 · 顺序即官网五列顺序`)
)

const hintText =
  '每个板块需设置「首屏预览图」（官网五列的图）+「内容类型」；内容类型为客户不可见的内部属性，决定客户点击后看到视频、图集还是文章'

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await listSegments()
    segments.value = res.slice().sort((a, b) => a.sort - b.sort)
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function tagText(seg: Segment): string {
  const type = contentTypeLabel(seg.content_type)
  if (seg.content_type === 'video') return `${type} · ${seg.item_count} 支`
  if (seg.content_type === 'gallery') return `${type} · ${seg.item_count} 张`
  return posTag(seg)
}
function posTag(seg: Segment): string {
  return contentTypeLabel(seg.content_type)
}

async function onReorder(next: Segment[]): Promise<void> {
  if (!auth.canEdit) return
  segments.value = next
  try {
    await saveSegmentOrder(next.map((s) => s.id))
    toast.success('顺序已保存')
    await load()
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : '排序保存失败')
    await load()
  }
}

function openEdit(seg: Segment): void {
  editing.value = seg
  dialogOpen.value = true
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4">
    <p v-if="!auth.canEdit" class="ad-hint !mt-0">当前角色为只读，无法编辑板块或调整顺序</p>

    <PageHint :text="hintText" />

    <p v-if="errorText" class="ad-field-error !mt-0">
      {{ errorText }}
      <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
    </p>

    <div v-if="loading" class="flex gap-3 overflow-hidden">
      <div v-for="i in 5" :key="i" class="ad-skeleton w-[224px] h-[240px] rounded-card shrink-0" />
    </div>

    <div v-else class="ad-card p-5 md:p-6">
      <DragSortList
        :items="segments"
        :disabled="!auth.canEdit"
        direction="horizontal"
        bare
        @reorder="onReorder"
      >
        <template #default="{ item }">
          <div class="w-[224px] rounded-card border border-ad-border bg-ad-surface overflow-hidden group">
            <div class="relative">
              <img
                :src="assetUrl(item.preview_image_url)"
                :alt="item.name"
                class="w-full block bg-ad-fill object-cover"
                style="height: 112px"
              />
              <span class="absolute left-2 top-2 ad-tag !bg-black/45 !text-white">顺序 {{ item.sort + 1 }}</span>
              <span
                class="absolute right-2 top-2 w-6 h-6 rounded-full bg-white/85 flex items-center justify-center text-ad-text-3 cursor-grab"
                :class="!auth.canEdit && 'opacity-40'"
                title="拖拽调整顺序"
              >
                <AppIcon name="grip" :size="13" />
              </span>
            </div>
            <div class="p-3.5">
              <p class="text-[15px] font-medium text-ad-text truncate">{{ item.name }}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="ad-tag">{{ tagText(item) }}</span>
                <button
                  class="ad-btn-text !h-8"
                  :disabled="!auth.canEdit"
                  :title="auth.canEdit ? '编辑板块' : '当前角色为只读'"
                  @click="openEdit(item)"
                >
                  编辑
                </button>
              </div>
            </div>
          </div>
        </template>
      </DragSortList>
    </div>

    <SegmentEditDialog v-model="dialogOpen" :segment="editing" @saved="load" />
  </div>
</template>
