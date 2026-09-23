<script setup lang="ts">
/** 公司介绍（§2.3）：展示年限自动计算为只读派生值，不落库、不可编辑（R5） */
import { computed, onMounted, reactive, ref } from 'vue'
import { getCompanyProfile, saveCompanyProfile } from '@/api/site'
import { displayYears } from '@/utils/format'
import { friendlyErrorMessage } from '@/utils/errors'
import { usePageHeader } from '@/composables/usePageHeader'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import AppInput from '@/components/AppInput.vue'
import AppSelect from '@/components/AppSelect.vue'
import AppTextarea from '@/components/AppTextarea.vue'

const toast = useToastStore()
const auth = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const errorText = ref('')
const formError = ref('')

const form = reactive({
  sectionTitle: '公司介绍',
  companyName: '',
  foundedYear: '2017',
  introText: ''
})

usePageHeader('公司介绍', '维护官网「关于我们」区块的标题、公司全称与正文')

const yearOptions = computed(() => {
  const now = new Date().getFullYear()
  const list: { value: number; label: string }[] = []
  for (let y = now; y >= 1990; y--) list.push({ value: y, label: `${y} 年` })
  return list
})

const derivedYears = computed(() => displayYears(Number(form.foundedYear) || null))

async function load(): Promise<void> {
  loading.value = true
  errorText.value = ''
  try {
    const res = await getCompanyProfile()
    form.sectionTitle = res.section_title || '公司介绍'
    form.companyName = res.company_name
    form.foundedYear = String(res.founded_year)
    form.introText = res.intro_text ?? ''
  } catch (e) {
    console.error('[公司介绍] 加载失败', e)
    errorText.value = friendlyErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!auth.canEdit) return
  formError.value = ''
  if (!form.companyName.trim()) {
    formError.value = '请填写公司名称'
    return
  }
  if (!form.foundedYear) {
    formError.value = '请选择成立年份'
    return
  }
  saving.value = true
  try {
    await saveCompanyProfile({
      section_title: form.sectionTitle.trim() || '公司介绍',
      company_name: form.companyName.trim(),
      founded_year: Number(form.foundedYear),
      intro_text: form.introText.trim() || null
    })
    toast.success('已保存，前台下一次访问即生效')
  } catch (e) {
    console.error('[公司介绍] 保存失败', e)
    formError.value = friendlyErrorMessage(e, '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4">
    <Teleport defer to="#page-actions">
      <AppButton variant="primary" :loading="saving" :disabled="!auth.canEdit" @click="save">
        保存修改
      </AppButton>
    </Teleport>

    <p v-if="!auth.canEdit" class="ad-hint !mt-0">当前角色为只读，无法保存修改</p>

    <p v-if="errorText" class="ad-field-error !mt-0">
      {{ errorText }}
      <button class="ad-btn-text !h-auto !px-1" @click="load">重试</button>
    </p>

    <div v-if="loading" class="ad-card p-6 flex flex-col gap-4">
      <div v-for="i in 4" :key="i" class="ad-skeleton h-10 rounded-ctrl" />
    </div>

    <div v-else class="ad-card p-5 md:p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppInput v-model="form.sectionTitle" label="区块标题" :maxlength="16" :disabled="!auth.canEdit" />
        <AppInput v-model="form.companyName" label="公司全称" required :maxlength="32" :disabled="!auth.canEdit" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <AppSelect
          v-model="form.foundedYear"
          label="成立年份"
          required
          placeholder=""
          :options="yearOptions"
          :disabled="!auth.canEdit"
        />
        <div>
          <label class="ad-label">当前展示年限</label>
          <div class="ad-input flex items-center !cursor-default text-ad-text-3">
            {{ derivedYears }} 年
            <span class="ml-2 text-[11px] text-ad-text-4">（自动计算，不落库）</span>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <AppTextarea
          v-model="form.introText"
          label="介绍正文"
          :rows="5"
          placeholder="请输入公司介绍正文"
          :disabled="!auth.canEdit"
        />
      </div>

      <p v-if="formError" class="ad-field-error">{{ formError }}</p>
    </div>
  </div>
</template>
