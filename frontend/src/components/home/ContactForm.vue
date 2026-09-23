<script setup lang="ts">
/**
 * ContactForm —— 预约表单卡（R11 / §2.7 / §7.4）。
 * 象牙白实心提交按钮；行内红字校验提示（不弹全局错误）；成功后卡内替换成功态。
 */
import { computed, reactive, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import { submitLead } from '@/api/public'

const form = reactive({
  name: '',
  phone: '',
  demandNote: ''
})

const errors = reactive({
  name: '',
  phone: '',
  demandNote: ''
})

const submitting = ref(false)
const submitted = ref(false)
const serverError = ref('')

const MOBILE_RE = /^1[3-9]\d{9}$/
const TEL_RE = /^0\d{2,3}-?\d{7,8}$/

const noteCount = computed(() => form.demandNote.length)

function validateName(): boolean {
  const value = form.name.trim()
  if (!value) {
    errors.name = '请填写您的姓名'
    return false
  }
  if (value.length > 20) {
    errors.name = '姓名不超过 20 字'
    return false
  }
  errors.name = ''
  return true
}

function validatePhone(): boolean {
  const value = form.phone.trim()
  if (!value) {
    errors.phone = '请填写联系电话'
    return false
  }
  if (!MOBILE_RE.test(value) && !TEL_RE.test(value)) {
    errors.phone = '请填写正确的 11 位手机号或含区号固话'
    return false
  }
  errors.phone = ''
  return true
}

function validateNote(): boolean {
  if (form.demandNote.length > 200) {
    errors.demandNote = '拍摄需求不超过 200 字'
    return false
  }
  errors.demandNote = ''
  return true
}

function validateAll(): boolean {
  const nameOk = validateName()
  const phoneOk = validatePhone()
  const noteOk = validateNote()
  return nameOk && phoneOk && noteOk
}

async function handleSubmit(): Promise<void> {
  serverError.value = ''
  if (!validateAll()) return

  submitting.value = true
  try {
    await submitLead({
      name: form.name.trim(),
      phone: form.phone.trim(),
      demand_note: form.demandNote.trim() || undefined
    })
    submitted.value = true
  } catch (err) {
    serverError.value = err instanceof Error ? err.message : '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

/** 再填一份：重置表单与状态。 */
function resetForm(): void {
  form.name = ''
  form.phone = ''
  form.demandNote = ''
  errors.name = ''
  errors.phone = ''
  errors.demandNote = ''
  serverError.value = ''
  submitted.value = false
}
</script>

<template>
  <div
    class="w-full rounded-[2px] border border-white/[0.16] bg-surface p-6 lg:w-[520px] lg:p-8"
  >
    <!-- 成功态 -->
    <div
      v-if="submitted"
      class="flex flex-col items-center justify-center gap-4 py-14 text-center"
    >
      <p class="font-serif text-[22px] text-txt-primary">已收到，我们会尽快联系您</p>
      <button
        type="button"
        class="font-sans text-[13px] text-accent-gold underline-offset-4 transition-colors hover:text-accent-gold-light hover:underline"
        @click="resetForm"
      >
        再填一份
      </button>
    </div>

    <!-- 表单态 -->
    <form v-else novalidate class="flex flex-col gap-5" @submit.prevent="handleSubmit">
      <h3 class="font-serif text-[24px] text-txt-primary">预约拍摄</h3>

      <!-- 姓名 -->
      <div>
        <label for="lead-name" class="mb-2 block font-sans text-[13px] text-white/85">
          姓名 <span class="text-accent-orange">*</span>
        </label>
        <input
          id="lead-name"
          v-model="form.name"
          type="text"
          maxlength="20"
          class="h-[52px] w-full rounded-[2px] border bg-surface-input px-4 font-sans text-[15px] text-txt-primary outline-none transition-colors placeholder:text-white/60 focus:border-accent-gold/70"
          :class="errors.name ? 'border-red-400/70' : 'border-white/[0.24]'"
          placeholder="您的称呼"
          autocomplete="name"
          @blur="validateName"
        />
        <p v-if="errors.name" class="mt-2 font-sans text-[12px] text-red-400">
          {{ errors.name }}
        </p>
      </div>

      <!-- 联系电话 -->
      <div>
        <label for="lead-phone" class="mb-2 block font-sans text-[13px] text-white/85">
          联系电话 <span class="text-accent-orange">*</span>
        </label>
        <input
          id="lead-phone"
          v-model="form.phone"
          type="tel"
          maxlength="32"
          class="h-[52px] w-full rounded-[2px] border bg-surface-input px-4 font-sans text-[15px] text-txt-primary outline-none transition-colors placeholder:text-white/60 focus:border-accent-gold/70"
          :class="errors.phone ? 'border-red-400/70' : 'border-white/[0.24]'"
          placeholder="11 位手机号或含区号固话"
          autocomplete="tel"
          @blur="validatePhone"
        />
        <p v-if="errors.phone" class="mt-2 font-sans text-[12px] text-red-400">
          {{ errors.phone }}
        </p>
      </div>

      <!-- 拍摄需求 -->
      <div>
        <label for="lead-note" class="mb-2 block font-sans text-[13px] text-white/85">
          拍摄需求
        </label>
        <textarea
          id="lead-note"
          v-model="form.demandNote"
          maxlength="200"
          class="h-[120px] w-full resize-none rounded-[2px] border bg-surface-input px-4 py-3 font-sans text-[15px] leading-6 text-txt-primary outline-none transition-colors placeholder:text-white/60 focus:border-accent-gold/70"
          :class="errors.demandNote ? 'border-red-400/70' : 'border-white/[0.24]'"
          placeholder="想拍摄的类型、时间与地点（选填）"
          @blur="validateNote"
        />
        <div class="mt-2 flex items-center justify-between">
          <p v-if="errors.demandNote" class="font-sans text-[12px] text-red-400">
            {{ errors.demandNote }}
          </p>
          <span class="ml-auto font-latin text-[11px] text-white/40">{{ noteCount }} / 200</span>
        </div>
      </div>

      <AppButton variant="ivory" native-type="submit" block :disabled="submitting">
        {{ submitting ? '提交中…' : '提交预约' }}
      </AppButton>

      <p v-if="serverError" class="font-sans text-[12px] text-red-400">{{ serverError }}</p>
    </form>
  </div>
</template>
