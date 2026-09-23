<script setup lang="ts">
/** 重新生成分发链接（默认复用原客户信息，仅重设有效期，§6.5） */
import { reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { regenerateDistribution } from '@/api/distributions'
import { formatDateTime, toDatetimeLocal } from '@/utils/format'
import { DURATION_OPTIONS } from '@/utils/constants'
import { durationLabel } from '@/utils/labels'
import { copyText } from '@/composables/useClipboard'
import { useToastStore } from '@/stores/toast'
import type { Distribution, DistributionCreateResult, DurationType } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppSelect from './AppSelect.vue'

const props = defineProps<{ modelValue: boolean; distribution: Distribution | null }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'regenerated', result: DistributionCreateResult): void
}>()

const toast = useToastStore()
const form = reactive({ durationType: '1h' as DurationType, customExpiresAt: '' })
const saving = ref(false)
const errorText = ref('')

const durationOptions = DURATION_OPTIONS.map((d) => ({ value: d.key, label: d.label }))

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.distribution) {
      form.durationType = props.distribution.duration_type
      form.customExpiresAt = toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000))
      errorText.value = ''
    }
  }
)

async function submit(): Promise<void> {
  if (!props.distribution) return
  if (form.durationType === 'custom' && !form.customExpiresAt) {
    errorText.value = '请选择失效时刻'
    return
  }
  saving.value = true
  errorText.value = ''
  try {
    const result = await regenerateDistribution(props.distribution.id, {
      duration_type: form.durationType,
      custom_expires_at: form.durationType === 'custom' ? form.customExpiresAt : null
    })
    const copied = await copyText(result.share_url)
    toast.success(copied ? '已重新生成并复制链接' : '已重新生成，请手动复制链接')
    emit('regenerated', result)
    emit('update:modelValue', false)
  } catch (e) {
    errorText.value = e instanceof ApiError ? e.message : '重新生成失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="重新生成链接"
    :width="480"
    mobile-fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <p class="text-[13px] text-ad-text-2 leading-6">
        将为合集「{{ distribution?.collection_name }}」生成新的链接与有效期，
        <b>客户信息默认复用</b>（{{ distribution?.customer_masked }}），旧链接立即失效。
      </p>
      <p v-if="distribution" class="text-[12px] text-ad-text-3">
        原限时：{{ durationLabel(distribution.duration_type) }} · 原到期 {{ formatDateTime(distribution.expires_at) }}
      </p>
      <div>
        <AppSelect v-model="form.durationType" label="新的限时" required placeholder="" :options="durationOptions" />
        <input
          v-if="form.durationType === 'custom'"
          v-model="form.customExpiresAt"
          type="datetime-local"
          class="ad-input mt-2"
        />
      </div>
      <p v-if="errorText" class="ad-field-error !mt-0">{{ errorText }}</p>
    </div>

    <template #footer>
      <span />
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="emit('update:modelValue', false)">取消</AppButton>
        <AppButton variant="primary" :loading="saving" @click="submit">重新生成并复制</AppButton>
      </div>
    </template>
  </AppModal>
</template>
