<script setup lang="ts">
/**
 * 新建分发弹框（§5.5，R18/R22/R23/R24）。
 * 字段顺序：合集名 → 客户名 → 联系方式 → 限时 → 已选视频 → 一句说明 → 生成并复制链接。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { createDistribution } from '@/api/distributions'
import { assetUrl } from '@/utils/asset'
import { copyText } from '@/composables/useClipboard'
import { categoryLabel } from '@/utils/labels'
import { toDatetimeLocal } from '@/utils/format'
import { DEFAULT_DURATION, DURATION_OPTIONS, LIMITS } from '@/utils/constants'
import { useToastStore } from '@/stores/toast'
import type { DistributionCreateResult, DurationType, Video } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppSelect from './AppSelect.vue'
import AppTextarea from './AppTextarea.vue'
import AppIcon from './AppIcon.vue'
import VideoPickerDialog from './VideoPickerDialog.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    preselected?: Video[]
  }>(),
  { preselected: () => [] }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', result: DistributionCreateResult): void
}>()

const toast = useToastStore()

const form = reactive({
  collectionName: '',
  customerName: '',
  customerContact: '',
  durationType: DEFAULT_DURATION as DurationType,
  customExpiresAt: '',
  note: ''
})
const picked = ref<Video[]>([])
const pickerOpen = ref(false)
const saving = ref(false)
const errors = reactive<{ collectionName: string; customerName: string; custom: string; videos: string; form: string }>(
  { collectionName: '', customerName: '', custom: '', videos: '', form: '' }
)

const durationOptions = DURATION_OPTIONS.map((d) => ({ value: d.key, label: d.label }))

function defaultCustom(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  return toDatetimeLocal(d)
}

function reset(): void {
  form.collectionName = ''
  form.customerName = ''
  form.customerContact = ''
  form.durationType = DEFAULT_DURATION
  form.customExpiresAt = defaultCustom()
  form.note = ''
  picked.value = [...props.preselected]
  errors.collectionName = ''
  errors.customerName = ''
  errors.custom = ''
  errors.videos = ''
  errors.form = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  }
)

function removeVideo(id: number): void {
  picked.value = picked.value.filter((v) => v.id !== id)
}

function onPickerConfirm(videos: Video[]): void {
  picked.value = videos
  errors.videos = ''
}

function validate(): boolean {
  errors.collectionName = form.collectionName.trim() ? '' : '请输入合集名'
  if (!errors.collectionName && form.collectionName.length > LIMITS.collectionName) {
    errors.collectionName = `合集名不超过 ${LIMITS.collectionName} 字`
  }
  errors.customerName = form.customerName.trim() ? '' : '请输入客户名'
  if (!errors.customerName && form.customerName.length > LIMITS.customerName) {
    errors.customerName = `客户名不超过 ${LIMITS.customerName} 字`
  }
  errors.custom = ''
  if (form.durationType === 'custom' && !form.customExpiresAt) errors.custom = '请选择失效时刻'
  errors.videos = picked.value.length ? '' : '请至少选择 1 支视频'
  return !errors.collectionName && !errors.customerName && !errors.custom && !errors.videos
}

async function generate(): Promise<void> {
  if (!validate()) return
  saving.value = true
  errors.form = ''
  try {
    const result = await createDistribution({
      collection_name: form.collectionName.trim(),
      customer_name: form.customerName.trim(),
      customer_contact: form.customerContact.trim() || null,
      duration_type: form.durationType,
      custom_expires_at: form.durationType === 'custom' ? form.customExpiresAt : null,
      note: form.note.trim() || null,
      video_ids: picked.value.map((v) => v.id)
    })
    const copied = await copyText(result.share_url)
    toast.success(copied ? '链接已复制' : '已生成，请手动复制链接')
    emit('created', result)
    emit('update:modelValue', false)
  } catch (e) {
    errors.form = e instanceof ApiError ? e.message : '生成失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

const noteCount = computed(() => form.note.length)
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="新建分发"
    subtitle="生成后客户凭链接查看，无需登录"
    :width="720"
    :z-index="1000"
    mobile-fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <AppInput
        v-model="form.collectionName"
        label="合集名"
        placeholder="如「城市与光 · 临时合集」"
        required
        :maxlength="LIMITS.collectionName"
        :error="errors.collectionName"
        :counter="`${form.collectionName.length}/${LIMITS.collectionName}`"
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppInput
          v-model="form.customerName"
          label="客户名"
          placeholder="如「王女士」"
          required
          :maxlength="LIMITS.customerName"
          :error="errors.customerName"
          :counter="`${form.customerName.length}/${LIMITS.customerName}`"
          hint="内部记录，仅后台可见"
        />
        <AppInput
          v-model="form.customerContact"
          label="联系方式（选填）"
          placeholder="手机号 / 微信"
          hint="仅后台可见"
        />
      </div>

      <div>
        <AppSelect v-model="form.durationType" label="限时（到期自动失效）" required placeholder="" :options="durationOptions" />
        <div v-if="form.durationType === 'custom'" class="mt-2">
          <input v-model="form.customExpiresAt" type="datetime-local" class="ad-input" />
          <p v-if="errors.custom" class="ad-field-error">{{ errors.custom }}</p>
        </div>
        <p class="ad-hint">默认 1 小时有效；选择「自定义」可精确到分钟并指定失效时刻</p>
      </div>

      <!-- 已选视频 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="ad-label !mb-0">已选视频 <span class="text-[#c0392b]">*</span></label>
          <span class="text-[12px] text-ad-text-3">已选视频 · {{ picked.length }} 支</span>
        </div>
        <div v-if="picked.length" class="flex flex-col gap-2 mb-2.5 max-h-[200px] overflow-y-auto">
          <div v-for="v in picked" :key="v.id" class="ad-row-soft">
            <img :src="assetUrl(v.cover_url)" alt="" class="w-[52px] h-[30px] rounded-[4px] object-cover bg-white shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-[13px] text-ad-text truncate">{{ v.title }}</p>
              <p class="text-[11px] text-ad-text-4 truncate">{{ categoryLabel(v.category_id) }}</p>
            </div>
            <button class="ad-icon-btn !w-7 !h-7" type="button" aria-label="移除" @click="removeVideo(v.id)">
              <AppIcon name="close" :size="15" />
            </button>
          </div>
        </div>
        <AppButton variant="secondary" size="sm" @click="pickerOpen = true">
          <AppIcon name="plus" :size="14" />
          选择视频
        </AppButton>
        <p v-if="errors.videos" class="ad-field-error">{{ errors.videos }}</p>
      </div>

      <AppTextarea
        v-model="form.note"
        label="一句说明"
        placeholder="客户可见，可多行"
        :height="88"
        :maxlength="LIMITS.note"
        :counter="`${noteCount}/${LIMITS.note} · 建议 20~80 字`"
      />

      <p v-if="errors.form" class="ad-field-error !mt-0">{{ errors.form }}</p>
    </div>

    <template #footer>
      <span />
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="emit('update:modelValue', false)">取消</AppButton>
        <AppButton variant="primary" :loading="saving" @click="generate">生成并复制链接</AppButton>
      </div>
    </template>

    <VideoPickerDialog v-model="pickerOpen" :selected="picked" :z-index="1200" :overlay-opacity="0.5" @confirm="onPickerConfirm" />
  </AppModal>
</template>
