<script setup lang="ts" generic="T extends { id: number }">
/**
 * 通用拖拽排序列表（HTML5 DnD）。
 * - direction: vertical（默认）/ horizontal
 * - bare: 去除外层边框/底色/内边距，仅提供拖动交互（用于卡片自带外观的场景）
 */
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    items: T[]
    disabled?: boolean
    direction?: 'vertical' | 'horizontal'
    bare?: boolean
  }>(),
  { disabled: false, direction: 'vertical', bare: false }
)
const emit = defineEmits<{ (e: 'reorder', items: T[]): void }>()

const dragIndex = ref(-1)
const overIndex = ref(-1)

function onDragStart(index: number, event: DragEvent): void {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number, event: DragEvent): void {
  if (props.disabled || dragIndex.value < 0) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  overIndex.value = index
}

function onDrop(index: number, event: DragEvent): void {
  if (props.disabled || dragIndex.value < 0) return
  event.preventDefault()
  const from = dragIndex.value
  dragIndex.value = -1
  overIndex.value = -1
  if (from === index) return
  const next = [...props.items]
  const moved = next.splice(from, 1)[0]
  if (!moved) return
  next.splice(index, 0, moved)
  emit('reorder', next)
}

function onDragEnd(): void {
  dragIndex.value = -1
  overIndex.value = -1
}
</script>

<template>
  <div
    class="flex gap-3"
    :class="direction === 'horizontal' ? 'flex-row flex-nowrap overflow-x-auto pb-1' : 'flex-col'"
  >
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="ad-drag-item"
      :class="{
        'is-dragging': dragIndex === index,
        'is-over': overIndex === index && dragIndex !== index,
        'is-disabled': disabled,
        'is-bare': bare
      }"
      :draggable="!disabled"
      @dragstart="onDragStart(index, $event)"
      @dragover="onDragOver(index, $event)"
      @drop="onDrop(index, $event)"
      @dragend="onDragEnd"
    >
      <span v-if="!bare" class="ad-drag-handle" :class="disabled && 'opacity-40'" title="拖拽调整顺序">
        <AppIcon name="grip" :size="16" />
      </span>
      <div :class="bare ? '' : 'flex-1 min-w-0'">
        <slot :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>
