<script setup lang="ts">
/**
 * 图片上传/替换：
 * - 点击预览图或按钮上传新图（POST /api/admin/uploads）
 * - 支持「从图集选择」（复用素材库）
 */
import { ref } from 'vue'
import { uploadImage } from '@/api/videos'
import { assetUrl } from '@/utils/asset'
import { ApiError } from '@/api/request'
import { useToastStore } from '@/stores/toast'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'
import AssetPickerDialog from './AssetPickerDialog.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | null | undefined
    aspect?: string
    previewHeight?: number
    hint?: string
    disabled?: boolean
  }>(),
  { aspect: '16 / 9', previewHeight: 0, hint: '', disabled: false }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string | null): void }>()

const toast = useToastStore()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const galleryOpen = ref(false)

function pick(): void {
  if (props.disabled) return
  fileInput.value?.click()
}

async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片不能超过 5MB')
    return
  }
  uploading.value = true
  try {
    const res = await uploadImage(file)
    emit('update:modelValue', res.url)
    toast.success('封面已更新')
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : '上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

function onGallerySelect(url: string): void {
  emit('update:modelValue', url)
  toast.success('已选择图集图片')
}

function clear(): void {
  emit('update:modelValue', null)
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row items-start gap-3">
      <button
        type="button"
        class="relative rounded-ctrl overflow-hidden border border-ad-border-control bg-ad-fill group"
        :class="disabled && 'opacity-40 pointer-events-none'"
        :style="{ width: previewHeight ? `${previewHeight * (16 / 9)}px` : '160px', height: previewHeight ? `${previewHeight}px` : '90px' }"
        @click="pick"
      >
        <img v-if="modelValue" :src="assetUrl(modelValue)" alt="预览" class="w-full h-full object-cover" />
        <span v-else class="w-full h-full flex flex-col items-center justify-center text-ad-text-4 gap-1">
          <AppIcon name="image" :size="20" />
          <span class="text-[11px]">未设置</span>
        </span>
        <span
          v-if="uploading"
          class="absolute inset-0 bg-black/40 text-white text-[12px] flex items-center justify-center"
        >上传中…</span>
        <span
          v-else
          class="absolute inset-0 bg-black/0 group-hover:bg-black/30 text-transparent group-hover:text-white text-[12px] flex items-center justify-center transition-colors"
        >点击替换</span>
      </button>

      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <AppButton variant="secondary" size="sm" :disabled="disabled || uploading" @click="pick">
            <AppIcon name="upload" :size="14" />
            上传新图
          </AppButton>
          <AppButton variant="secondary" size="sm" :disabled="disabled" @click="galleryOpen = true">
            从图集选择
          </AppButton>
        </div>
        <button
          v-if="modelValue"
          type="button"
          class="text-[12px] text-ad-text-3 hover:text-ad-text-2 text-left"
          :disabled="disabled"
          @click="clear"
        >
          移除图片
        </button>
        <p v-if="hint" class="text-[11px] text-ad-text-4 leading-4 max-w-[240px]">{{ hint }}</p>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onFile" />

    <AssetPickerDialog v-model="galleryOpen" @select="onGallerySelect" />
  </div>
</template>
