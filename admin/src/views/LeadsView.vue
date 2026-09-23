<script setup lang="ts">
/** 预约留言（§5.8）：筛选 全部/未读/已回复；标记已回复后状态转灰 */
import { computed, onMounted, ref } from 'vue'
import { listLeads, replyLead } from '@/api/leads'
import { formatDateTime } from '@/utils/format'
import { leadStatusKind, leadStatusLabel } from '@/utils/labels'
import { MAX_PAGE_SIZE } from '@/utils/constants'
import { friendlyErrorMessage } from '@/utils/errors'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { Lead, LeadStatus } from '@/types/models'
import AppIcon from '@/components/AppIcon.vue'
import SearchInput from '@/components/SearchInput.vue'
import DataTable from '@/components/DataTable.vue'
import type { TableColumn } from '@/types/ui'
import StatusPill from '@/components/StatusPill.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonTable from '@/components/SkeletonTable.vue'
import LeadDetailDialog from '@/components/LeadDetailDialog.vue'

const toast = useToastStore()
const auth = useAuthStore()

const leads = ref<Lead[]>([])
const loading = ref(true)
const errorText = ref('')
const filter = ref<'all' | LeadStatus>('all')
const keyword = ref('')
const detailOpen = ref(false)
const current = ref<Lead | null>(null)

function isThisMonth(value: string): boolean {
  const d = new Date(value)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

const unreadCount = computed(() => leads.value.filter((l) => l.status === 'unread').length)
const repliedCount = computed(() => leads.value.filter((l) => l.status === 'replied').length)
const thisMonthCount = computed(() => leads.value.filter((l) => isThisMonth(l.created_at)).length)

usePageHeader(
  '预约留言',
  computed(() => `未读 ${unreadCount.value} 条 · 本月共 ${thisMonthCount.value} 条`)
)

const columns: TableColumn[] = [
  { key: 'customer', label: '客户', width: '200px' },
  { key: 'demand', label: '拍摄需求' },
  { key: 'created', label: '提交时间', width: '160px' },
  { key: 'status', label: '状态', width: '100px' },
  { key: 'actions', label: '操作', width: '180px', align: 'right' }
]

const tabs: { key: 'all' | LeadStatus; label: string; count: number }[] = [
  { key: 'all', label: '全部', count: 0 },
  { key: 'unread', label: '未读', count: 0 },
  { key: 'replied', label: '已回复', count: 0 }
]

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return leads.value.filter((l) => {
    if (filter.value !== 'all' && l.status !== filter.value) return false
    if (!kw) return true
    const hay = `${l.name} ${l.phone} ${l.demand_note ?? ''}`.toLowerCase()
    return hay.includes(kw)
  })
})

function tabCount(key: 'all' | LeadStatus): number {
  if (key === 'all') return leads.value.length
  if (key === 'unread') return unreadCount.value
  return repliedCount.value
}

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await listLeads({ page: 1, size: MAX_PAGE_SIZE })
    leads.value = res.items
  } catch (e) {
    console.error('[预约留言] 加载失败', e)
    errorText.value = friendlyErrorMessage(e)
    leads.value = []
  } finally {
    loading.value = false
  }
}

function openDetail(lead: Lead): void {
  current.value = lead
  detailOpen.value = true
}

