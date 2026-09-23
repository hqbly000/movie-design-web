<script setup lang="ts">
/**
 * 根组件：仅承载 RouterView。
 * 全局 `v-reveal` 指令在 main.ts 中注册（app.directive）。
 */
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>
