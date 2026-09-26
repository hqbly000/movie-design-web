<script setup lang="ts">
/**
 * 编辑板块弹框（§5.6，R8/R26）：
 * 板块名称 / 首屏预览图 / 内容类型（内部属性）/ 正文或简介（body）/ 内容清单。
 * 三种内容类型：有视频（视频库选择）、图集（图库多选）、文章（正文 textarea）。
 * 正文轻格式：空行分段、行首「- 」列表、「标签｜内容」要点行。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { listAssets, listVideos } from '@/api/videos'
import { updateSegment } from '@/api/segments'
import { assetUrl } from '@/utils/asset'
import { categoryLabel } from '@/utils/labels'
import {
  CONTENT_TYPE_HINT,
  CONTENT_TYPE_OPTIONS,
  CONTENT_TYPE_TO_ITEM,
  LIMITS,
  MAX_PAGE_SIZE
} from '@/utils/constants'
import { friendlyErrorMessage } from '@/utils/errors'
import { useToastStore } from '@/stores/toast'
import type { Asset, Segment, SegmentContentType, Video } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppRadioGroup from './AppRadioGroup.vue'
import AppTextarea from './AppTextarea.vue'
import AppIcon from './AppIcon.vue'
import ImageUploader from './ImageUploader.vue'
import VideoPickerDialog from './VideoPickerDialog.vue'
import AssetMultiPickerDialog from './AssetMultiPickerDialog.vue'

const props = defineProps<{ modelValue: boolean; segment: Segment | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'saved'): void }>()

const toast = useToastStore()

const form = reactive<{
  name: string
  previewImageUrl: string | null
  contentType: SegmentContentType
  body: string
}>({ name: '', previewImageUrl: null, contentType: 'video', body: '' })

const selectedVideos = ref<Video[]>([])
const selectedAssets = ref<Asset[]>([])
const videoPickerOpen = ref(false)
const assetPickerOpen = ref(false)
const saving = ref(false)
const loadingItems = ref(false)
const errors = reactive<{ name: string; preview: string; items: string; body: string; form: string }>({
  name: '',
  preview: '',
  items: '',
  body: '',
  form: ''
})

const contentTypeOptions = CONTENT_TYPE_OPTIONS.map((o) => ({
  value: o.key,
  label: o.label,
  hint:
    o.key === 'video'
      ? '客户点击进入视频作品页'
      : o.key === 'gallery'
        ? '客户点击进入图片浏览（从图库选择）'
        : '客户点击进入图文介绍页（正文即板块内容）'
}))

const isVideo = computed(() => form.contentType === 'video')
const isGallery = computed(() => form.contentType === 'gallery')
const isArticle = computed(() => form.contentType === 'article')

const listTitle = computed(() => {
  if (isVideo.value) return `内容清单 · ${selectedVideos.value.length} 支视频`
  if (isGallery.value) return `内容清单 · ${selectedAssets.value.length} 张图片`
  return `正文 · ${form.body.replace(/\s/g, '').length} 字`
})

/** 正文/简介编辑标签：article 为必填正文，其余为选填简介。 */
const bodyLabel = computed(() =>
  isArticle.value ? '正文（空行分段，必填）' : '板块简介（选填，显示在详情页顶部）'
)

async function loadItems(): Promise<void> {
  const seg = props.segment
  if (!seg) return
  form.name = seg.name
  form.previewImageUrl = seg.preview_image_url
  form.contentType = seg.content_type
  form.body = seg.body ?? ''
  errors.name = ''
  errors.preview = ''
  errors.items = ''
  errors.body = ''
  errors.form = ''
  if (!seg.item_ids.length) {
    selectedVideos.value = []
    selectedAssets.value = []
    return
  }
  loadingItems.value = true
  try {
    if (seg.content_type === 'video') {
      const res = await listVideos({ page: 1, size: MAX_PAGE_SIZE })
      const map = new Map(res.items.map((v) => [v.id, v]))
      selectedVideos.value = seg.item_ids
        .map((id) => map.get(id))
        .filter((v): v is Video => !!v)
      selectedAssets.value = []
    } else if (seg.content_type === 'gallery') {
      // 清单为 asset ids：拉全量图集后按既有顺序回填
      const assets = await listAssets()
      const map = new Map(assets.map((a) => [a.id, a]))
      selectedAssets.value = seg.item_ids
        .map((id) => map.get(id))
        .filter((a): a is Asset => !!a)
      selectedVideos.value = []
    } else {
      selectedVideos.value = []
      selectedAssets.value = []
    }
  } catch (e) {
    console.error('[业务板块] 加载内容清单失败', e)
    errors.items = friendlyErrorMessage(e, '内容清单加载失败')
    selectedVideos.value = []
    selectedAssets.value = []
  } finally {
    loadingItems.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) void loadItems()
  }
)

function removeVideo(id: number): void {
  selectedVideos.value = selectedVideos.value.filter((v) => v.id !== id)
}

function removeAsset(id: number): void {
  selectedAssets.value = selectedAssets.value.filter((a) => a.id !== id)
}

function onVideosConfirm(videos: Video[]): void {
  selectedVideos.value = videos
  errors.items = ''
}

function onAssetsConfirm(assets: Asset[]): void {
  selectedAssets.value = assets
  errors.items = ''
}

