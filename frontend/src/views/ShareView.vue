<script setup lang="ts">
/**
 * ShareView —— 作品分享页（R15–R18 / §3）。
 * 移动优先 390；`GET /api/share/{token}` 返回 code 4001 → 渲染失效页。
 * **不渲染** R16 列出的任何模块（分享入口 / 作品参数 / 相关作品 / 播放数据 / 外跳按钮 / 时长）。
 * 「切换能力」按验收反馈开放：点击合集清单即切换主播放器（仍不加左右箭头/播放数据）。
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ShareHeader from '@/components/share/ShareHeader.vue'
import ShareCollection from '@/components/share/ShareCollection.vue'
import SharePlayer from '@/components/share/SharePlayer.vue'
import ShareList from '@/components/share/ShareList.vue'
import ShareExpired from '@/components/share/ShareExpired.vue'
import ShareFooter from '@/components/share/ShareFooter.vue'
import { getShareCollection } from '@/api/share'
import { ApiError, ERROR_CODE } from '@/api/http'
import { useSiteStore } from '@/stores/site'
import type { ShareCollection as ShareCollectionModel } from '@/types/share'

type PageState = 'loading' | 'ok' | 'expired' | 'error'

const route = useRoute()
const site = useSiteStore()

const token = computed(() => {
  const raw = route.params.token
  return Array.isArray(raw) ? (raw[0] ?? '') : String(raw ?? '')
})

const state = ref<PageState>('loading')
const collection = ref<ShareCollectionModel | null>(null)
/** 当前主播放器索引；由合集清单点击驱动。 */
const activeIndex = ref(0)
/** 主播放器包裹层（切换后按需滚回播放器）。 */
const playerWrap = ref<HTMLElement | null>(null)

async function load(): Promise<void> {
  if (!token.value) {
    state.value = 'expired'
    return
  }
  state.value = 'loading'
  try {
    const data = await getShareCollection(token.value)
    collection.value = data
    activeIndex.value = 0
    state.value = 'ok'
  } catch (err) {
    if (err instanceof ApiError && err.code === ERROR_CODE.SHARE_INVALID) {
      state.value = 'expired'
    } else {
      state.value = 'error'
    }
  }
}

/**
 * 切换主播放器。播放器若已被滚出视口（清单在下方时常见），
 * 平滑滚回其顶部；否则保持当前滚动位置不动。
 */
async function selectVideo(index: number): Promise<void> {
  if (index === activeIndex.value) return
  activeIndex.value = index
  await nextTick()
  const el = playerWrap.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const safeOffset = 24
  if (rect.top < safeOffset || rect.bottom > window.innerHeight) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

watch(token, () => void load(), { immediate: true })

onMounted(() => {
  // 页脚需要联系方式 / 备案；失败时使用兜底数据
  void site.loadSite()
})
</script>

<template>
  <div class="min-h-screen bg-[#0A0A0A]">
    <ShareHeader />

    <!-- 加载中 -->
    <div v-if="state === 'loading'" class="mx-auto w-full max-w-[520px] px-6 py-10">
      <div class="h-4 w-40 animate-pulse rounded bg-white/10" />
      <div class="mt-5 h-9 w-3/4 animate-pulse rounded bg-white/10" />
      <div class="mt-3 h-4 w-1/2 animate-pulse rounded bg-white/10" />
      <div class="mt-8 aspect-video w-full animate-pulse rounded-[2px] bg-white/10" />
      <div class="mt-8 flex flex-col gap-3">
        <div v-for="row in 3" :key="row" class="h-[66px] animate-pulse rounded bg-white/[0.06]" />
      </div>
    </div>

    <!-- 失效 -->
    <ShareExpired v-else-if="state === 'expired'" />

    <!-- 其他错误 -->
    <div
      v-else-if="state === 'error'"
      class="mx-auto flex min-h-[60vh] w-full max-w-[520px] flex-col items-center justify-center gap-4 px-8 text-center"
    >
      <p class="font-sans text-[14px] text-white/70">页面加载失败，请稍后重试</p>
      <button
        type="button"
        class="font-sans text-[13px] text-accent-gold underline-offset-4 hover:underline"
        @click="load"
      >
        重新加载
      </button>
    </div>

    <!-- 正常 -->
    <template v-else-if="collection">
      <!-- 空合集兜底 -->
      <ShareCollection :collection="collection" />
      <div ref="playerWrap" class="scroll-mt-6">
        <SharePlayer
          v-if="collection.videos.length > 0"
          :videos="collection.videos"
          :active-index="activeIndex"
        />
      </div>
      <p
        v-if="collection.videos.length === 0"
        class="mx-auto w-full max-w-[520px] px-6 pt-8 text-center font-sans text-[13px] text-white/60"
      >
        该合集暂无作品
      </p>
      <ShareList
        v-if="collection.videos.length > 0"
        :videos="collection.videos"
        :active-index="activeIndex"
        :generated-at="collection.generated_at"
        @select="selectVideo"
      />
    </template>

    <ShareFooter />
  </div>
</template>
