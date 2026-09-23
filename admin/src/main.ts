import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

/** 全局 1002（未登录/过期）处理：清 token 并跳登录页 */
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  auth.clear()
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    router.replace({
      name: 'login',
      query: current.fullPath && current.fullPath !== '/' ? { redirect: current.fullPath } : undefined
    })
  }
})

app.mount('#app')