async function markReplied(lead: Lead): Promise<void> {
  if (!auth.canEdit) return
  try {
    await replyLead(lead.id)
    toast.success('已标记为已回复')
    detailOpen.value = false
    await load()
  } catch (e) {
    console.error('[预约留言] 标记已回复失败', e)
    toast.error(friendlyErrorMessage(e, '操作失败'))
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4">
    <p v-if="!auth.canEdit" class="ad-hint !mt-0">当前角色为只读，无法标记已回复</p>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="ad-tab"
          :class="{ 'is-active': filter === t.key }"
          @click="filter = t.key"
        >
          {{ t.label }}
          <span class="ad-tab__count">{{ tabCount(t.key) }}</span>
        </button>
      </div>
      <SearchInput v-model="keyword" placeholder="搜索姓名 / 电话 / 需求" />
    </div>

    <p v-if="errorText" class="ad-field-error !mt-0">
      {{ errorText }}
      <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
    </p>

    <SkeletonTable v-if="loading" :rows="5" :cols="5" />

    <DataTable v-else :columns="columns" :rows="filtered" min-width="880px">
      <template #row="{ row }">
        <td class="ad-td">
          <span class="text-[14px] text-ad-text">{{ (row as Lead).name }}</span>
          <span class="block text-[12px] text-ad-text-4 mt-0.5">{{ (row as Lead).phone }}</span>
        </td>
        <td class="ad-td">
          <span class="text-ad-text-2">
            {{ (row as Lead).demand_type || '—' }}
            <template v-if="(row as Lead).demand_date"> · {{ (row as Lead).demand_date }}</template>
          </span>
          <span v-if="(row as Lead).demand_note" class="block text-[12px] text-ad-text-4 mt-0.5 truncate max-w-[420px]">
            {{ (row as Lead).demand_note }}
          </span>
        </td>
        <td class="ad-td">{{ formatDateTime((row as Lead).created_at) }}</td>
        <td class="ad-td">
          <StatusPill :kind="leadStatusKind((row as Lead).status)">
            {{ leadStatusLabel((row as Lead).status) }}
          </StatusPill>
        </td>
        <td class="ad-td !text-right">
          <div class="inline-flex items-center gap-1">
            <button
              v-if="(row as Lead).status === 'unread'"
              class="ad-btn-text !h-8"
              :disabled="!auth.canEdit"
              :title="auth.canEdit ? '标记已回复' : '当前角色为只读'"
              @click="markReplied(row as Lead)"
            >
              标记已回复
            </button>
            <button class="ad-btn-text !h-8" @click="openDetail(row as Lead)">
              <AppIcon name="eye" :size="14" />
              查看
            </button>
          </div>
        </td>
      </template>

      <!-- 移动端（<768）卡片 -->
      <template #mobileCard="{ row }">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[14px] text-ad-text">{{ (row as Lead).name }}</p>
            <p class="text-[12px] text-ad-text-4 mt-0.5">{{ (row as Lead).phone }}</p>
          </div>
          <StatusPill :kind="leadStatusKind((row as Lead).status)">
            {{ leadStatusLabel((row as Lead).status) }}
          </StatusPill>
        </div>
        <dl class="grid grid-cols-[64px_1fr] gap-y-1.5 mt-2.5 text-[12px]">
          <dt class="text-ad-text-4">拍摄需求</dt>
          <dd class="text-ad-text-2 min-w-0 break-words">
            {{ (row as Lead).demand_type || '—' }}
            <template v-if="(row as Lead).demand_date"> · {{ (row as Lead).demand_date }}</template>
          </dd>
          <dt class="text-ad-text-4">提交时间</dt>
          <dd class="text-ad-text-2">{{ formatDateTime((row as Lead).created_at) }}</dd>
        </dl>
        <p v-if="(row as Lead).demand_note" class="text-[12px] text-ad-text-3 mt-2 break-words">
          {{ (row as Lead).demand_note }}
        </p>
        <div class="flex items-center gap-3 mt-3 pt-3 border-t border-ad-border">
          <button
            v-if="(row as Lead).status === 'unread'"
            class="ad-btn-text !h-8"
            :disabled="!auth.canEdit"
            :title="auth.canEdit ? '标记已回复' : '当前角色为只读'"
            @click="markReplied(row as Lead)"
          >
            标记已回复
          </button>
          <button class="ad-btn-text !h-8" @click="openDetail(row as Lead)">
            <AppIcon name="eye" :size="14" />
            查看
          </button>
        </div>
      </template>

      <template #empty>
        <EmptyState icon="lead" title="暂无预约留言" hint="官网提交的预约将汇总在此" />
      </template>
    </DataTable>

    <LeadDetailDialog v-model="detailOpen" :lead="current" :can-reply="auth.canEdit" @reply="markReplied" />
  </div>
</template>
