<script setup lang="ts">
/**
 * GhostNumber —— 描边幽灵数字（R5 / §6.3）。
 * 透明填充 + 2px #FFD9BF 描边，字号为前景数字的 1.45×，纯装饰。
 * 行高 = 字号（1.0），避免字形下沿被裁。
 */
withDefaults(
  defineProps<{
    /** 展示内容（年限数字） */
    value: string | number
    /** 字号（px）= 前景 × 1.45 */
    size: number
    /** 描边宽度 */
    strokeWidth?: number
  }>(),
  { strokeWidth: 2 }
)
</script>

<template>
  <span
    class="pointer-events-none select-none whitespace-nowrap font-sans"
    style="
      color: transparent;
      -webkit-text-stroke-color: #ffd9bf;
      font-weight: 900;
      line-height: 1;
    "
    :style="{
      fontSize: `${size}px`,
      WebkitTextStrokeWidth: `${strokeWidth}px`
    }"
    aria-hidden="true"
  >
    {{ value }}
  </span>
</template>
