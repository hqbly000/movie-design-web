<script setup lang="ts">
/** 加载骨架：表格行 + 单元格（§7.1 加载中） */
withDefaults(
  defineProps<{
    rows?: number
    cols?: number
  }>(),
  { rows: 5, cols: 4 }
)
</script>

<template>
  <div class="ad-card overflow-hidden">
    <div class="flex items-center gap-4 px-4 h-[42px] bg-[#fbfbfc] border-b border-ad-border">
      <div v-for="c in cols" :key="`h${c}`" class="ad-skeleton h-3" :class="c === 1 ? 'w-24' : 'w-16'" />
    </div>
    <div v-for="r in rows" :key="`r${r}`" class="flex items-center gap-4 px-4 h-[64px] border-b border-ad-border">
      <div
        v-for="c in cols"
        :key="`c${r}-${c}`"
        class="ad-skeleton h-3"
        :class="c === 1 ? 'w-32' : c === cols ? 'w-14' : 'w-20'"
      />
    </div>
  </div>
</template>
