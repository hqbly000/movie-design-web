#!/usr/bin/env node
/**
 * 管理后台「线上登录 → 跳转」端到端探针
 *
 * 用途：部署后用真实无头浏览器跑一次登录，确认「登录成功 → 进入工作台」链路通。
 * 这一步能抓到只有真实浏览器才暴露的问题：某个懒加载 chunk 404 会让路由导航
 * **静默中断**（URL 不变、页面无反应），HTTP 层面看不出任何异常。
 *
 * 前置：
 *   1) 启动无头 Chromium（本机可用的那个，注意要用 playwright 缓存的 chromium）
 *      "<chromium>" --headless=new --no-sandbox --disable-gpu --no-proxy-server \
 *        --remote-debugging-port=9223 --remote-allow-origins='*' \
 *        --user-data-dir="C:/Users/admin/AppData/Local/Temp/cdp-admin-login" \
 *        --window-size=1440,900 about:blank
 *   2) 建议先跑 scripts/verify-static-integrity.mjs 确认产物完整
 *
 * 用法：node qa-tests/verify-admin-login.mjs <origin> [cdpPort]
 *  例：node qa-tests/verify-admin-login.mjs http://124.223.29.189:19010 9223
 *
 * 退出码：0 跳转正常；1 未跳转 / 出现资源加载错误
 */
const origin = (process.argv[2] || '').replace(/\/$/, '')
const cdpPort = process.argv[3] || '9223'
// CDP 基地址：默认 127.0.0.1；若浏览器重启后只绑到 IPv6，用 CDP_BASE='http://[::1]:9223' 覆盖
const CDP_BASE = process.env.CDP_BASE || `http://127.0.0.1:${cdpPort}`
if (!origin) {
  console.error('用法：node qa-tests/verify-admin-login.mjs <origin> [cdpPort]')
  process.exit(2)
}

const EMAIL = process.env.ADMIN_EMAIL || 'admin@lightisle.studio'
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const target = await (
  await fetch(`${CDP_BASE}/json/new?about:blank`, { method: 'PUT' })
).json()
const ws = new WebSocket(target.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const errors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
    return
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 160))
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    errors.push(m.params.entry.text.slice(0, 160))
  }
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++seq
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })
await send('Runtime.enable')
await send('Page.enable')
await send('Log.enable')
const evaluate = async (x) =>
  (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value

console.log(`站点：${origin}`)
await send('Page.navigate', { url: `${origin}/login` })
await sleep(1500)
// 清掉上一次的登录态，保证从"未登录"起步
await evaluate('localStorage.clear(); sessionStorage.clear()')
await send('Page.navigate', { url: `${origin}/login` })
await sleep(2500)
console.log(`登录页：${await evaluate('location.pathname')} / ${await evaluate('document.title')}`)

await evaluate(`(() => {
  const inputs = document.querySelectorAll('input')
  const set = (el, v) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  set(inputs[0], ${JSON.stringify(EMAIL)})
  set(inputs[1], ${JSON.stringify(PASSWORD)})
  document.querySelector('button[type=submit]').click()
  return 1
})()`)
await sleep(5000)

const path = await evaluate('location.pathname')
const hasMain = await evaluate(`!!document.querySelector('main')`)
const banner = await evaluate(`(document.getElementById('chunk-error-banner')||{}).innerText || ''`)
const token = await evaluate(`localStorage.getItem('lightisle_admin_token') ? 'yes' : 'no'`)

console.log(`\n登录后 URL   = ${path}`)
console.log(`已渲染工作台 = ${hasMain ? '是' : '否'}`)
console.log(`token 已写入 = ${token}`)
if (banner) console.log(`页面提示     = ${banner}`)
if (errors.length) {
  console.log('\n控制台错误：')
  errors.slice(0, 8).forEach((e) => console.log('  ! ' + e))
}

const ok = path === '/dashboard' && hasMain && errors.length === 0
console.log(`\n${ok ? '✅ 登录 → 工作台 链路正常' : '❌ 登录后未能进入工作台（见上方 URL / 错误）'}`)
process.exit(ok ? 0 : 1)
