<script setup lang="ts">
/**
 * 荣誉条目 新增/编辑弹框（§5.7，R7）；达到 6 条上限时后端返回 3001。
 *
 * 奖项类型不再是固定枚举：预设「特等奖/一等奖/…」，也可以直接输入新类型
 * （输入即新增，本机记住；保存后当前荣誉列表里也会带上该类型）。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { createHonor, updateHonor } from '@/api/honors'
import { ErrorCode } from '@/types/api'
import { HONOR_LEVELS, HONOR_LEVEL_MAX, LIMITS } from '@/utils/constants'
import { levelOptions, rememberLevel } from '@/utils/honorLevels'
import { useToastStore } from '@/stores/toast'
import type { Honor, HonorIn } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppComboInput from './AppComboInput.vue'

const props = withDefaults(defineProps<{ modelValue: boolean; honor: Honor | null; levels?: string[] }>(), {
  levels: () => []
})
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'saved'): void }>()

const toast = useToastStore()
const form = reactive({ title: '', description: '', issuer: '', level: HONOR_LEVELS[0] })
const saving = ref(false)
const errors = reactive({ title: '', issuer: '', level: '', form: '' })

/** 候选 = 预设 + 本机新增 + 当前列表已在用 */
const options = computed(() => levelOptions(props.levels))

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.title = props.honor?.title ?? ''
    form.description = props.honor?.description ?? ''
    form.issuer = props.honor?.issuer ?? ''
    form.level = props.honor?.level ?? HONOR_LEVELS[0]
    errors.title = ''
    errors.issuer = ''
    errors.level = ''
    errors.form = ''
  }
)

function validate(): boolean {
  errors.title = form.title.trim() ? '' : '请输入标题'
  if (!errors.title && form.title.length > LIMITS.honorTitle) errors.title = `标题不超过 ${LIMITS.honorTitle} 字`
  errors.issuer = form.issuer.trim() ? '' : '请输入颁奖机构（含年份）'
  errors.level = form.level.trim() ? '' : '请选择或输入奖项类型'
  if (!errors.level && form.level.trim().length > HONOR_LEVEL_MAX) {
    errors.level = `奖项类型不超过 ${HONOR_LEVEL_MAX} 字`
  }
  return !errors.title && !errors.issuer && !errors.level
}

async function save(): Promise<void> {
  if (!validate()) return
  saving.value = true
  errors.form = ''
  const level = form.level.trim()
  const payload: HonorIn = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    issuer: form.issuer.trim(),
    level
  }
  try {
    if (props.honor) await updateHonor(props.honor.id, payload)
    else await createHonor(payload)
    rememberLevel(level)
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
      <AppComboInput
        v-model="form.level"
        label="奖项类型"
        required
        placeholder="选择或直接输入，如「特等奖」"
        :options="options"
        :maxlength="HONOR_LEVEL_MAX"
        :error="errors.level"
        hint="可直接输入新类型，回车或点击「新增」即生效"
        create-hint="新增奖项类型"
      />
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
