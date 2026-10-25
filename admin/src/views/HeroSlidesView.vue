<script setup lang="ts">
/**
 * 首页首屏（§5.4，R3）：3 张图 + 1 个标题。
 *
 * 图片仍固定 3 张、可拖拽排序；文案只有一套（标题 / 副标题）三张图共用。
 * 数据层保持 hero_slides 三行不变，保存时把同一套文案写入三行，前台只读第一条渲染。
 */
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
const title = ref('')
const subTitle = ref('')
const loading = ref(true)
const saving = ref(false)
const errorText = ref('')

usePageHeader('首页首屏', '配 3 张轮播图 + 1 个标题（三张图共用同一套文案）')

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await getHeroSlides()
    slides.value = res.slice(0, HERO_COUNT)
    // 历史数据可能是三张各带一套文案，统一取第一条作为共用文案
    title.value = slides.value[0]?.slogan ?? ''
    subTitle.value = slides.value[0]?.sub_slogan ?? ''
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

/** 三行文案是否还残留差异（提示用户保存后会统一） */
const hasLegacyDiff = computed(() => {
  if (slides.value.length < 2) return false
  return slides.value.some((s) => s.slogan !== title.value || (s.sub_slogan ?? '') !== subTitle.value)
})

const titleError = computed(() => {
  if (!auth.canEdit) return ''
  if (!title.value.trim()) return '请填写首屏标题'
  if (title.value.length > LIMITS.slogan) return `标题不超过 ${LIMITS.slogan} 字`
  if (subTitle.value.length > LIMITS.subSlogan) return `副标题不超过 ${LIMITS.subSlogan} 字`
  return ''
})

async function save(): Promise<void> {
  if (!auth.canEdit) return
  if (!title.value.trim()) {
    toast.error('请填写首屏标题')
    return
  }
  if (title.value.length > LIMITS.slogan || subTitle.value.length > LIMITS.subSlogan) {
    toast.error(titleError.value)
    return
  }
  saving.value = true
  errorText.value = ''
  const slogan = title.value.trim()
  const sub = subTitle.value.trim()
  try {
    await saveHeroSlides(
      slides.value.map((s, index) => ({
        id: s.id,
        image_url: s.image_url,
        slogan,
        sub_slogan: sub || null,
        sort: index
      }))
    )
    // 同步本地副本，避免再次保存时仍按旧文案判断差异
    slides.value = slides.value.map((s) => ({ ...s, slogan, sub_slogan: sub || null }))
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
        <h2 class="text-[15px] font-semibold text-ad-text">首屏文案（三张图共用）</h2>
        <p class="text-[12px] text-ad-text-3 mt-1">
          前台只在首屏中央显示这一套文案，切换图片时不做文案切换
        </p>
      </div>
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <AppInput
          v-model="title"
          label="标题"
          :placeholder="`≤ ${LIMITS.slogan} 字，如「以光影，铭记时光」`"
          required
          :maxlength="LIMITS.slogan"
          :counter="`${title.length}/${LIMITS.slogan}`"
          :disabled="!auth.canEdit"
        />
        <AppInput
          v-model="subTitle"
          label="副标题"
          :placeholder="`≤ ${LIMITS.subSlogan} 字，可留空`"
          :maxlength="LIMITS.subSlogan"
          :counter="`${subTitle.length}/${LIMITS.subSlogan}`"
          :disabled="!auth.canEdit"
        />
      </div>
      <p v-if="hasLegacyDiff" class="ad-hint !mt-3">
        检测到三张图原有文案不一致，保存后将统一为上方文案
      </p>
    </div>

    <div class="ad-card p-5 md:p-6">
      <div class="mb-4">
        <h2 class="text-[15px] font-semibold text-ad-text">轮播图片 · {{ HERO_COUNT }} 张</h2>
        <p class="text-[12px] text-ad-text-3 mt-1">按顺序自动轮播，拖拽可调整顺序</p>
      </div>

      <p v-if="errorText" class="ad-field-error !mt-0 mb-3">
        {{ errorText }}
        <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
      </p>

      <div v-if="loading" class="flex flex-col gap-3">
        <div v-for="i in 3" :key="i" class="ad-skeleton h-[130px] rounded-ctrl" />
      </div>

      <DragSortList v-else :items="slides" :disabled="!auth.canEdit" bare @reorder="onReorder">
        <template #default="{ item, index }">
          <div class="ad-row-soft w-full !p-3">
            <div class="flex flex-col md:flex-row md:items-center gap-3 w-full">
              <span class="ad-drag-handle shrink-0" :class="!auth.canEdit && 'opacity-40'" title="拖拽调整顺序">
                <AppIcon name="grip" :size="16" />
              </span>
              <span class="ad-tag shrink-0">第 {{ index + 1 }} 张</span>
              <div class="shrink-0">
                <ImageUploader
                  v-model="item.image_url"
                  :preview-height="90"
                  :disabled="!auth.canEdit"
                  hint="建议 1920×1080 横构图"
                />
              </div>
              <p class="flex-1 text-[12px] text-ad-text-3 min-w-0">
                文案与其余两张共用，无需单独填写
              </p>
            </div>
          </div>
        </template>
      </DragSortList>

      <p v-if="titleError" class="ad-field-error">{{ titleError }}</p>
    </div>
  </div>
</template>
