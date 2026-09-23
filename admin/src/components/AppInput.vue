<script setup lang="ts">
/** 单行输入（含标签/必填/错误/提示/字数） */
withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    label?: string
    type?: string
    placeholder?: string
    required?: boolean
    error?: string
    hint?: string
    counter?: string
    disabled?: boolean
    size?: 'md' | 'lg'
    autocomplete?: string
    maxlength?: number
  }>(),
  {
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    error: '',
    hint: '',
    counter: '',
    disabled: false,
    size: 'md',
    autocomplete: 'off'
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'enter'): void
}>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div>
    <label v-if="label" class="ad-label">
      {{ label }}<span v-if="required" class="text-[#c0392b] ml-0.5">*</span>
    </label>
    <input
      class="ad-input"
      :class="[error && 'is-error', size === 'lg' && 'ad-input-lg']"
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :maxlength="maxlength"
      @input="onInput"
      @keyup.enter="emit('enter')"
    />
    <slot name="below" />
    <p v-if="error" class="ad-field-error">{{ error }}</p>
    <p v-else-if="hint" class="ad-hint">{{ hint }}</p>
    <p v-if="counter" class="ad-counter">{{ counter }}</p>
  </div>
</template>
