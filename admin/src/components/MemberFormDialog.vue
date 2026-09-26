<script setup lang="ts">
/** 邀请/编辑成员（§5.9，R20）：新增需初始密码；编辑可重置密码与改角色 */
import { computed, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/request'
import { createMember, updateMember } from '@/api/members'
import { ROLE_OPTIONS } from '@/utils/constants'
import { useToastStore } from '@/stores/toast'
import type { Member, Role } from '@/types/models'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import AppInput from './AppInput.vue'
import AppSelect from './AppSelect.vue'

const props = defineProps<{ modelValue: boolean; member: Member | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'saved'): void }>()

const toast = useToastStore()
const form = reactive({ name: '', email: '', role: 'editor' as Role, password: '' })
const saving = ref(false)
const errors = reactive({ name: '', email: '', password: '', form: '' })

const roleOptions = ROLE_OPTIONS.map((r) => ({ value: r.key, label: r.label }))
const isEdit = computed(() => !!props.member)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    form.name = props.member?.name ?? ''
    form.email = props.member?.email ?? ''
    form.role = props.member?.role ?? 'editor'
    form.password = ''
    errors.name = ''
    errors.email = ''
    errors.password = ''
    errors.form = ''
  }
)

function validate(): boolean {
  errors.name = form.name.trim() ? '' : '请输入成员姓名'
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  errors.email = !form.email.trim() ? '请输入登录邮箱' : emailOk ? '' : '邮箱格式不正确'
  if (!isEdit.value) {
    errors.password = form.password.length >= 6 ? '' : '初始密码至少 6 位'
  } else {
    errors.password = form.password && form.password.length < 6 ? '密码至少 6 位' : ''
  }
  return !errors.name && !errors.email && !errors.password
}

async function save(): Promise<void> {
  if (!validate()) return
  saving.value = true
  errors.form = ''
  try {
    if (props.member) {
      await updateMember(props.member.id, {
        name: form.name.trim(),
        role: form.role,
        password: form.password ? form.password : null
      })
    } else {
      await createMember({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role
      })
    }
    toast.success(isEdit.value ? '已保存' : '成员已邀请')
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    errors.form = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    :title="isEdit ? '编辑成员' : '邀请成员'"
    :width="520"
    mobile-fullscreen
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <AppInput v-model="form.name" label="姓名" placeholder="成员姓名" required :maxlength="32" :error="errors.name" />
      <AppInput
        v-model="form.email"
        label="登录账号（邮箱）"
        type="email"
        placeholder="name@jiaodianfilm.com"
        required
        :disabled="isEdit"
        :error="errors.email"
        :hint="isEdit ? '登录邮箱不可修改' : ''"
      />
      <AppSelect v-model="form.role" label="角色" required placeholder="" :options="roleOptions" />
      <AppInput
        v-model="form.password"
        label="密码"
        type="password"
        :placeholder="isEdit ? '留空则不修改密码' : '设置初始密码'"
        :required="!isEdit"
        autocomplete="new-password"
        :error="errors.password"
        :hint="isEdit ? '如需重置密码，请输入新密码（至少 6 位）' : '至少 6 位'"
      />
      <p v-if="errors.form" class="ad-field-error !mt-0">{{ errors.form }}</p>
    </div>

    <template #footer>
      <span />
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" @click="emit('update:modelValue', false)">取消</AppButton>
        <AppButton variant="primary" :loading="saving" @click="save">保存</AppButton>
      </div>
    </template>
  </AppModal>
</template>
