<script setup lang="ts">
/**
 * 状态胶囊（§1.3 三组状态色 + 主色）：已发布/草稿/有效中/已关闭/已过期/未读/已回复
 * kind 类名必须以字面量出现在 KIND_CLASS 映射表中（Tailwind 内容扫描要求，
 * 不能用 `ad-pill-${kind}` 拼接 —— 会被当未使用清除，见 AppButton 内注释）。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    kind?: 'ok' | 'neutral' | 'expired' | 'accent'
    label?: string
  }>(),
  { kind: 'neutral', label: '' }
)

/** kind → 类名（字面量映射，供 Tailwind 内容扫描识别） */
const KIND_CLASS: Record<string, string> = {
  ok: 'ad-pill-ok',
  neutral: 'ad-pill-neutral',
  expired: 'ad-pill-expired',
  accent: 'ad-pill-accent'
}

const pillClass = computed(() => KIND_CLASS[props.kind] ?? 'ad-pill-neutral')
</script>

<template>
  <span class="ad-pill" :class="pillClass">
    <slot>{{ label }}</slot>
  </span>
</template>
