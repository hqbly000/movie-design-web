<script setup lang="ts">
/**
 * AppButton —— 官网按钮（R13 / §1.4）。
 * 变体：gold-outline（金描边幽灵）/ ivory（象牙白实心）/ ivory-outline（米白描边）。
 * 统一禁止：装饰箭头、渐变、外发光、内高光；悬浮仅微调底色。
 */

import { computed } from 'vue'

type ButtonVariant = 'gold-outline' | 'ivory' | 'ivory-outline'

const props = withDefaults(
  defineProps<{
    /** 视觉变体 */
    variant?: ButtonVariant
    /** 原生 type */
    nativeType?: 'button' | 'submit' | 'reset'
    /** 禁用 */
    disabled?: boolean
    /** 撑满父容器 */
    block?: boolean
  }>(),
  { variant: 'ivory', nativeType: 'button', disabled: false, block: false }
)

const emit = defineEmits<{ (e: 'click', ev: MouseEvent): void }>()

const variantClass = computed(() => {
  switch (props.variant) {
    case 'gold-outline':
      return 'ly-btn-ghost-gold'
    case 'ivory-outline':
      return 'ly-btn-ghost-ivory'
    default:
      return 'ly-btn-ivory'
  }
})

function handleClick(ev: MouseEvent): void {
  if (props.disabled) return
  emit('click', ev)
}
</script>

<template>
  <button
    :type="nativeType"
    :disabled="disabled"
    class="ly-btn"
    :class="[variantClass, block ? 'w-full' : '', disabled ? 'is-disabled' : '']"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
