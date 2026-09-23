<script setup lang="ts">
/**
 * 后台按钮（§1.4）：主/次/文字/危险文字，高 36/40/44，圆角 10。
 * 悬浮仅加深底色或边框浓度，不做位移与放大。
 *
 * 注意：变体类必须以**字面量**出现在本文件中（VARIANT_CLASS 映射表），
 * 不能用 `ad-btn-${variant}` 模板字符串拼接 —— Tailwind 的内容扫描
 * 识别不了动态拼接，会把这类"未使用"的类从产物 CSS 中清除，
 * 导致按钮全部失去颜色（2026-09-23 线上事故根因）。
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'soft' | 'text' | 'danger-text'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    loading?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variant: 'primary', size: 'md', disabled: false, loading: false, block: false, type: 'button' }
)

/** 变体 → 类名（字面量映射，供 Tailwind 内容扫描识别） */
const VARIANT_CLASS: Record<string, string> = {
  primary: 'ad-btn-primary',
  secondary: 'ad-btn-secondary',
  soft: 'ad-btn-soft',
  text: 'ad-btn-text',
  'danger-text': 'ad-btn-danger-text'
}
</script>

<template>
  <button
    :type="type"
    class="ad-btn"
    :class="[
      VARIANT_CLASS[variant] ?? 'ad-btn-primary',
      size === 'sm' && 'ad-btn-sm',
      size === 'lg' && 'ad-btn-lg',
      block && 'w-full',
      (disabled || loading) && 'is-disabled'
    ]"
    :disabled="disabled || loading"
  >
    <svg
      v-if="loading"
      class="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
    <slot />
  </button>
</template>
