import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import { TOKEN_KEY } from '@/utils/constants'
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

/* ------------------------------------------------------------------
 * 路由懒加载 chunk 失败兜底
 *
 * 后台是 index.html + assets/*.js 的懒加载产物：只要 dist 上传不完整、
 * 或用户手里还是旧 index.html 而旧 chunk 已被清理，动态 import 就会 404。
 * 此时 Vue Router 的导航会**静默中断**——URL 不变、页面无反应，
 * 表现就是「点登录没反应」「登录成功后不跳转」，控制台之外没有任何线索。
 *
 * 处理：先自动重载一次（拿到新的 index.html 即可自愈）；仍失败则给出可见提示，
 * 避免用户对着一个没有任何反馈的页面反复点击。
 *
 * 另有一个连带坑：本地还留着未过期的 token 时，路由守卫会把 `/` 与 `/login`
 * **都**重定向到 dashboard；dashboard 的 chunk 404 → 导航中断 → 整页空白，
 * 登录页也进不去（两头堵死）。故提示条里附一个「清除登录状态并重试」的逃生按钮。
 * ------------------------------------------------------------------ */
const CHUNK_RETRY_KEY = 'lightisle_admin_chunk_retried'
const CHUNK_ERR_RE = /dynamically imported module|Importing a module script failed|Failed to fetch|preload/i

let bannerShown = false
function showChunkFailureBanner(): void {
  if (bannerShown || document.getElementById('chunk-error-banner')) return
  bannerShown = true
  const box = document.createElement('div')
  box.id = 'chunk-error-banner'
  box.setAttribute('role', 'alert')
  box.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
    'padding:12px 16px',
    'font:13px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif',
    'color:#C0392B', 'background:#FDECEA',
    'border-bottom:1px solid rgba(192,57,43,.25)',
    'display:flex', 'align-items:center', 'justify-content:center', 'gap:12px', 'flex-wrap:wrap'
  ].join(';')

  const text = document.createElement('span')
  text.textContent = '页面资源加载失败，请按 Ctrl+F5 强制刷新；若持续失败，请把这条提示截图给技术同学（疑似线上产物不完整）。'

  const reset = document.createElement('button')
  reset.type = 'button'
  reset.textContent = '清除登录状态并重试'
  reset.style.cssText = [
    'padding:4px 12px', 'border:1px solid rgba(192,57,43,.45)', 'border-radius:6px',
    'background:#fff', 'color:#C0392B', 'font-size:12px', 'cursor:pointer', 'white-space:nowrap'
  ].join(';')
  reset.onclick = () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(CHUNK_RETRY_KEY)
    } catch {
      /* ignore */
    }
    window.location.href = '/login'
  }

  box.append(text, reset)
  document.body.appendChild(box)
}

function handleChunkError(message: string): void {
  if (!CHUNK_ERR_RE.test(message)) return
  let retried = false
  try {
    retried = sessionStorage.getItem(CHUNK_RETRY_KEY) === '1'
  } catch {
    /* 隐私模式下 sessionStorage 不可用：直接提示，不做自动重载 */
    showChunkFailureBanner()
    return
  }
  if (!retried) {
    try {
      sessionStorage.setItem(CHUNK_RETRY_KEY, '1')
    } catch {
      /* ignore */
    }
    window.location.reload()
    return
  }
  showChunkFailureBanner()
}

// Vite 对懒加载预取失败会派发该事件（官方推荐的重载钩子）
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  handleChunkError('preload')
})

// 兜底：路由解析 / 组件加载阶段的动态 import 失败
router.onError((err) => {
  handleChunkError(err instanceof Error ? err.message : String(err))
})

app.mount('#app')
