<script setup lang="ts">
/** 登录页（§4.5）：背景 #F5F5F7，居中白卡 400，错误行内红字 */
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode } from '@/types/api'
import BrandMark from '@/components/BrandMark.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = '请输入账号与密码'
    return
  }
  loading.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    if (redirect) router.replace(redirect)
    else router.replace({ name: 'dashboard' })
  } catch (e) {
    if (e instanceof ApiError && e.code === ErrorCode.LOGIN_FAILED) error.value = '邮箱或密码错误'
    else error.value = e instanceof Error ? e.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.title = '登录 · 光屿摄影管理后台'
})
</script>

<template>
  <div class="min-h-screen bg-bg-page flex items-center justify-center px-5 py-10">
    <div class="w-full max-w-[400px] bg-ad-surface rounded-modal shadow-card-soft border border-ad-border px-8 py-9">
      <!-- 品牌区 -->
      <div class="flex flex-col items-center text-center">
        <BrandMark :size="52" />
        <h1 class="text-[20px] font-semibold text-ad-text mt-3.5">光屿摄影</h1>
        <p class="text-[12px] text-ad-text-3 mt-1">管理后台 · 内部使用</p>
      </div>

      <div class="h-px bg-ad-border my-7" />

      <!-- 表单 -->
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div>
          <label class="ad-label">账号</label>
          <input
            v-model="email"
            type="email"
            class="ad-input ad-input-lg"
            placeholder="请输入邮箱"
            autocomplete="username"
            @keyup.enter="submit"
          />
        </div>

        <div>
          <label class="ad-label">密码</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="ad-input ad-input-lg pr-11"
              placeholder="••••••••"
              autocomplete="current-password"
              @keyup.enter="submit"
            />
            <button
              type="button"
              class="ad-icon-btn absolute right-1.5 top-1/2 -translate-y-1/2"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <AppIcon :name="showPassword ? 'eyeOff' : 'eye'" :size="17" />
            </button>
          </div>
        </div>

        <p v-if="error" class="ad-field-error !mt-0">{{ error }}</p>

        <AppButton type="submit" variant="primary" size="lg" block :loading="loading" class="mt-1">
          登录
        </AppButton>
      </form>

      <p class="text-[11px] text-ad-text-4 text-center mt-7 leading-5">
        仅限内部人员使用 · 忘记密码请联系管理员重置
      </p>
    </div>
  </div>
</template>
