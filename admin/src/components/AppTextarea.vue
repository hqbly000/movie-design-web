<script setup lang="ts">
/** 多行输入（含标签/必填/错误/字数） */
withDefaults(
  defineProps<{
    modelValue: string | null | undefined
    label?: string
    placeholder?: string
    required?: boolean
    error?: string
    hint?: string
    counter?: string
    disabled?: boolean
    rows?: number
    height?: number
    maxlength?: number
  }>(),
  {
    label: '',
    placeholder: '',
    required: false,
    error: '',
    hint: '',
    counter: '',
    disabled: false,
    rows: 4,
    height: 0
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div>
    <label v-if="label" class="ad-label">
      {{ label }}<span v-if="required" class="text-[#c0392b] ml-0.5">*</span>
    </label>
    <textarea
      class="ad-textarea"
      :class="error && 'is-error'"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength"
      :style="height ? { height: `${height}px` } : undefined"
      @input="onInput"
    />
    <p v-if="error" class="ad-field-error">{{ error }}</p>
    <p v-else-if="hint" class="ad-hint">{{ hint }}</p>
    <p v-if="counter" class="ad-counter">{{ counter }}</p>
  </div>
</template>
