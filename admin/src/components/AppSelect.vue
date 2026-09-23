<script setup lang="ts">
/** 下拉选择（原生 select + 统一外观） */
import AppIcon from './AppIcon.vue'
import type { SelectOption } from '@/types/ui'

withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    options: SelectOption[]
    label?: string
    placeholder?: string
    required?: boolean
    error?: string
    hint?: string
    disabled?: boolean
    size?: 'md' | 'lg'
  }>(),
  {
    label: '',
    placeholder: '请选择',
    required: false,
    error: '',
    hint: '',
    disabled: false,
    size: 'md'
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div>
    <label v-if="label" class="ad-label">
      {{ label }}<span v-if="required" class="text-[#c0392b] ml-0.5">*</span>
    </label>
    <div class="relative">
      <select
        class="ad-input ad-select"
        :class="[error && 'is-error', size === 'lg' && 'ad-input-lg']"
        :value="modelValue === null || modelValue === undefined ? '' : modelValue"
        :disabled="disabled"
        @change="onChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
      </select>
      <AppIcon name="chevronDown" :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-ad-text-4 pointer-events-none" />
    </div>
    <p v-if="error" class="ad-field-error">{{ error }}</p>
    <p v-else-if="hint" class="ad-hint">{{ hint }}</p>
  </div>
</template>
