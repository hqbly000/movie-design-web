import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { vReveal, vRevealX } from './composables/useInView'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
// 全局注册滚动淡入指令，供任意层级组件使用（v-reveal / v-reveal="延迟ms"）
app.directive('reveal', vReveal)
// 方向进场指令（方案A · 五列错峰合入）：v-reveal-x="{ x, y, delay }"
app.directive('reveal-x', vRevealX)
app.mount('#app')
