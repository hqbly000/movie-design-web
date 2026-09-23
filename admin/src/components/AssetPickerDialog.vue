<script setup lang="ts">
/** 从图集选择图片（供首屏轮播 / 板块预览图使用） */
import { computed, ref, watch } from 'vue'
import { listAssets } from '@/api/videos'
import { assetUrl } from '@/utils/asset'
import { useToastStore } from '@/stores/toast'
import type { Asset } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    type?: string
  }>(),
  { type: '' }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', url: string): void
}>()

const toast = useToastStore()
const assets = ref<Asset[]>([])
const loading = ref(false)
const keyword = ref('')
const picked = ref<string | null>(null)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return assets.value
  return assets.value.filter((a) => a.url.toLowerCase().includes(kw) || (a.group_name ?? '').includes(kw))
})

async function load(): Promise<void> {
  loading.value = true
  try {
    assets.value = await listAssets(props.type ? { type: props.type } : {})
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      picked.value = null
      keyword.value = ''
      void load()
    }
  }
)

function close(): void {
  emit('update:modelValue', false)
}
function confirm(): void {
  if (!picked.value) {
    toast.info('请选择一张图片')
    return
  }
  emit('select', picked.value)
  close()
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="从图集选择"
    subtitle="素材库现有图片，点击选中后确认"
    :width="720"
    :overlay-opacity="0.5"
    :z-index="1100"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="mb-4">
      <div class="relative">
        <AppIcon name="search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-ad-text-4" />
        <input v-model="keyword" class="ad-input pl-9" placeholder="搜索文件名 / 分组" />
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-3 md:grid-cols-4 gap-3">
      <div v-for="i in 8" :key="i" class="ad-skeleton" style="aspect-ratio: 4 / 3" />
    </div>
    <p v-else-if="!filtered.length" class="py-10 text-center text-[13px] text-ad-text-3">图集暂无可选图片</p>
    <div v-else class="grid grid-cols-3 md:grid-cols-4 gap-3">
      <button
        v-for="a in filtered"
        :key="a.id"
        type="button"
        class="group relative rounded-ctrl overflow-hidden border-2 transition-colors"
        :class="picked === a.url ? 'border-accent' : 'border-transparent hover:border-ad-border-control'"
        @click="picked = a.url"
      >
        <img :src="assetUrl(a.url)" :alt="a.group_name ?? '素材'" class="w-full block bg-ad-fill" style="aspect-ratio: 4 / 3; object-fit: cover" />
        <span
          v-if="picked === a.url"
          class="absolute right-1.5 top-1.5 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center"
        >
          <AppIcon name="check" :size="13" :stroke-width="2.4" />
        </span>
        <span class="absolute left-0 right-0 bottom-0 px-2 py-1 text-[11px] text-white bg-black/45 truncate text-left">
          {{ a.group_name ?? '图集' }} · {{ a.width }}×{{ a.height }}
        </span>
      </button>
    </div>

    <template #footer>
      <span class="text-[12px] text-ad-text-3">{{ picked ? '已选中 1 张' : '未选择' }}</span>
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="close">取消</AppButton>
        <AppButton variant="primary" :disabled="!picked" @click="confirm">确定选择</AppButton>
      </div>
    </template>
  </AppModal>
</template>
