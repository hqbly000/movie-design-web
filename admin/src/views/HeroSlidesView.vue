<script setup lang="ts">
/** 首页首屏（§5.4，R3）：固定 3 组，可编辑与拖拽排序，保存后前台生效 */
import { computed, onMounted, ref } from 'vue'
import { getHeroSlides, saveHeroSlides } from '@/api/site'
import { LIMITS, HERO_COUNT } from '@/utils/constants'
import { friendlyErrorMessage } from '@/utils/errors'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { HeroSlide } from '@/types/models'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppInput from '@/components/AppInput.vue'
import ImageUploader from '@/components/ImageUploader.vue'
import DragSortList from '@/components/DragSortList.vue'

const toast = useToastStore()
const auth = useAuthStore()

const slides = ref<HeroSlide[]>([])
const loading = ref(true)
const saving = ref(false)
const errorText = ref('')

usePageHeader('首页首屏', '三张图按顺序自动轮播，每张携带各自的标语；拖拽可调整顺序')

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await getHeroSlides()
    slides.value = res.slice(0, HERO_COUNT)
  } catch (e) {
    console.error('[首页首屏] 加载失败', e)
    errorText.value = friendlyErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function onReorder(next: HeroSlide[]): void {
  slides.value = next
}

const sloganError = computed(() => {
  if (!auth.canEdit) return ''
  return slides.value.some((s) => !s.slogan.trim()) ? '每张图都需要填写宣传语' : ''
})

async function save(): Promise<void> {
  if (!auth.canEdit) return
  if (slides.value.some((s) => !s.slogan.trim())) {
    toast.error('每张图都需要填写宣传语')
    return
  }
  saving.value = true
  errorText.value = ''
  try {
    await saveHeroSlides(
      slides.value.map((s, index) => ({
        id: s.id,
        image_url: s.image_url,
        slogan: s.slogan,
        sub_slogan: s.sub_slogan || null,
        sort: index
      }))
    )
    toast.success('已保存，前台下一次访问即生效')
  } catch (e) {
    console.error('[首页首屏] 保存失败', e)
    errorText.value = friendlyErrorMessage(e, '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4">
    <Teleport defer to="#page-actions">
      <AppButton variant="primary" :loading="saving" :disabled="!auth.canEdit" @click="save">
        保存修改
      </AppButton>
    </Teleport>

    <p v-if="!auth.canEdit" class="ad-hint !mt-0">当前角色为只读，无法保存修改</p>

    <div class="ad-card p-5 md:p-6">
      <div class="mb-4">
        <h2 class="text-[15px] font-semibold text-ad-text">首页首屏 · 轮播 {{ HERO_COUNT }} 张</h2>
        <p class="text-[12px] text-ad-text-3 mt-1">
          三张图按顺序自动轮播，每张携带各自的标语；拖拽可调整顺序
        </p>
      </div>

      <p v-if="errorText" class="ad-field-error !mt-0 mb-3">
        {{ errorText }}
        <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
      </p>

      <div v-if="loading" class="flex flex-col gap-3">
        <div v-for="i in 3" :key="i" class="ad-skeleton h-[130px] rounded-ctrl" />
      </div>

      <DragSortList v-else :items="slides" :disabled="!auth.canEdit" bare @reorder="onReorder">
        <template #default="{ item }">
          <div class="ad-row-soft w-full !p-3">
            <div class="flex flex-col md:flex-row md:items-center gap-3 w-full">
              <span class="ad-drag-handle shrink-0" :class="!auth.canEdit && 'opacity-40'" title="拖拽调整顺序">
                <AppIcon name="grip" :size="16" />
              </span>
              <div class="shrink-0">
                <ImageUploader
                  v-model="item.image_url"
                  :preview-height="90"
                  :disabled="!auth.canEdit"
                  hint="建议 1920×1080 横构图"
                />
              </div>
              <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-w-0">
                <AppInput
                  v-model="item.slogan"
                  label="宣传语"
                  :placeholder="`≤ ${LIMITS.slogan} 字`"
                  required
                  :maxlength="LIMITS.slogan"
                  :counter="`${item.slogan.length}/${LIMITS.slogan}`"
                  :disabled="!auth.canEdit"
                />
                <AppInput
                  v-model="item.sub_slogan"
                  label="副标语"
                  :placeholder="`≤ ${LIMITS.subSlogan} 字`"
                  :maxlength="LIMITS.subSlogan"
                  :counter="`${(item.sub_slogan ?? '').length}/${LIMITS.subSlogan}`"
                  :disabled="!auth.canEdit"
                />
              </div>
            </div>
          </div>
        </template>
      </DragSortList>

      <p v-if="sloganError" class="ad-field-error">{{ sloganError }}</p>
    </div>
  </div>
</template>
