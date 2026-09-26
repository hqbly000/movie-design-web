<script setup lang="ts">
/**
 * 「选择图片（多选）」弹框：供业务板块图集清单使用。
 * - 叠在编辑板块弹框之上（默认遮罩 50%）
 * - 搜索（文件名 / 分组名）+ 缩略图网格勾选
 * - 勾选顺序即清单顺序（Map 保序）
 * - 底部「已选 N 张」+ 确定，确定后回填
 */
import { computed, ref, watch } from 'vue'
import { listAssets } from '@/api/videos'
import { assetUrl } from '@/utils/asset'
import { friendlyErrorMessage } from '@/utils/errors'
import { useToastStore } from '@/stores/toast'
import type { Asset } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    selected?: Asset[]
    zIndex?: number
    overlayOpacity?: number
  }>(),
  { selected: () => [], zIndex: 1200, overlayOpacity: 0.5 }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', assets: Asset[]): void
}>()

const toast = useToastStore()
const all = ref<Asset[]>([])
const loading = ref(false)
const keyword = ref('')
/** 保序的已选集合：key=asset.id */
const picked = ref<Map<number, Asset>>(new Map())

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return all.value
  return all.value.filter(
    (a) => a.url.toLowerCase().includes(kw) || (a.group_name ?? '').toLowerCase().includes(kw)
  )
})

async function load(): Promise<void> {
  loading.value = true
  try {
    all.value = await listAssets()
  } catch (e) {
    console.error('[选择图片] 加载图集失败', e)
    toast.error(friendlyErrorMessage(e, '图集列表加载失败'))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const map = new Map<number, Asset>()
      for (const a of props.selected ?? []) map.set(a.id, a)
      picked.value = map
      keyword.value = ''
      void load()
    }
  }
)

function isPicked(id: number): boolean {
  return picked.value.has(id)
}
function toggle(asset: Asset): void {
  const map = picked.value
  if (map.has(asset.id)) map.delete(asset.id)
  else map.set(asset.id, asset)
  picked.value = new Map(map)
}
function close(): void {
  emit('update:modelValue', false)
}
function confirm(): void {
  emit('confirm', [...picked.value.values()])
  close()
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="选择图片"
    :width="640"
    :overlay-opacity="overlayOpacity"
    :z-index="zIndex"
    body-padding
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <div class="relative">
        <AppIcon name="search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-ad-text-4" />
        <input v-model="keyword" class="ad-input pl-9" placeholder="搜索文件名 / 分组名" />
      </div>
    </div>

    <div class="mt-3 max-h-[46vh] overflow-y-auto">
      <div v-if="loading" class="grid grid-cols-3 gap-2">
        <div v-for="i in 6" :key="i" class="ad-skeleton aspect-[4/3] rounded-ctrl" />
      </div>
      <p v-else-if="!filtered.length" class="py-10 text-center text-[13px] text-ad-text-3">
        没有符合条件的图片
      </p>
      <div v-else class="grid grid-cols-3 gap-2">
        <button
          v-for="a in filtered"
          :key="a.id"
          type="button"
          class="group relative overflow-hidden rounded-ctrl border-2 text-left transition-colors"
          :class="isPicked(a.id) ? 'border-accent' : 'border-transparent hover:border-ad-border-control'"
          :aria-label="`图片 ${a.url}`"
          @click="toggle(a)"
        >
          <img
            :src="assetUrl(a.url)"
            alt=""
            class="aspect-[4/3] w-full object-cover bg-ad-fill"
            loading="lazy"
          />
          <span
            class="absolute left-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors"
            :class="isPicked(a.id) ? 'bg-accent border-accent text-white' : 'border-white/80 bg-black/30'"
          >
            <AppIcon v-if="isPicked(a.id)" name="check" :size="12" :stroke-width="3" />
          </span>
          <span class="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] text-white/85">
            {{ a.group_name || a.url.split('/').pop() }}
          </span>
        </button>
      </div>
    </div>

    <template #footer>
      <span class="text-[13px] text-ad-text-2">已选 <b class="text-accent">{{ picked.size }}</b> 张</span>
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="close">取消</AppButton>
        <AppButton variant="primary" :disabled="picked.size === 0" @click="confirm">确定选择</AppButton>
      </div>
    </template>
  </AppModal>
</template>
