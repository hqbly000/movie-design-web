<script setup lang="ts">
/** 留言详情弹层（§5.8）：查看用抽屉/详情弹层 */
import { formatDateTime } from '@/utils/format'
import { leadStatusKind, leadStatusLabel } from '@/utils/labels'
import type { Lead } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import StatusPill from './StatusPill.vue'

const props = defineProps<{ modelValue: boolean; lead: Lead | null; canReply: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'reply', lead: Lead): void
}>()

const rows: { label: string; key: keyof Lead }[] = [
  { label: '客户姓名', key: 'name' },
  { label: '联系电话', key: 'phone' },
  { label: '拍摄需求', key: 'demand_type' },
  { label: '期望日期', key: 'demand_date' },
  { label: '备注', key: 'demand_note' },
  { label: '提交时间', key: 'created_at' }
]
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="留言详情"
    :width="520"
    mobile-fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="lead" class="flex flex-col">
      <div class="flex items-center justify-between pb-3 border-b border-ad-border">
        <span class="text-[15px] font-medium text-ad-text">{{ lead.name }}</span>
        <StatusPill :kind="leadStatusKind(lead.status)">{{ leadStatusLabel(lead.status) }}</StatusPill>
      </div>
      <dl class="flex flex-col">
        <div
          v-for="r in rows"
          :key="r.key"
          class="flex items-start gap-4 py-3 border-b border-ad-border last:border-b-0"
        >
          <dt class="w-20 shrink-0 text-[13px] text-ad-text-3">{{ r.label }}</dt>
          <dd class="text-[13px] text-ad-text leading-6 break-words min-w-0">
            <template v-if="r.key === 'created_at'">{{ formatDateTime(lead.created_at) }}</template>
            <template v-else>{{ (lead[r.key] as string) || '—' }}</template>
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <span />
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="emit('update:modelValue', false)">关闭</AppButton>
        <AppButton
          v-if="lead && lead.status === 'unread'"
          variant="primary"
          :disabled="!canReply"
          :title="canReply ? '标记已回复' : '当前角色为只读'"
          @click="emit('reply', lead)"
        >
          标记已回复
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
