<script setup lang="ts">
/** 单选组：列表式（带说明）或分段式（segmented） */
import type { RadioOption } from '@/types/ui'

withDefaults(
  defineProps<{
    modelValue: string
    options: RadioOption[]
    name?: string
    disabled?: boolean
    variant?: 'list' | 'segmented'
  }>(),
  { name: 'radio', disabled: false, variant: 'list' }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div v-if="variant === 'segmented'" class="inline-flex p-0.5 rounded-ctrl bg-ad-fill border border-ad-border-control">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="h-8 px-4 rounded-[8px] text-[13px] transition-colors"
      :class="modelValue === opt.value ? 'bg-white text-ad-text shadow-card-soft font-medium' : 'text-ad-text-3 hover:text-ad-text-2'"
      :disabled="disabled"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>

  <div v-else class="flex flex-col gap-2">
    <label
      v-for="opt in options"
      :key="opt.value"
      class="flex items-start gap-2.5 cursor-pointer rounded-ctrl border px-3.5 py-2.5 transition-colors"
      :class="modelValue === opt.value ? 'border-accent bg-accent-soft' : 'border-ad-border-control hover:border-ad-text-4'"
    >
      <input
        type="radio"
        class="sr-only"
        :name="name"
        :value="opt.value"
        :checked="modelValue === opt.value"
        :disabled="disabled"
        @change="emit('update:modelValue', opt.value)"
      />
      <span
        class="w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 mt-0.5"
        :class="modelValue === opt.value ? 'border-accent' : 'border-ad-border-control'"
      >
        <span v-if="modelValue === opt.value" class="w-2.5 h-2.5 rounded-full bg-accent" />
      </span>
      <span class="min-w-0">
        <span class="block text-[13px] text-ad-text">{{ opt.label }}</span>
        <span v-if="opt.hint" class="block text-[11px] text-ad-text-3 mt-0.5 leading-4">{{ opt.hint }}</span>
      </span>
    </label>
  </div>
</template>
