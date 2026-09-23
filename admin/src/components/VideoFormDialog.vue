<script setup lang="ts">
/**
 * 视频新增/编辑弹框（§5.2，6 项字段）。
 * BV 粘贴后自动解析并回填标题与封面（可覆盖）；解析失败优雅降级（2002 提示但不阻断保存）。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { createVideo, parseBv, updateVideo } from '@/api/videos'
import { ErrorCode } from '@/types/api'
import type { BvMeta, Video, VideoCreateIn, VideoStatus } from '@/types/models'
import { CATEGORIES, LIMITS, yearOptions } from '@/utils/constants'
import { extractBv, isValidBv } from '@/utils/bv'
import { useToastStore } from '@/stores/toast'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppSelect from './AppSelect.vue'
import AppRadioGroup from './AppRadioGroup.vue'
import ImageUploader from './ImageUploader.vue'

const props = defineProps<{ modelValue: boolean; video: Video | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'saved'): void }>()

const toast = useToastStore()

const form = reactive<{
  title: string
  bvInput: string
  categoryId: string
  year: string
  coverUrl: string | null
  status: VideoStatus
}>({
  title: '',
  bvInput: '',
  categoryId: '',
  year: '',
  coverUrl: null,
  status: 'draft'
})

const titleError = ref('')
const bvError = ref('')
const bvNotice = ref('')
const formError = ref('')
const saving = ref(false)
const parsing = ref(false)
let parseTimer: number | undefined

const isEdit = computed(() => !!props.video)
const title = computed(() => (isEdit.value ? '编辑视频' : '新增视频'))

const categoryOptions = [
  { value: '', label: '未分类' },
  ...CATEGORIES.map((c) => ({ value: c.key, label: c.label }))
]
const yearSelectOptions = [
  { value: '', label: '不指定' },
  ...yearOptions().map((y) => ({ value: y, label: String(y) }))
]
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' }
]

function reset(): void {
  const v = props.video
  form.title = v?.title ?? ''
  form.bvInput = v?.bv_id ?? ''
  form.categoryId = v?.category_id ?? ''
  form.year = v?.year ? String(v.year) : ''
  form.coverUrl = v?.cover_url ?? null
  form.status = v?.status ?? 'draft'
  titleError.value = ''
  bvError.value = ''
  bvNotice.value = ''
  formError.value = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  }
)

async function runParse(): Promise<void> {
  const raw = form.bvInput.trim()
  if (!raw) {
    bvError.value = ''
    bvNotice.value = ''
    return
  }
  parsing.value = true
  bvError.value = ''
  bvNotice.value = ''
  try {
    const meta = await parseBv(raw)
    if (meta.bv_id) form.bvInput = meta.bv_id
    if (meta.title) form.title = meta.title
    if (meta.cover_url) form.coverUrl = meta.cover_url
  } catch (e) {
    if (e instanceof ApiError && e.code === ErrorCode.BV_FORMAT) {
      bvError.value = '未能识别 BV 号，请检查链接'
    } else if (e instanceof ApiError && e.code === ErrorCode.BV_PARSE) {
      // 优雅降级：无法取到标题与封面，回填 bv_id 并提示可手动填写（不阻断保存）
      const data = e.data as BvMeta | null
      if (data?.bv_id) form.bvInput = data.bv_id
      else if (extractBv(raw)) form.bvInput = extractBv(raw)
      bvNotice.value = '未能获取标题与封面，可手动填写'
    } else if (e instanceof ApiError && e.code === ErrorCode.BV_EXISTS) {
      bvError.value = '该 BV 号已存在，请勿重复添加'
    } else {
      bvError.value = e instanceof Error ? e.message : '解析失败'
    }
  } finally {
    parsing.value = false
  }
}

function onBvInput(value: string): void {
  form.bvInput = value
  bvNotice.value = ''
  bvError.value = ''
  window.clearTimeout(parseTimer)
  const candidate = extractBv(value)
  if (candidate) {
    parseTimer = window.setTimeout(() => void runParse(), 650)
  }
}

function validate(): boolean {
  let ok = true
  titleError.value = ''
  bvError.value = ''
  formError.value = ''
  form.title = form.title.trim()
  if (!form.title) {
    titleError.value = '请输入视频标题'
    ok = false
  } else if (form.title.length > LIMITS.videoTitle) {
    titleError.value = `标题不超过 ${LIMITS.videoTitle} 字`
    ok = false
  }
  const bv = extractBv(form.bvInput)
  if (!form.bvInput.trim()) {
    bvError.value = '请填写 B 站链接或 BV 号'
    ok = false
  } else if (!bv || !isValidBv(bv)) {
    bvError.value = '未能识别 BV 号，请检查链接'
    ok = false
  }
  return ok
}

async function save(): Promise<void> {
  if (!validate()) return
  const bv = extractBv(form.bvInput)
  const payload: VideoCreateIn = {
    title: form.title,
    bv_id: bv,
    category_id: form.categoryId || null,
    year: form.year ? Number(form.year) : null,
    cover_url: form.coverUrl || null,
    status: form.status
  }
  saving.value = true
  try {
    if (props.video) await updateVideo(props.video.id, payload)
    else await createVideo(payload)
    toast.success(isEdit.value ? '已保存' : '视频已新增')
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    if (e instanceof ApiError && e.code === ErrorCode.BV_EXISTS) bvError.value = '该 BV 号已存在，请勿重复添加'
    else if (e instanceof ApiError && e.code === ErrorCode.HONOR_LIMIT) formError.value = e.message
    else formError.value = e instanceof Error ? e.message : '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

function close(): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    :title="title"
    :width="600"
    mobile-fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <AppInput
        v-model="form.title"
        label="标题"
        placeholder="请输入视频标题"
        required
        :maxlength="LIMITS.videoTitle"
        :error="titleError"
        :counter="`${form.title.length}/${LIMITS.videoTitle}`"
      />

      <div>
        <AppInput
          :model-value="form.bvInput"
          label="B 站链接 / BV 号"
          placeholder="粘贴链接或输入 BV 号，自动解析标题与封面"
          required
          :error="bvError"
          @update:model-value="onBvInput"
          @enter="runParse"
        >
          <template #below>
            <p v-if="parsing" class="ad-hint">正在解析…</p>
            <p v-else-if="bvNotice" class="mt-1.5 text-[12px] text-[#8A5A22] leading-4">{{ bvNotice }}</p>
          </template>
        </AppInput>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect v-model="form.categoryId" label="分类" placeholder="" :options="categoryOptions" hint="可留空，列表中显示「未分类」" />
        <AppSelect v-model="form.year" label="年份" placeholder="" :options="yearSelectOptions" />
      </div>

      <div>
        <label class="ad-label">封面</label>
        <ImageUploader
          v-model="form.coverUrl"
          hint="默认取 B 站封面，可上传替换（建议 16:9，≥1280×720）"
        />
      </div>

      <div>
        <label class="ad-label">状态</label>
        <AppRadioGroup v-model="form.status" variant="segmented" :options="statusOptions" />
        <p class="ad-hint">默认草稿；草稿不出现在前台与合选中</p>
      </div>

      <p v-if="formError" class="ad-field-error !mt-0">{{ formError }}</p>
    </div>

    <template #footer>
      <span />
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="close">取消</AppButton>
        <AppButton variant="primary" :loading="saving" @click="save">保存</AppButton>
      </div>
    </template>
  </AppModal>
</template>