function validate(): boolean {
  errors.name = form.name.trim() ? '' : '请输入板块名称'
  if (!errors.name && form.name.length > LIMITS.segmentName) {
    errors.name = `板块名称不超过 ${LIMITS.segmentName} 字`
  }
  errors.preview = form.previewImageUrl ? '' : '请设置首屏预览图'
  errors.items = ''
  if (isVideo.value && selectedVideos.value.length === 0) errors.items = '请至少选择 1 支视频'
  if (isGallery.value && selectedAssets.value.length === 0) errors.items = '请至少选择 1 张图片'
  errors.body = isArticle.value && !form.body.trim() ? '请输入图文介绍正文' : ''
  return !errors.name && !errors.preview && !errors.items && !errors.body
}

async function save(): Promise<void> {
  if (!props.segment) return
  if (!validate()) return
  saving.value = true
  errors.form = ''
  try {
    await updateSegment(props.segment.id, {
      name: form.name.trim(),
      preview_image_url: form.previewImageUrl,
      content_type: form.contentType,
      body: form.body.trim() || null,
      item_ids: isVideo.value
        ? selectedVideos.value.map((v) => v.id)
        : isGallery.value
          ? selectedAssets.value.map((a) => a.id)
          : [],
      item_type: CONTENT_TYPE_TO_ITEM[form.contentType]
    })
    toast.success('板块已保存')
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    errors.form = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="编辑板块"
    :width="640"
    mobile-fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <AppInput
        v-model="form.name"
        label="板块名称"
        placeholder="显示在官网，允许改名"
        required
        :maxlength="LIMITS.segmentName"
        :error="errors.name"
        :counter="`${form.name.length}/${LIMITS.segmentName}`"
      />

      <div>
        <label class="ad-label">首屏预览图 <span class="text-[#c0392b]">*</span></label>
        <ImageUploader
          v-model="form.previewImageUrl"
          :preview-height="112"
          hint="显示在官网五列板块上，建议 800×600 横构图"
        />
        <p v-if="errors.preview" class="ad-field-error">{{ errors.preview }}</p>
      </div>

      <div>
        <label class="ad-label">内容类型 <span class="text-ad-text-4 font-normal">（内部属性 · 决定板块详情形态）</span></label>
        <AppRadioGroup v-model="form.contentType" name="content-type" :options="contentTypeOptions" />
        <p class="ad-hint">{{ CONTENT_TYPE_HINT }}</p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="ad-label !mb-0">{{ listTitle }}</label>
          <AppButton v-if="isVideo" variant="secondary" size="sm" @click="videoPickerOpen = true">
            <AppIcon name="plus" :size="14" />
            从视频库选择
          </AppButton>
          <AppButton v-else-if="isGallery" variant="secondary" size="sm" @click="assetPickerOpen = true">
            <AppIcon name="plus" :size="14" />
            从图库选择
          </AppButton>
        </div>

        <div v-if="loadingItems" class="flex flex-col gap-2">
          <div v-for="i in 2" :key="i" class="ad-skeleton h-12 rounded-ctrl" />
        </div>
        <div v-else-if="isVideo && selectedVideos.length" class="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
          <div v-for="v in selectedVideos" :key="v.id" class="ad-row-soft">
            <img :src="assetUrl(v.cover_url)" alt="" class="w-[52px] h-[30px] rounded-[4px] object-cover bg-white shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-[13px] text-ad-text truncate">{{ v.title }}</p>
              <p class="text-[11px] text-ad-text-4 truncate">{{ categoryLabel(v.category_id) }} · {{ v.bv_id }}</p>
            </div>
            <button class="ad-icon-btn !w-7 !h-7" type="button" aria-label="移除" @click="removeVideo(v.id)">
              <AppIcon name="close" :size="15" />
            </button>
          </div>
        </div>
        <div v-else-if="isGallery && selectedAssets.length" class="flex flex-wrap gap-2">
          <div
            v-for="a in selectedAssets"
            :key="a.id"
            class="group relative w-[96px] overflow-hidden rounded-[4px] border border-ad-border"
          >
            <img :src="assetUrl(a.url)" alt="" class="aspect-[4/3] w-full object-cover bg-ad-fill" />
            <button
              class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
              type="button"
              aria-label="移除"
              @click="removeAsset(a.id)"
            >
              <AppIcon name="close" :size="12" />
            </button>
          </div>
        </div>
        <p v-else-if="isArticle" class="ad-hint">「文章」类型的板块内容即下方正文，不维护清单。</p>
        <p v-else class="ad-hint">
          {{ isVideo ? '尚未选择视频，请点击「从视频库选择」。' : '尚未选择图片，请点击「从图库选择」。' }}
        </p>
        <p v-if="errors.items" class="ad-field-error">{{ errors.items }}</p>
      </div>

      <div>
        <AppTextarea
          v-model="form.body"
          :label="bodyLabel"
          :rows="isArticle ? 8 : 3"
          :maxlength="8000"
          :placeholder="
            isArticle
              ? '空行分段；行首「- 」为列表条目；「标签｜内容」为要点行'
              : '选填：一两句话介绍该板块，显示在板块详情顶部'
          "
          :error="errors.body"
        />
      </div>

      <p v-if="errors.form" class="ad-field-error !mt-0">{{ errors.form }}</p>
      <p class="text-[12px] text-ad-text-4">顺序：请在列表页拖拽板块卡片调整官网五列顺序。</p>
    </div>

    <template #footer>
      <span />
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="emit('update:modelValue', false)">取消</AppButton>
        <AppButton variant="primary" :loading="saving" @click="save">保存板块</AppButton>
      </div>
    </template>

    <VideoPickerDialog v-model="videoPickerOpen" :selected="selectedVideos" :z-index="1200" @confirm="onVideosConfirm" />
    <AssetMultiPickerDialog v-model="assetPickerOpen" :selected="selectedAssets" :z-index="1200" @confirm="onAssetsConfirm" />
  </AppModal>
</template>
