<script setup lang="ts">
/**
 * 可选可输入下拉（combobox）。
 *
 * 用于「奖项类型」这类半开放枚举：点开是已有选项，直接输入则视为新增一个类型。
 * - ↑/↓ 移动高亮，Enter 选中（无高亮时沿用输入值），Esc 只收起下拉不再冒泡关弹框；
 * - 失焦关闭；选项用 `mousedown.prevent` 保住输入框焦点，避免 blur 抢在 click 之前；
 * - 下拉空间不足时自动向上展开（弹框内字段靠底时不会被裁掉）。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: string[]
    label?: string
    placeholder?: string
    required?: boolean
    error?: string
    hint?: string
    disabled?: boolean
    maxlength?: number
    /** 输入了非候选内容时，下拉底部提示的动宾短语（留空则只显示「新增」） */
    createHint?: string
  }>(),
  {
    label: '',
    placeholder: '',
    required: false,
    error: '',
    hint: '',
    disabled: false,
    maxlength: 32,
    createHint: ''
  }
)

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const rootEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const open = ref(false)
const dropUp = ref(false)
const activeIndex = ref(-1)
const draft = ref(props.modelValue ?? '')
/** 是否已手动输入过（刚聚焦时展示全量候选，不按当前值过滤） */
const touched = ref(false)

watch(
  () => props.modelValue,
  (value) => {
    draft.value = value ?? ''
  }
)

/** 按输入过滤候选；未输入时展示全部。 */
const filtered = computed(() => {
  if (!touched.value) return props.options
  const keyword = draft.value.trim().toLowerCase()
  if (!keyword) return props.options
  return props.options.filter((opt) => opt.toLowerCase().includes(keyword))
})

/** 输入内容不在候选里 → 可作为新类型提交。 */
const canCreate = computed(() => {
  if (!touched.value) return false
  const value = draft.value.trim()
  if (!value) return false
  return !props.options.some((opt) => opt.trim() === value)
})

/**
 * 下拉可用的下边界。
 * 弹框（AppModal）正文是 `overflow-y-auto`，按 window.innerHeight 判断会算错：
 * 明明还有视口空间，却被滚动容器裁掉。所以先找最近的滚动/裁剪祖先。
 */
function clipBottom(el: HTMLElement | null): number {
  let node: HTMLElement | null = el
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
      return node.getBoundingClientRect().bottom
    }
    node = node.parentElement
  }
  return window.innerHeight
}

/** 下拉展开前判断朝向：下方不足 240px 就向上弹。 */
function placeDropdown(): void {
  const rect = inputEl.value?.getBoundingClientRect()
  if (!rect) return
  dropUp.value = clipBottom(inputEl.value) - rect.bottom < 240
}

function openList(): void {
  if (props.disabled) return
  placeDropdown()
  open.value = true
  activeIndex.value = -1
  touched.value = false
}

function onInput(event: Event): void {
  draft.value = (event.target as HTMLInputElement).value
  emit('update:modelValue', draft.value)
  placeDropdown()
  open.value = true
  activeIndex.value = -1
  touched.value = true
}

function pick(value: string): void {
  const next = value.trim().slice(0, props.maxlength)
  draft.value = next
  emit('update:modelValue', next)
  open.value = false
  activeIndex.value = -1
  touched.value = false
}

function move(step: number): void {
  if (!open.value) {
    openList()
    return
  }
  const total = filtered.value.length
  if (!total) return
  activeIndex.value = (activeIndex.value + step + total) % total
}

function onEnter(): void {
  const highlighted = filtered.value[activeIndex.value]
  if (open.value && highlighted) {
    pick(highlighted)
    return
  }
  open.value = false
}

function onBlur(): void {
  open.value = false
  activeIndex.value = -1
  // 输入的内容即使没点候选也生效（等于新增类型），这里统一去掉首尾空格
  const trimmed = draft.value.trim()
  if (trimmed !== draft.value) {
    draft.value = trimmed
    emit('update:modelValue', trimmed)
  }
}

/** 点到组件外部（含用箭头按钮打开后未聚焦输入框的场景）就收起。 */
function onDocPointerDown(event: PointerEvent): void {
  if (!open.value) return
  const root = rootEl.value
  if (root && !root.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true))
</script>

<template>
  <div ref="rootEl" class="relative">
    <label v-if="label" class="ad-label">
      {{ label }}<span v-if="required" class="text-[#c0392b] ml-0.5">*</span>
    </label>

    <div class="relative">
      <input
        ref="inputEl"
        class="ad-input pr-9"
        :class="error && 'is-error'"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        :value="draft"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        autocomplete="off"
        @input="onInput"
        @focus="openList"
        @blur="onBlur"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="onEnter"
        @keydown.esc.stop="open = false"
      />
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center text-ad-text-4"
        :disabled="disabled"
        tabindex="-1"
        :aria-label="open ? '收起选项' : '展开选项'"
        @mousedown.prevent
        @click="open ? (open = false) : openList()"
      >
        <AppIcon name="chevronDown" :size="16" class="transition-transform" :class="open && 'rotate-180'" />
      </button>

      <div
        v-if="open && (filtered.length > 0 || canCreate)"
        class="absolute left-0 right-0 z-30 max-h-[220px] overflow-y-auto rounded-[10px] border border-ad-border bg-white py-1 shadow-[0_12px_28px_-8px_rgba(0,0,0,0.18)]"
        :class="dropUp ? 'bottom-full mb-1' : 'top-full mt-1'"
        role="listbox"
      >
        <button
          v-for="(opt, index) in filtered"
          :key="opt"
          type="button"
          role="option"
          :aria-selected="opt === modelValue"
          class="flex w-full items-center justify-between gap-2 px-3 text-left text-[13px] leading-8"
          :class="index === activeIndex ? 'bg-ad-fill text-ad-text' : 'text-ad-text-2'"
          @mousedown.prevent
          @mouseenter="activeIndex = index"
          @click="pick(opt)"
        >
          <span class="truncate">{{ opt }}</span>
          <AppIcon v-if="opt === modelValue" name="check" :size="14" class="shrink-0 text-accent" />
        </button>
        <button
          v-if="canCreate"
          type="button"
          class="flex w-full items-center gap-1.5 border-t border-ad-border px-3 text-left text-[13px] leading-8 text-accent"
          @mousedown.prevent
          @click="pick(draft)"
        >
          <AppIcon name="plus" :size="13" class="shrink-0" />
          <span class="truncate">{{ createHint || '新增' }}「{{ draft.trim() }}」</span>
        </button>
      </div>
    </div>

    <p v-if="error" class="ad-field-error">{{ error }}</p>
    <p v-else-if="hint" class="ad-hint">{{ hint }}</p>
  </div>
</template>
