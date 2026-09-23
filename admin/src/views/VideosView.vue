<script setup lang="ts">
/** 视频库（§5.2 / §5.3，R25）：筛选 + 分页 + 未分类 + BV 解析/上传 + 状态切换 + 批量生成合集 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteVideo, listVideos, updateVideo } from '@/api/videos'
import { assetUrl } from '@/utils/asset'
import { formatDate } from '@/utils/format'
import { categoryLabel, videoStatusKind, videoStatusLabel } from '@/utils/labels'
import { CATEGORIES, CATEGORY_NONE, PAGE_SIZE } from '@/utils/constants'
import { friendlyErrorMessage } from '@/utils/errors'
import { usePageHeader } from '@/composables/usePageHeader'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { Video, VideoStatus } from '@/types/models'
import AppButton from '@/components/AppButton.vue'
import SearchInput from '@/components/SearchInput.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppSelect from '@/components/AppSelect.vue'
import DataTable from '@/components/DataTable.vue'
import type { TableColumn } from '@/types/ui'
import AppPagination from '@/components/AppPagination.vue'
import StatusPill from '@/components/StatusPill.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonTable from '@/components/SkeletonTable.vue'
import VideoFormDialog from '@/components/VideoFormDialog.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const { confirm } = useConfirm()

const items = ref<Video[]>([])
const total = ref(0)
const counts = ref({ total: 0, published: 0, draft: 0 })
const loading = ref(true)
const errorText = ref('')
const page = ref(1)

const categoryFilter = ref('')
const statusFilter = ref('')
const keyword = ref('')
const sortFilter = ref<'latest' | 'earliest'>('latest')

const selected = ref<Map<number, Video>>(new Map())
const dialogOpen = ref(false)
const editing = ref<Video | null>(null)

usePageHeader(
  '视频库',
  computed(() => `共 ${counts.value.total} 支 · 已发布 ${counts.value.published} · 草稿 ${counts.value.draft}`)
)

const columns: TableColumn[] = [
  { key: 'check', label: '', width: '44px' },
  { key: 'video', label: '视频' },
  { key: 'category', label: '分类', width: '120px' },
  { key: 'status', label: '状态', width: '110px' },
  { key: 'actions', label: '操作', width: '130px', align: 'right' }
]

const categoryOptions = [
  { value: '', label: '全部分类' },
  { value: CATEGORY_NONE, label: '未分类' },
  ...CATEGORIES.map((c) => ({ value: c.key, label: c.label }))
]
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' }
]
const sortOptions = [
  { value: 'latest', label: '最新上传' },
  { value: 'earliest', label: '最早上传' }
]

/** 当前页展示顺序（后端无排序参数，仅在前端对当前页重排） */
const displayItems = computed(() => {
  const list = [...items.value]
  list.sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    return sortFilter.value === 'latest' ? tb - ta : ta - tb
  })
  return list
})

const allChecked = computed(
  () => displayItems.value.length > 0 && displayItems.value.every((v) => selected.value.has(v.id))
)

/**
 * 页眉统计：分别请求「全部 / 已发布 / 草稿」的总数（size=1 取 total），
 * 而非拉取全量列表再前端计数——既符合接口契约（size ≤ 100），也不受分页上限影响。
 */
