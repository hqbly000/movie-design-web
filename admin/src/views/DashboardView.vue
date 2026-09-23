<script setup lang="ts">
/** 工作台（§5.1）：3 统计卡 + 最近上传 + 预约留言；移动端 2 卡 + 快捷操作 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getDashboardStats } from '@/api/dashboard'
import { assetUrl } from '@/utils/asset'
import { formatDate, formatDateTime, formatWeekday } from '@/utils/format'
import { categoryLabel, videoStatusKind, videoStatusLabel } from '@/utils/labels'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import type { DashboardStats } from '@/types/models'
import StatCard from '@/components/StatCard.vue'
import StatusPill from '@/components/StatusPill.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const toast = useToastStore()
const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const errorText = ref('')

const subtitle = computed(() => {
  const now = new Date()
  if (!stats.value) return `${formatDate(now)} ${formatWeekday(now)}`
  return `${formatDate(now)} ${formatWeekday(now)} · ${stats.value.video_total} 支视频 · ${stats.value.active_share} 个有效分享`
})

usePageHeader('工作台', subtitle)

const deltaText = computed(() => {
  const delta = stats.value?.today_leads_delta ?? 0
  if (delta === 0) return '与昨日持平'
  return `较昨日 ${delta > 0 ? '+' : ''}${delta}`
})

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    stats.value = await getDashboardStats()
  } catch (e) {
    errorText.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- 错误行内提示 -->
    <p v-if="errorText" class="ad-field-error !mt-0">
      {{ errorText }}
      <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
    </p>

    <!-- 统计卡 -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <div v-for="i in 3" :key="i" class="ad-card p-5">
        <div class="ad-skeleton h-3 w-20" />
        <div class="ad-skeleton h-7 w-16 mt-4" />
        <div class="ad-skeleton h-3 w-24 mt-4" />
      </div>
    </div>
    <div v-else-if="stats" class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <StatCard
        label="今日预约"
        :value="stats.today_leads"
        :sub="deltaText"
        icon="lead"
        tone="accent"
      />
      <StatCard
        label="视频库"
        :value="stats.video_total"
        :sub="`本月新增 ${stats.video_added_this_month} 支`"
        icon="video"
        class="hidden md:block"
      />
      <StatCard
        label="有效分享链接"
        :value="stats.active_share"
        :sub="`${stats.expiring_within_7d} 个 7 天内到期`"
        icon="share"
      />
    </div>

    <!-- 移动端快捷操作 -->
    <div class="ad-card p-5 md:hidden">
      <p class="text-[14px] font-medium text-ad-text mb-3">快捷操作</p>
      <div class="flex flex-wrap gap-2.5">
        <AppButton variant="soft" @click="router.push({ name: 'distributions', query: { new: '1' } })">
          <AppIcon name="share" :size="15" />
          生成临时合集
        </AppButton>
        <AppButton variant="secondary" @click="router.push({ name: 'videos', query: { new: '1' } })">
          <AppIcon name="plus" :size="15" />
          新增视频
        </AppButton>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
      <!-- 最近上传 -->
      <section class="ad-card overflow-hidden">
        <header class="flex items-center justify-between px-5 h-14 border-b border-ad-border">
          <h2 class="text-[15px] font-semibold text-ad-text">最近上传</h2>
          <button class="ad-btn-text !h-8 !px-2" @click="router.push({ name: 'videos' })">查看全部</button>
        </header>
        <div v-if="loading" class="p-5 flex flex-col gap-3">
          <div v-for="i in 3" :key="i" class="ad-skeleton h-12 rounded-ctrl" />
        </div>
        <ul v-else-if="stats?.recent_uploads.length" class="divide-y divide-ad-border">
          <li
            v-for="v in stats.recent_uploads.slice(0, 3)"
            :key="v.id"
            class="flex items-center gap-3 px-5 py-3 hover:bg-row-hover transition-colors"
          >
            <img
              :src="assetUrl(v.cover_url)"
              alt=""
              class="w-[64px] h-[36px] rounded-[6px] object-cover bg-ad-fill shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-[14px] text-ad-text truncate">{{ v.title }}</p>
              <p class="text-[12px] text-ad-text-4 mt-0.5 truncate">
                {{ categoryLabel(v.category_id) }} · {{ v.bv_id }} · {{ v.created_by_name ?? '—' }} ·
                {{ formatDate(v.created_at) }}
              </p>
            </div>
            <StatusPill :kind="videoStatusKind(v.status)">{{ videoStatusLabel(v.status) }}</StatusPill>
          </li>
        </ul>
        <EmptyState v-else compact icon="video" title="还没有视频" hint="点击右上角或视频库新增" />
      </section>

      <!-- 预约留言 -->
      <section class="ad-card overflow-hidden">
        <header class="flex items-center justify-between px-5 h-14 border-b border-ad-border">
          <h2 class="text-[15px] font-semibold text-ad-text">预约留言</h2>
          <button class="ad-btn-text !h-8 !px-2" @click="router.push({ name: 'leads' })">查看全部</button>
        </header>
        <div v-if="loading" class="p-5 flex flex-col gap-3">
          <div v-for="i in 3" :key="i" class="ad-skeleton h-12 rounded-ctrl" />
        </div>
        <ul v-else-if="stats?.recent_leads.length" class="divide-y divide-ad-border">
          <li
            v-for="l in stats.recent_leads.slice(0, 3)"
            :key="l.id"
            class="px-5 py-3 hover:bg-row-hover transition-colors cursor-pointer"
            @click="router.push({ name: 'leads' })"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-[14px] text-ad-text truncate">
                {{ l.name }}<span class="text-ad-text-3 text-[13px] ml-2">{{ l.phone }}</span>
              </p>
              <span class="text-[12px] text-ad-text-4 shrink-0">{{ formatDateTime(l.created_at) }}</span>
            </div>
            <p class="text-[13px] text-ad-text-3 mt-1 line-clamp-1">{{ l.demand_note || '—' }}</p>
          </li>
        </ul>
        <EmptyState v-else compact icon="lead" title="暂无预约留言" />
      </section>
    </div>
  </div>
</template>
