<script setup lang="ts">
/**
 * 根组件：仅承载路由出口。
 * AdminLayout 负责侧栏/顶栏/移动 Tab，登录页为独立全屏页。
 */
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>
