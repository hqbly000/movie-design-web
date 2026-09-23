<script setup lang="ts">
/** 荣誉条目 新增/编辑弹框（§5.7，R7）；达到 6 条上限时后端返回 3001 */
import { reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { createHonor, updateHonor } from '@/api/honors'
import { ErrorCode } from '@/types/api'
import { HONOR_LEVELS, LIMITS } from '@/utils/constants'
import { useToastStore } from '@/stores/toast'
import type { Honor, HonorIn } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppSelect from './AppSelect.vue'
import AppTextarea from './AppTextarea.vue'

const props = defineProps<{ modelValue: boolean; honor: Honor | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'saved'): void }>()

const toast = useToastStore()
const form = reactive({ title: '', description: '', issuer: '', level: '一等奖' })
const saving = ref(false)
const errors = reactive({ title: '', issuer: '', form: '' })

const levelOptions = HONOR_LEVELS.map((l) => ({ value: l, label: l }))

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.title = props.honor?.title ?? ''
    form.description = props.honor?.description ?? ''
    form.issuer = props.honor?.issuer ?? ''
    form.level = props.honor?.level ?? '一等奖'
    errors.title = ''
    errors.issuer = ''
    errors.form = ''
  }
)

function validate(): boolean {
  errors.title = form.title.trim() ? '' : '请输入标题'
  if (!errors.title && form.title.length > LIMITS.honorTitle) errors.title = `标题不超过 ${LIMITS.honorTitle} 字`
  errors.issuer = form.issuer.trim() ? '' : '请输入颁奖机构（含年份）'
  return !errors.title && !errors.issuer
}

async function save(): Promise<void> {
  if (!validate()) return
  saving.value = true
  errors.form = ''
  const payload: HonorIn = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    issuer: form.issuer.trim(),
    level: form.level
  }
  try {
    if (props.honor) await updateHonor(props.honor.id, payload)
    else await createHonor(payload)
    toast.success(props.honor ? '已保存' : '荣誉已新增')
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    if (e instanceof ApiError && e.code === ErrorCode.HONOR_LIMIT) errors.form = e.message
    else errors.form = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    :title="honor ? '编辑荣誉' : '新增荣誉'"
    :width="560"
    mobile-fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <AppInput
        v-model="form.title"
        label="标题"
        placeholder="作品或荣誉名称"
        required
        :maxlength="LIMITS.honorTitle"
        :error="errors.title"
        :counter="`${form.title.length}/${LIMITS.honorTitle}`"
      />
      <AppInput
        v-model="form.description"
        label="详情描述"
        placeholder="官网正前展板显示一行"
        :maxlength="LIMITS.honorDesc"
        :counter="`${form.description.length}/${LIMITS.honorDesc}`"
      />
      <AppInput
        v-model="form.issuer"
        label="颁奖机构"
        placeholder="含年份，如「2025 江苏省新闻摄影年赛」"
        required
        :maxlength="48"
        :error="errors.issuer"
      />
      <AppSelect v-model="form.level" label="等级" required placeholder="" :options="levelOptions" />
      <p v-if="errors.form" class="ad-field-error !mt-0">{{ errors.form }}</p>
    </div>

    <template #footer>
      <span />
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="emit('update:modelValue', false)">取消</AppButton>
        <AppButton variant="primary" :loading="saving" @click="save">保存</AppButton>
      </div>
    </template>
  </AppModal>
</template>
