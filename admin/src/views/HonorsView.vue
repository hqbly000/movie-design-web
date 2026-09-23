<script setup lang="ts">
/** 荣誉条目（§5.7，R7）：列顺序固定 标题/详情描述/颁奖机构/等级；最多 6 条 */
import { computed, onMounted, ref } from 'vue'
import { ApiError } from '@/api/request'
import { deleteHonor, listHonors } from '@/api/honors'
import { ErrorCode } from '@/types/api'
import { MAX_HONORS } from '@/utils/constants'
import { friendlyErrorMessage } from '@/utils/errors'
import { usePageHeader } from '@/composables/usePageHeader'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { Honor } from '@/types/models'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import PageHint from '@/components/PageHint.vue'
import DataTable from '@/components/DataTable.vue'
import type { TableColumn } from '@/types/ui'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonTable from '@/components/SkeletonTable.vue'
import HonorFormDialog from '@/components/HonorFormDialog.vue'

const toast = useToastStore()
const auth = useAuthStore()
const { confirm } = useConfirm()

const honors = ref<Honor[]>([])
const loading = ref(true)
const errorText = ref('')
const dialogOpen = ref(false)
const editing = ref<Honor | null>(null)

usePageHeader(
  '荣誉条目',
  computed(() => `当前 ${honors.value.length} 条 · 展厅环形可容纳 ${MAX_HONORS} 条`)
)

const atLimit = computed(() => honors.value.length >= MAX_HONORS)
const columns: TableColumn[] = [
  { key: 'title', label: '标题', width: '220px' },
  { key: 'description', label: '详情描述' },
  { key: 'issuer', label: '颁奖机构', width: '230px' },
  { key: 'level', label: '等级', width: '110px' },
  { key: 'actions', label: '操作', width: '120px', align: 'right' }
]

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await listHonors()
    honors.value = res.slice().sort((a, b) => a.sort - b.sort)
  } catch (e) {
    console.error('[荣誉条目] 加载失败', e)
    errorText.value = friendlyErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  if (!auth.canEdit) return
  if (atLimit.value) {
    toast.error('展厅仅展示 6 条，请先删除或调整')
    return
  }
  editing.value = null
  dialogOpen.value = true
}

function openEdit(h: Honor): void {
  editing.value = h
  dialogOpen.value = true
}

async function remove(h: Honor): Promise<void> {
  const ok = await confirm({
    title: '删除荣誉',
    text: `确定删除「${h.title}」？`,
    confirmText: '删除',
    danger: true
  })
  if (!ok) return
  try {
    await deleteHonor(h.id)
    toast.success('已删除')
    await load()
  } catch (e) {
    console.error('[荣誉条目] 删除失败', e)
    if (e instanceof ApiError && e.code === ErrorCode.HONOR_LIMIT) toast.error(e.message)
    else toast.error(friendlyErrorMessage(e, '删除失败'))
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4">
    <Teleport defer to="#page-actions">
      <AppButton
        variant="primary"
        :disabled="!auth.canEdit || atLimit"
        :title="!auth.canEdit ? '当前角色为只读' : atLimit ? '展厅仅展示 6 条，请先删除或调整' : '新增荣誉'"
        @click="openCreate"
      >
        <AppIcon name="plus" :size="16" />
        新增荣誉
      </AppButton>
    </Teleport>

    <p v-if="!auth.canEdit" class="ad-hint !mt-0">当前角色为只读，无法编辑荣誉</p>

    <PageHint text="展厅为环形陈列，最多展示 6 条；同一时刻只高亮当前一条（按年份倒序自动旋转）" />

    <p v-if="atLimit" class="ad-field-error !mt-0">展厅仅展示 6 条，请先删除或调整</p>

    <p v-if="errorText" class="ad-field-error !mt-0">
      {{ errorText }}
      <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
    </p>

    <SkeletonTable v-if="loading" :rows="4" :cols="5" />

    <DataTable v-else :columns="columns" :rows="honors" min-width="900px">
      <template #row="{ row }">
        <td class="ad-td">
          <span class="text-[14px] text-ad-text">{{ (row as Honor).title }}</span>
        </td>
        <td class="ad-td">
          <span class="text-ad-text-3">{{ (row as Honor).description || '—' }}</span>
        </td>
        <td class="ad-td">{{ (row as Honor).issuer }}</td>
        <td class="ad-td"><span class="ad-tag">{{ (row as Honor).level }}</span></td>
        <td class="ad-td !text-right">
          <div class="inline-flex items-center gap-1">
            <button
              class="ad-btn-text !h-8"
              :disabled="!auth.canEdit"
              :title="auth.canEdit ? '编辑' : '当前角色为只读'"
              @click="openEdit(row as Honor)"
            >
              编辑
            </button>
            <button
              class="ad-btn-danger-text !h-8"
              :disabled="!auth.canEdit"
              @click="remove(row as Honor)"
            >
              删除
            </button>
          </div>
        </td>
      </template>

      <!-- 移动端（<768）卡片 -->
      <template #mobileCard="{ row }">
        <div class="flex items-start justify-between gap-2">
          <p class="text-[14px] text-ad-text min-w-0">{{ (row as Honor).title }}</p>
          <span class="ad-tag shrink-0">{{ (row as Honor).level }}</span>
        </div>
        <p class="text-[12px] text-ad-text-3 mt-1.5 break-words">{{ (row as Honor).description || '—' }}</p>
        <p class="text-[12px] text-ad-text-4 mt-1.5">{{ (row as Honor).issuer }}</p>
        <div class="flex items-center gap-3 mt-3 pt-3 border-t border-ad-border">
          <button
            class="ad-btn-text !h-8"
            :disabled="!auth.canEdit"
            :title="auth.canEdit ? '编辑' : '当前角色为只读'"
            @click="openEdit(row as Honor)"
          >
            编辑
          </button>
          <button class="ad-btn-danger-text !h-8" :disabled="!auth.canEdit" @click="remove(row as Honor)">
            删除
          </button>
        </div>
      </template>

      <template #empty>
        <EmptyState icon="honor" title="还没有荣誉条目" hint="点击右上角新增，最多 6 条" />
      </template>
    </DataTable>

    <HonorFormDialog v-model="dialogOpen" :honor="editing" @saved="load" />
  </div>
</template>
