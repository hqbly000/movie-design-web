<script setup lang="ts">
/**
 * 合集分发（§5.5，R18/R22/R23/R24）—— 主视图为分发列表，列表上方即新增入口。
 * 客户端凭链接查看，无需登录；支持复制链接 / 预览 / 关闭 / 重新生成。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { closeDistribution, listDistributions } from '@/api/distributions'
import { listVideos } from '@/api/videos'
import { copyText } from '@/composables/useClipboard'
import { formatDateTime } from '@/utils/format'
import { distributionLimitText, distributionStatusKind, distributionStatusLabel } from '@/utils/labels'
import { PAGE_SIZE, MAX_PAGE_SIZE } from '@/utils/constants'
import { friendlyErrorMessage } from '@/utils/errors'
import { usePageHeader } from '@/composables/usePageHeader'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { Distribution, DistributionCreateResult, DistributionStatus, Video } from '@/types/models'
import AppButton from '@/components/AppButton.vue'
import SearchInput from '@/components/SearchInput.vue'
import AppIcon from '@/components/AppIcon.vue'
import DataTable from '@/components/DataTable.vue'
import type { TableColumn } from '@/types/ui'
import AppPagination from '@/components/AppPagination.vue'
import StatusPill from '@/components/StatusPill.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonTable from '@/components/SkeletonTable.vue'
import NewDistributionDialog from '@/components/NewDistributionDialog.vue'
import RegenerateDialog from '@/components/RegenerateDialog.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const { confirm } = useConfirm()

const all = ref<Distribution[]>([])
const loading = ref(true)
const errorText = ref('')
const statusFilter = ref<'all' | DistributionStatus>('all')
const keyword = ref('')
const page = ref(1)

const dialogOpen = ref(false)
const preselected = ref<Video[]>([])
const regenerateTarget = ref<Distribution | null>(null)
const regenerateOpen = ref(false)

const counts = computed(() => ({
  all: all.value.length,
  active: all.value.filter((d) => d.status === 'active').length,
  expired: all.value.filter((d) => d.status === 'expired').length,
  closed: all.value.filter((d) => d.status === 'closed').length
}))

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return all.value.filter((d) => {
    if (statusFilter.value !== 'all' && d.status !== statusFilter.value) return false
    if (!kw) return true
    const hay = `${d.collection_name ?? ''} ${d.customer_masked ?? ''}`.toLowerCase()
    return hay.includes(kw)
  })
})
const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

usePageHeader(
  '合集分发',
  computed(
    () => `共 ${counts.value.all} 条分发 · 有效中 ${counts.value.active} · 新建后为客户生成限时链接`
  )
)

const columns: TableColumn[] = [
  { key: 'name', label: '分发名称' },
  { key: 'customer', label: '客户', width: '200px' },
  { key: 'count', label: '支数', width: '72px' },
  { key: 'created', label: '分发时间', width: '150px' },
  { key: 'limit', label: '限时', width: '190px' },
  { key: 'status', label: '状态', width: '96px' },
  { key: 'creator', label: '生成人', width: '110px' },
  { key: 'actions', label: '操作', width: '190px', align: 'right' }
]

const tabs: { key: 'all' | DistributionStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '有效中' },
  { key: 'expired', label: '已过期' },
  { key: 'closed', label: '已关闭' }
]

function tabCount(key: 'all' | DistributionStatus): number {
  return counts.value[key]
}

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await listDistributions({ page: 1, size: MAX_PAGE_SIZE })
    all.value = res.items
  } catch (e) {
    console.error('[合集分发] 加载列表失败', e)
    errorText.value = friendlyErrorMessage(e)
    all.value = []
  } finally {
    loading.value = false
  }
}

function setTab(key: 'all' | DistributionStatus): void {
  statusFilter.value = key
  page.value = 1
}
function onPageChange(p: number): void {
  page.value = p
}

async function loadPreselected(ids: number[]): Promise<void> {
  if (!ids.length) {
    preselected.value = []
    return
  }
  try {
    const res = await listVideos({ page: 1, size: MAX_PAGE_SIZE })
    const map = new Map(res.items.map((v) => [v.id, v]))
    preselected.value = ids.map((id) => map.get(id)).filter((v): v is Video => !!v)
  } catch (e) {
    console.error('[合集分发] 加载预选视频失败', e)
    preselected.value = []
  }
}

function openNew(): void {
  preselected.value = []
  dialogOpen.value = true
}

async function onCreated(_result: DistributionCreateResult): Promise<void> {
  await load()
}

async function copyLink(d: Distribution): Promise<void> {
  const ok = await copyText(d.share_url)
  toast[ok ? 'success' : 'error'](ok ? '链接已复制' : '复制失败，请手动复制')
}

function preview(d: Distribution): void {
  window.open(d.share_url, '_blank', 'noopener')
}

async function close(d: Distribution): Promise<void> {
  const ok = await confirm({
    title: '关闭分发',
    text: `关闭后客户打开链接将看到「链接已失效」，确定关闭「${d.collection_name}」？`,
    confirmText: '关闭链接',
    danger: true
  })
  if (!ok) return
  try {
    await closeDistribution(d.id)
    toast.success('已关闭')
    await load()
  } catch (e) {
    console.error('[合集分发] 关闭失败', e)
    toast.error(friendlyErrorMessage(e, '操作失败'))
  }
}

function openRegenerate(d: Distribution): void {
  regenerateTarget.value = d
  regenerateOpen.value = true
}

async function onRegenerated(): Promise<void> {
  await load()
}

onMounted(async () => {
  await load()
  if (route.query.new === '1') {
    const idsRaw = typeof route.query.videos === 'string' ? route.query.videos : ''
    const ids = idsRaw
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0)
    await loadPreselected(ids)
    dialogOpen.value = true
    router.replace({ name: 'distributions' })
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 页面级主操作；defer 确保布局已插入 document 后再解析目标 -->
    <Teleport defer to="#page-actions">
      <AppButton variant="primary" :disabled="!auth.canEdit" @click="openNew">
        <AppIcon name="plus" :size="16" />
        新建分发
      </AppButton>
    </Teleport>

    <!-- 列表区标题行 -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-[15px] font-semibold text-ad-text">分发列表</h2>
        <p class="text-[12px] text-ad-text-3 mt-0.5">
          共 {{ counts.all }} 条 · 有效中 {{ counts.active }} · 客户端凭链接查看，无需登录
        </p>
      </div>
      <div class="hidden md:block">
        <AppButton variant="primary" :disabled="!auth.canEdit" @click="openNew">
          <AppIcon name="plus" :size="16" />
          新建分发
        </AppButton>
      </div>
    </div>

    <!-- 筛选 Tab + 搜索（合集名 / 客户名，本页过滤） -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="ad-tab"
        :class="{ 'is-active': statusFilter === t.key }"
        @click="setTab(t.key)"
      >
        {{ t.label }}
        <span class="ad-tab__count">{{ tabCount(t.key) }}</span>
      </button>
      </div>
      <SearchInput v-model="keyword" placeholder="搜索合集名 / 客户" />
    </div>

    <p v-if="errorText" class="ad-field-error !mt-0">
      {{ errorText }}
      <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
    </p>

    <SkeletonTable v-if="loading" :rows="5" :cols="7" />

    <DataTable v-else :columns="columns" :rows="paged" min-width="1200px">
      <template #row="{ row }">
        <td class="ad-td">
          <span class="text-[14px] text-ad-text">{{ (row as Distribution).collection_name }}</span>
        </td>
        <td class="ad-td">
          <span class="text-ad-text-2">{{ (row as Distribution).customer_masked }}</span>
        </td>
        <td class="ad-td">{{ (row as Distribution).video_count }} 支</td>
        <td class="ad-td">{{ formatDateTime((row as Distribution).created_at) }}</td>
        <td class="ad-td">{{ distributionLimitText(row as Distribution) }}</td>
        <td class="ad-td">
          <StatusPill :kind="distributionStatusKind((row as Distribution).status)">
            {{ distributionStatusLabel((row as Distribution).status) }}
          </StatusPill>
        </td>
        <td class="ad-td">
          <span class="text-ad-text-2">{{ (row as Distribution).created_by_name ?? '—' }}</span>
        </td>
        <td class="ad-td !text-right">
          <div class="inline-flex items-center gap-1">
            <button class="ad-btn-text !h-8" @click="copyLink(row as Distribution)">复制链接</button>
            <button class="ad-btn-text !h-8" @click="preview(row as Distribution)">预览</button>
            <template v-if="(row as Distribution).status === 'active'">
              <button
                class="ad-btn-danger-text !h-8"
                :disabled="!auth.canEdit"
                @click="close(row as Distribution)"
              >
                关闭
              </button>
            </template>
            <template v-else-if="(row as Distribution).status === 'expired'">
              <button
                class="ad-btn-text !h-8"
                :disabled="!auth.canEdit"
                @click="openRegenerate(row as Distribution)"
              >
                重新生成
              </button>
            </template>
          </div>
        </td>
      </template>

      <!-- 移动端（<768）卡片 -->
      <template #mobileCard="{ row }">
        <div class="flex items-start justify-between gap-2">
          <p class="text-[14px] font-medium text-ad-text min-w-0 truncate">
            {{ (row as Distribution).collection_name }}
          </p>
          <StatusPill :kind="distributionStatusKind((row as Distribution).status)">
            {{ distributionStatusLabel((row as Distribution).status) }}
          </StatusPill>
        </div>
        <dl class="grid grid-cols-[64px_1fr] gap-y-1.5 mt-2.5 text-[12px]">
          <dt class="text-ad-text-4">客户</dt>
          <dd class="text-ad-text-2 min-w-0 break-words">{{ (row as Distribution).customer_masked }}</dd>
          <dt class="text-ad-text-4">支数</dt>
          <dd class="text-ad-text-2">{{ (row as Distribution).video_count }} 支</dd>
          <dt class="text-ad-text-4">生成人</dt>
          <dd class="text-ad-text-2">{{ (row as Distribution).created_by_name ?? '—' }}</dd>
          <dt class="text-ad-text-4">分发时间</dt>
          <dd class="text-ad-text-2">{{ formatDateTime((row as Distribution).created_at) }}</dd>
          <dt class="text-ad-text-4">限时</dt>
          <dd class="text-ad-text-2">{{ distributionLimitText(row as Distribution) }}</dd>
        </dl>
        <div class="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-ad-border">
          <button class="ad-btn-text !h-8" @click="copyLink(row as Distribution)">复制链接</button>
          <button class="ad-btn-text !h-8" @click="preview(row as Distribution)">预览</button>
          <template v-if="(row as Distribution).status === 'active'">
            <button
              class="ad-btn-danger-text !h-8"
              :disabled="!auth.canEdit"
              @click="close(row as Distribution)"
            >
              关闭
            </button>
          </template>
          <template v-else-if="(row as Distribution).status === 'expired'">
            <button
              class="ad-btn-text !h-8"
              :disabled="!auth.canEdit"
              @click="openRegenerate(row as Distribution)"
            >
              重新生成
            </button>
          </template>
        </div>
      </template>

      <template #empty>
        <EmptyState
          icon="share"
          title="还没有分发记录"
          hint="点击「新建分发」为客户生成限时链接"
        />
      </template>

      <template #footer>
        <AppPagination :total="filtered.length" :page="page" :size="PAGE_SIZE" @update:page="onPageChange" />
      </template>
    </DataTable>

    <p class="text-[12px] text-ad-text-3 leading-5 px-1">
      客户端凭链接直接查看，无需登录；链接到期或手动关闭后立即失效，客户会看到「链接已失效」提示，可随时「重新生成」获得新的有效期。
    </p>

    <NewDistributionDialog v-model="dialogOpen" :preselected="preselected" @created="onCreated" />
    <RegenerateDialog v-model="regenerateOpen" :distribution="regenerateTarget" @regenerated="onRegenerated" />
  </div>
</template>
