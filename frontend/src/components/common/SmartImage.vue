<script setup lang="ts">
/**
 * SmartImage —— 自动择优的 `<img>`（WebP 优先，回退原图）。
 *
 * 只替换 `src`，**不包裹任何元素**：组件根是 `<img>`，Vue 会把父组件的 scoped 作用域
 * 标识加到根元素上，因此父组件里 `.photo img` / `.laurel` 这类后代选择器照常命中。
 * （早期用 `<picture class="contents">` 的写法会切断 scoped 后代选择器，已废弃。）
 *
 * `src` 由调用方负责解析（相对 `/uploads/*` 先过 `assetUrl`），本组件只做 webp 替换。
 */
import { computed } from 'vue'
import { supportsWebp, webpUrl } from '@/utils/asset'

const props = withDefaults(
  defineProps<{
    /** 已解析的图片地址（`assetUrl()` 结果，或 `/images/*` 这类 public 路径） */
    src: string
    alt?: string
    /** 关掉 WebP 择优（源图本身是 webp/svg/data URI 时用） */
    noWebp?: boolean
  }>(),
  { alt: '', noWebp: false }
)

const finalSrc = computed(() => {
  if (!props.src || props.noWebp || !supportsWebp()) return props.src
  return webpUrl(props.src) ?? props.src
})
</script>

<template>
  <img :src="finalSrc" :alt="alt" />
</template>
