<script setup lang="ts">
/** 二次确认弹框宿主（配合 ui store 的 askConfirm Promise） */
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'

const ui = useUiStore()
const { confirm } = storeToRefs(ui)
</script>

<template>
  <AppModal
    :model-value="confirm.open"
    :title="confirm.title"
    :width="400"
    :z-index="2000"
    :body-padding="false"
    @update:model-value="ui.answerConfirm(false)"
  >
    <p v-if="confirm.text" class="text-[13px] text-ad-text-2 leading-6 px-6 pb-1">{{ confirm.text }}</p>
    <template #footer>
      <AppButton variant="secondary" @click="ui.answerConfirm(false)">{{ confirm.cancelText }}</AppButton>
      <AppButton
        :variant="confirm.danger ? 'danger-text' : 'primary'"
        @click="ui.answerConfirm(true)"
      >
        {{ confirm.confirmText }}
      </AppButton>
    </template>
  </AppModal>
</template>
