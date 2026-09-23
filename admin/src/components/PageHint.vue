<script setup lang="ts">
/** 提示条（§5.6 / §5.7）：一行说明 + 可选信息图标 */
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    text?: string
    kind?: 'info' | 'warn'
  }>(),
  { text: '', kind: 'info' }
)
</script>

<template>
  <div
    class="flex items-start gap-2.5 rounded-ctrl px-3.5 py-3 text-[13px] leading-5"
    :class="kind === 'warn' ? 'bg-[#FFF7ED] text-[#8A5A22]' : 'bg-accent-soft text-[#0A5BB5]'"
  >
    <AppIcon :name="kind === 'warn' ? 'info' : 'info'" :size="16" class="mt-0.5" />
    <div class="flex-1">
      <slot>{{ text }}</slot>
    </div>
  </div>
</template>
