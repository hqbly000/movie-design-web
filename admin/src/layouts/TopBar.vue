<script setup lang="ts">
/**
 * 顶栏：左 = 页面标题 + 副行；右 = 页面级主操作占位。
 * 视图通过 <Teleport defer to="#page-actions"> 注入页面级主按钮（§4.3）。
 * `defer`（Vue 3.5）让传送内容在本组件树挂载完成后再解析目标，
 * 避免布局尚未插入 document 时 querySelector 取到 null 导致整页崩溃。
 *
 * 2026-09-23：移除顶部全局搜索框 —— 它没有接任何数据源，属无效装饰（用户反馈）；
 * 搜索改为按列表就近提供：视频库（后端 keyword）/ 分发 / 留言 / 成员列表各自内置。
 * 底部分界线由 ad-border 加深为 ad-border-strong（纯白上可见）。
 */
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const { pageTitle, pageSubtitle } = storeToRefs(ui)
</script>

<template>
  <header class="sticky top-0 z-30 bg-ad-surface/95 backdrop-blur border-b border-ad-border-strong">
    <div class="flex items-center justify-between gap-3 px-5 md:px-8 h-14 md:h-topbar">
      <div class="min-w-0">
        <h1 class="text-[17px] md:text-[20px] font-semibold text-ad-text truncate leading-tight">
          {{ pageTitle }}
        </h1>
        <p class="hidden md:block text-[12px] text-ad-text-3 mt-1 truncate">{{ pageSubtitle }}</p>
      </div>

      <div id="page-actions" class="flex items-center gap-2" />
    </div>
  </header>
</template>
