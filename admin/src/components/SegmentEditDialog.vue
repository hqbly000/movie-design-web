<script setup lang="ts">
/**
 * 编辑板块弹框（§5.6，R8/R26）：
 * 板块名称 / 首屏预览图 / 内容类型（内部属性）/ 内容清单。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { listVideos } from '@/api/videos'
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
import type { Segment, SegmentContentType, Video } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppRadioGroup from './AppRadioGroup.vue'
import AppIcon from './AppIcon.vue'
import ImageUploader from './ImageUploader.vue'
import VideoPickerDialog from './VideoPickerDialog.vue'

const props = defineProps<{ modelValue: boolean; segment: Segment | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'saved'): void }>()

const toast = useToastStore()

const form = reactive<{
  name: string
  previewImageUrl: string | null
  contentType: SegmentContentType
}>({ name: '', previewImageUrl: null, contentType: 'video' })

const selectedVideos = ref<Video[]>([])
const pickerOpen = ref(false)
const saving = ref(false)
const loadingItems = ref(false)
const errors = reactive<{ name: string; preview: string; videos: string; form: string }>({
  name: '',
  preview: '',
  videos: '',
  form: ''
})

const contentTypeOptions = CONTENT_TYPE_OPTIONS.map((o) => ({
  value: o.key,
  label: o.label,
  hint: o.key === 'video' ? '客户点击进入视频作品页' : o.key === 'gallery' ? '客户点击进入图片浏览（暂未启用）' : '客户点击进入图文长页（暂未启用）'
}))

const isVideo = computed(() => form.contentType === 'video')
const listTitle = computed(() => {
  if (form.contentType === 'video') return `内容清单 · ${selectedVideos.value.length} 支视频`
  if (form.contentType === 'gallery') return `内容清单 · ${selectedVideos.value.length} 张`
  return `内容清单 · ${selectedVideos.value.length} 篇`
})

async function loadItems(): Promise<void> {
  const seg = props.segment
  if (!seg) return
  form.name = seg.name
  form.previewImageUrl = seg.preview_image_url
  form.contentType = seg.content_type
  errors.name = ''
  errors.preview = ''
  errors.videos = ''
  errors.form = ''
  if (!seg.item_ids.length) {
    selectedVideos.value = []
    return
  }
  loadingItems.value = true
  try {
    const res = await listVideos({ page: 1, size: MAX_PAGE_SIZE })
    const map = new Map(res.items.map((v) => [v.id, v]))
    selectedVideos.value = seg.item_ids
      .map((id) => map.get(id))
      .filter((v): v is Video => !!v)
  } catch (e) {
    console.error('[业务板块] 加载内容清单失败', e)
    errors.videos = friendlyErrorMessage(e, '内容清单加载失败')
    selectedVideos.value = []
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

function onPickerConfirm(videos: Video[]): void {
  selectedVideos.value = videos
  errors.videos = ''
}

function validate(): boolean {
  errors.name = form.name.trim() ? '' : '请输入板块名称'
  if (!errors.name && form.name.length > LIMITS.segmentName) {
    errors.name = `板块名称不超过 ${LIMITS.segmentName} 字`
  }
  errors.preview = form.previewImageUrl ? '' : '请设置首屏预览图'
  errors.videos = ''
  if (isVideo.value && selectedVideos.value.length === 0) errors.videos = '请至少选择 1 支视频'
  return !errors.name && !errors.preview && !errors.videos
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
      item_ids: isVideo.value ? selectedVideos.value.map((v) => v.id) : [],
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
        <label class="ad-label">内容类型 <span class="text-ad-text-4 font-normal">（内部属性 · 客户端不可见）</span></label>
        <AppRadioGroup v-model="form.contentType" name="content-type" :options="contentTypeOptions" />
        <p class="ad-hint">{{ CONTENT_TYPE_HINT }}</p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="ad-label !mb-0">{{ listTitle }}</label>
          <AppButton v-if="isVideo" variant="secondary" size="sm" @click="pickerOpen = true">
            <AppIcon name="plus" :size="14" />
            从视频库选择
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
        <p v-else-if="!isVideo" class="ad-hint">「{{ form.contentType === 'gallery' ? '图集' : '文章' }}」为预留类型，当前不启用，内容清单暂不维护。</p>
        <p v-else class="ad-hint">尚未选择视频，请点击「从视频库选择」。</p>
        <p v-if="errors.videos" class="ad-field-error">{{ errors.videos }}</p>
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

    <VideoPickerDialog v-model="pickerOpen" :selected="selectedVideos" :z-index="1200" @confirm="onPickerConfirm" />
  </AppModal>
</template>