async function loadCounts(): Promise<void> {
  try {
    const [all, published, draft] = await Promise.all([
      listVideos({ page: 1, size: 1 }),
      listVideos({ page: 1, size: 1, status: 'published' }),
      listVideos({ page: 1, size: 1, status: 'draft' })
    ])
    counts.value = { total: all.total, published: published.total, draft: draft.total }
  } catch (e) {
    // 统计失败不阻断列表渲染，但需留痕，避免静默吞错
    console.error('[视频库] 加载页眉统计失败', e)
  }
}

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await listVideos({
      page: page.value,
      size: PAGE_SIZE,
      category_id: categoryFilter.value || undefined,
      status: statusFilter.value || undefined,
      keyword: keyword.value.trim() || undefined
    })
    items.value = res.items
    total.value = res.total
  } catch (e) {
    console.error('[视频库] 加载列表失败', e)
    errorText.value = friendlyErrorMessage(e)
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function refresh(): Promise<void> {
  selected.value = new Map()
  await Promise.all([load(), loadCounts()])
}

watch([categoryFilter, statusFilter, keyword], () => {
  page.value = 1
  void load()
})

function onPageChange(p: number): void {
  page.value = p
  void load()
}

function toggle(video: Video): void {
  const map = selected.value
  if (map.has(video.id)) map.delete(video.id)
  else map.set(video.id, video)
  selected.value = new Map(map)
}

function toggleAll(): void {
  if (allChecked.value) {
    selected.value = new Map()
  } else {
    const map = new Map<number, Video>()
    for (const v of displayItems.value) map.set(v.id, v)
    selected.value = map
  }
}

function openCreate(): void {
  editing.value = null
  dialogOpen.value = true
}
function openEdit(video: Video): void {
  editing.value = video
  dialogOpen.value = true
}

async function toggleStatus(video: Video): Promise<void> {
  if (!auth.canEdit) return
  const next: VideoStatus = video.status === 'published' ? 'draft' : 'published'
  try {
    await updateVideo(video.id, { status: next })
    video.status = next
    toast.success(next === 'published' ? '已发布' : '已转为草稿')
    await loadCounts()
  } catch (e) {
    console.error('[视频库] 切换状态失败', e)
    toast.error(friendlyErrorMessage(e, '操作失败'))
  }
}

async function remove(video: Video): Promise<void> {
  const ok = await confirm({
    title: '删除视频',
    text: `确定删除「${video.title}」？该操作不可撤销。`,
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  try {
    await deleteVideo(video.id)
    toast.success('已删除')
    await refresh()
  } catch (e) {
    console.error('[视频库] 删除失败', e)
    toast.error(friendlyErrorMessage(e, '删除失败'))
  }
}

function generateCollection(): void {
  const ids = [...selected.value.keys()]
  if (!ids.length) return
  router.push({ name: 'distributions', query: { new: '1', videos: ids.join(',') } })
}

onMounted(async () => {
  await refresh()
  if (route.query.new === '1') {
    openCreate()
    router.replace({ name: 'videos' })
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 页面级主操作（顶栏右侧）；defer 确保布局已插入 document 后再解析目标 -->
    <Teleport defer to="#page-actions">
      <AppButton
        variant="primary"
        :disabled="!auth.canEdit"
        :title="auth.canEdit ? '新增视频' : '当前角色为只读，无法新增'"
        @click="openCreate"
      >
        <AppIcon name="plus" :size="16" />
        新增视频
      </AppButton>
    </Teleport>

    <p v-if="!auth.canEdit" class="ad-hint !mt-0">当前角色为只读，仅可查看视频库</p>

    <!-- 筛选行（含关键词搜索：后端按 标题/BV 号 匹配） -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <SearchInput v-model="keyword" placeholder="搜索标题 / BV 号" :width="undefined" class="!w-full" />
      <AppSelect v-model="categoryFilter" placeholder="" :options="categoryOptions" />
      <AppSelect v-model="statusFilter" placeholder="" :options="statusOptions" />
      <AppSelect v-model="sortFilter" placeholder="" :options="sortOptions" />
    </div>

    <p v-if="errorText" class="ad-field-error !mt-0">
      {{ errorText }}
      <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
    </p>

    <!-- 选中操作条 -->
    <div
      v-if="selected.size > 0"
      class="flex items-center justify-between gap-3 rounded-card bg-accent-soft px-4 py-3"
    >
      <p class="text-[13px] text-[#0A5BB5]">
        已选 <b>{{ selected.size }}</b> 支视频 · 可生成临时合集发给客户
      </p>
      <AppButton variant="primary" size="sm" :disabled="!auth.canEdit" @click="generateCollection">
        生成临时合集
      </AppButton>
    </div>

    <SkeletonTable v-if="loading" :rows="6" :cols="5" />

    <DataTable v-else :columns="columns" :rows="displayItems" min-width="820px">
      <template #row="{ row }">
        <td class="ad-td">
          <button
            type="button"
            class="w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors"
            :class="
              selected.has((row as Video).id)
                ? 'bg-accent border-accent text-white'
                : 'border-ad-border-control bg-white'
            "
            :aria-label="selected.has((row as Video).id) ? '取消选择' : '选择'"
            @click="toggle(row as Video)"
          >
            <AppIcon
              v-if="selected.has((row as Video).id)"
              name="check"
              :size="12"
              :stroke-width="3"
            />
          </button>
        </td>
        <td class="ad-td">
          <div class="flex items-center gap-3">
            <img
              :src="assetUrl((row as Video).cover_url)"
              alt=""
              class="w-[72px] h-[40px] rounded-[6px] object-cover bg-ad-fill shrink-0"
            />
            <div class="min-w-0">
              <p class="text-[14px] text-ad-text truncate">{{ (row as Video).title }}</p>
              <p class="text-[12px] text-ad-text-4 mt-0.5 truncate">
                {{ (row as Video).bv_id }} · {{ (row as Video).created_by_name ?? '—' }} ·
                {{ formatDate((row as Video).created_at) }}
              </p>
            </div>
          </div>
        </td>
        <td class="ad-td">
          <span :class="(row as Video).category_id ? 'text-ad-text-2' : 'text-ad-text-4'">
            {{ categoryLabel((row as Video).category_id) }}
          </span>
        </td>
        <td class="ad-td">
          <button
            type="button"
            :disabled="!auth.canEdit"
            :title="auth.canEdit ? '点击切换状态' : '当前角色为只读'"
            class="transition-opacity"
            :class="auth.canEdit ? 'hover:opacity-80' : 'cursor-default'"
            @click="toggleStatus(row as Video)"
          >
            <StatusPill :kind="videoStatusKind((row as Video).status)">
              {{ videoStatusLabel((row as Video).status) }}
            </StatusPill>
          </button>
        </td>
        <td class="ad-td !text-right">
          <div class="inline-flex items-center gap-1">
            <button
              class="ad-btn-text !h-8"
              :disabled="!auth.canEdit"
              :title="auth.canEdit ? '编辑' : '当前角色为只读'"
              @click="openEdit(row as Video)"
            >
              编辑
            </button>
            <button
              class="ad-btn-danger-text !h-8"
              :disabled="!auth.canEdit"
              :title="auth.canEdit ? '删除' : '当前角色为只读'"
              @click="remove(row as Video)"
            >
              删除
            </button>
          </div>
        </td>
      </template>

      <!-- 移动端（<768）卡片 -->
      <template #mobileCard="{ row }">
        <div class="flex gap-3">
          <img
            :src="assetUrl((row as Video).cover_url)"
            alt=""
            class="w-[96px] h-[54px] rounded-[6px] object-cover bg-ad-fill shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="text-[14px] text-ad-text truncate">{{ (row as Video).title }}</p>
            <p class="text-[12px] text-ad-text-4 mt-1 truncate">
              {{ (row as Video).bv_id }} · {{ (row as Video).created_by_name ?? '—' }}
            </p>
            <p class="text-[12px] text-ad-text-4 mt-0.5">
              {{ formatDate((row as Video).created_at) }}
            </p>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <StatusPill :kind="videoStatusKind((row as Video).status)">
                {{ videoStatusLabel((row as Video).status) }}
              </StatusPill>
              <span class="ad-tag">{{ categoryLabel((row as Video).category_id) }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-ad-border">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-[12px]"
            :class="selected.has((row as Video).id) ? 'text-accent' : 'text-ad-text-3'"
            @click="toggle(row as Video)"
          >
            <span
              class="w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors"
              :class="
                selected.has((row as Video).id)
                  ? 'bg-accent border-accent text-white'
                  : 'border-ad-border-control bg-white'
              "
            >
              <AppIcon
                v-if="selected.has((row as Video).id)"
                name="check"
                :size="12"
                :stroke-width="3"
              />
            </span>
            选择
          </button>
          <span class="flex-1" />
          <button
            class="ad-btn-text !h-8"
            :disabled="!auth.canEdit"
            :title="auth.canEdit ? '编辑' : '当前角色为只读'"
            @click="openEdit(row as Video)"
          >
            编辑
          </button>
          <button
            class="ad-btn-danger-text !h-8"
            :disabled="!auth.canEdit"
            :title="auth.canEdit ? '删除' : '当前角色为只读'"
            @click="remove(row as Video)"
          >
            删除
          </button>
        </div>
      </template>

      <template #empty>
        <EmptyState icon="video" title="还没有视频" hint="点击右上角新增" />
      </template>

      <template #footer>
        <AppPagination :total="total" :page="page" :size="PAGE_SIZE" @update:page="onPageChange" />
      </template>
    </DataTable>

    <VideoFormDialog v-model="dialogOpen" :video="editing" @saved="refresh" />
  </div>
</template>
