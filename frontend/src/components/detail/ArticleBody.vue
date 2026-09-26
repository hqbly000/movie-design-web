<script setup lang="ts">
/**
 * ArticleBody —— 轻格式正文渲染。
 * article 全文 / video·gallery 的板块简介 / 公司长文共用同一套排版，
 * 全部正文统一字号：空行分段、行首「- 」列表、「标签｜内容」要点行。
 * 解析规则见 utils/richText.ts。
 */
import { computed } from 'vue'
import { parseRichText } from '@/utils/richText'

const props = defineProps<{
  /** 原文（空行分段纯文本） */
  body: string | null
}>()

const blocks = computed(() => parseRichText(props.body ?? ''))
</script>

<template>
  <div>
    <template v-for="(block, index) in blocks" :key="index">
      <!-- 普通段 -->
      <p v-if="block.type === 'p'" class="mb-[22px] font-sans text-[16px] leading-[2.05] text-white/78">
        <template v-for="(line, j) in block.lines" :key="j">
          {{ line }}<br v-if="j < block.lines.length - 1" />
        </template>
      </p>

      <!-- 列表 -->
      <ul v-else-if="block.type === 'list'" class="mb-[22px] list-none p-0">
        <li
          v-for="item in block.items"
          :key="item"
          class="relative mb-[10px] pl-[22px] font-sans text-[15px] leading-[1.9] text-white/75"
        >
          <span
            class="absolute left-[2px] top-[0.95em] block h-px w-[10px] bg-accent-gold"
            aria-hidden="true"
          />
          {{ item }}
        </li>
      </ul>

      <!-- 要点行：标签 | 内容 -->
      <div
        v-else-if="block.type === 'kv'"
        class="grid grid-cols-1 gap-y-1 border-b border-border-hairline py-[13px] md:grid-cols-[132px_1fr] md:gap-x-[18px]"
      >
        <span class="pt-[2px] font-sans text-[13px] text-accent-gold" style="letter-spacing: 3px">
          {{ block.key }}
        </span>
        <span class="font-sans text-[15px] leading-[1.85] text-white/78">{{ block.value }}</span>
      </div>
    </template>
  </div>
</template>
