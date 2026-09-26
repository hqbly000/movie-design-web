<script setup lang="ts">
/** 账号与权限（§5.9，R20）：仅 admin 可见可进；成员表 + 角色说明卡 */
import { computed, onMounted, ref } from 'vue'
import { listMembers } from '@/api/members'
import SearchInput from '@/components/SearchInput.vue'
import { formatDateTime } from '@/utils/format'
import { ROLE_LABELS } from '@/utils/constants'
import { friendlyErrorMessage } from '@/utils/errors'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { Member } from '@/types/models'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import DataTable from '@/components/DataTable.vue'
import type { TableColumn } from '@/types/ui'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonTable from '@/components/SkeletonTable.vue'
import MemberFormDialog from '@/components/MemberFormDialog.vue'

const toast = useToastStore()
const auth = useAuthStore()

const members = ref<Member[]>([])
const keyword = ref('')

/** 前端过滤：姓名 / 邮箱（成员量小，不做后端搜索） */
const filteredMembers = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return members.value
  return members.value.filter(
    (m) => `${m.name} ${m.email}`.toLowerCase().includes(kw)
  )
})
const loading = ref(true)
const errorText = ref('')
const dialogOpen = ref(false)
const editing = ref<Member | null>(null)

usePageHeader(
  '账号与权限',
  computed(() => `内部成员 ${members.value.length} 人 · 操作会记录到对应账号`)
)

const columns: TableColumn[] = [
  { key: 'member', label: '成员', width: '200px' },
  { key: 'email', label: '登录账号' },
  { key: 'role', label: '角色', width: '120px' },
  { key: 'lastLogin', label: '最近登录', width: '170px' },
  { key: 'actions', label: '操作', width: '100px', align: 'right' }
]

const roleLegend = [
  { role: '管理员', text: '全部权限：内容维护、生成分享链接、管理成员与角色' },
  { role: '编辑', text: '维护视频/图集/首屏/板块/荣誉、生成分享链接；不能改成员与权限' },
  { role: '只读', text: '仅查看内容与预约留言，不能修改' }
]

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    members.value = await listMembers()
  } catch (e) {
    console.error('[账号与权限] 加载失败', e)
    errorText.value = friendlyErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function openInvite(): void {
  editing.value = null
  dialogOpen.value = true
}
function openEdit(m: Member): void {
  editing.value = m
  dialogOpen.value = true
}

function initials(name: string): string {
  return name ? name.slice(0, 1) : '交'
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role
}

onMounted(() => {
  if (auth.isAdmin) void load()
  else loading.value = false
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <Teleport defer to="#page-actions">
      <AppButton variant="primary" v-if="auth.isAdmin" @click="openInvite">
        <AppIcon name="plus" :size="16" />
        邀请成员
      </AppButton>
    </Teleport>

    <div v-if="!auth.isAdmin" class="ad-card p-6">
      <p class="text-[14px] text-ad-text-2">仅管理员可访问「账号与权限」。</p>
    </div>

    <template v-else>
      <!-- 成员搜索（姓名 / 邮箱，本页过滤） -->
      <SearchInput v-model="keyword" placeholder="搜索姓名 / 邮箱" />

      <!-- 角色说明卡 -->
      <div class="ad-card p-5">
        <h2 class="text-[14px] font-medium text-ad-text mb-1">角色说明</h2>
        <div class="flex flex-col">
          <div v-for="row in roleLegend" :key="row.role" class="ad-legend-row">
            <span class="w-16 shrink-0 font-medium text-ad-text">{{ row.role }}</span>
            <span class="flex-1">{{ row.text }}</span>
          </div>
        </div>
      </div>

      <p v-if="errorText" class="ad-field-error !mt-0">
        {{ errorText }}
        <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
      </p>

      <SkeletonTable v-if="loading" :rows="3" :cols="5" />

      <DataTable v-else :columns="columns" :rows="filteredMembers" min-width="820px">
        <template #row="{ row }">
          <td class="ad-td">
            <div class="flex items-center gap-2.5">
              <span class="ad-avatar">{{ initials((row as Member).name) }}</span>
              <span class="text-[14px] text-ad-text">{{ (row as Member).name }}</span>
            </div>
          </td>
          <td class="ad-td">{{ (row as Member).email }}</td>
          <td class="ad-td"><span class="ad-tag">{{ roleLabel((row as Member).role) }}</span></td>
          <td class="ad-td">
            <span :class="(row as Member).last_login_at ? 'text-ad-text-2' : 'text-ad-text-4'">
              {{ (row as Member).last_login_at ? formatDateTime((row as Member).last_login_at) : '从未登录' }}
            </span>
          </td>
          <td class="ad-td !text-right">
            <button class="ad-btn-text !h-8" @click="openEdit(row as Member)">编辑</button>
          </td>
        </template>

        <!-- 移动端（<768）卡片 -->
        <template #mobileCard="{ row }">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="ad-avatar">{{ initials((row as Member).name) }}</span>
              <span class="text-[14px] text-ad-text truncate">{{ (row as Member).name }}</span>
            </div>
            <span class="ad-tag shrink-0">{{ roleLabel((row as Member).role) }}</span>
          </div>
          <dl class="grid grid-cols-[64px_1fr] gap-y-1.5 mt-2.5 text-[12px]">
            <dt class="text-ad-text-4">登录账号</dt>
            <dd class="text-ad-text-2 min-w-0 break-all">{{ (row as Member).email }}</dd>
            <dt class="text-ad-text-4">最近登录</dt>
            <dd :class="(row as Member).last_login_at ? 'text-ad-text-2' : 'text-ad-text-4'">
              {{ (row as Member).last_login_at ? formatDateTime((row as Member).last_login_at) : '从未登录' }}
            </dd>
          </dl>
          <div class="flex items-center gap-3 mt-3 pt-3 border-t border-ad-border">
            <button class="ad-btn-text !h-8" @click="openEdit(row as Member)">编辑</button>
          </div>
        </template>

        <template #empty>
          <EmptyState icon="member" title="暂无成员" hint="点击右上角邀请成员" />
        </template>
      </DataTable>
    </template>

    <MemberFormDialog v-model="dialogOpen" :member="editing" @saved="load" />
  </div>
</template>
