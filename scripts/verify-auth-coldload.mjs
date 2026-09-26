/**
 * 偶发 401 定性实验：管理后台冷加载鉴权稳定性
 * 每轮：新标签页 → 清空 localStorage → UI 登录 → 跳转目标路由 → 记录是否 401 / 是否被踢回登录页
 * 监听 Network 捕获 /api/ 的 401 响应，记录路由守卫执行时的 store 状态。
 * 用法：node scripts/verify-auth-coldload.mjs <cdpPort> <base> [iterations]
 */
import fs from 'node:fs'

const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:4174'
const N = Number(process.argv[4] || 8)

const DEBUG = `http://127.0.0.1:${port}`

class CDP {
  constructor(ws) {
    this.ws = ws
    this.seq = 0
    this.pending = new Map()
    this.api401 = []
    this.errors = []
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.method === 'Network.responseReceived') {
        const url = m.params.response?.url || ''
        const st = m.params.response?.status
        if (url.includes('/api/') && (st === 401 || st === 403)) this.api401.push(`${st} ${url.split('/api/')[1]}`)
      }
      if (m.method === 'Runtime.exceptionThrown') this.errors.push(m.params.exceptionDetails?.exception?.description?.slice(0, 120) || '')
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
      }
    }
  }
  static async connect(u) {
    const ws = new WebSocket(u)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) })
    return new CDP(ws)
  }
  send(method, params = {}) {
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async evaluate(x) {
    const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval ' + (r.exceptionDetails.exception?.description || ''))
    return r.result.value
  }
  close() { try { this.ws.close() } catch {} }
}

const results = []
for (let i = 1; i <= N; i++) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const c = await CDP.connect(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })

  // 冷启动：先访问再清空，确保无残留登录态
  await c.send('Page.navigate', { url: `${base}/login` })
  await new Promise((r) => setTimeout(r, 1200))
  try { await c.evaluate('localStorage.clear(); sessionStorage.clear()') } catch {}
  await c.send('Page.navigate', { url: `${base}/login` })
  for (let k = 0; k < 80; k++) {
    await new Promise((r) => setTimeout(r, 250))
    if (await c.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break
  }
  const loginOk = await c.evaluate(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');if(!e||!p)return 0;const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};s(e,'admin@jiaodianfilm.com');s(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2400))

  const afterLogin = await c.evaluate(`JSON.stringify({path: location.pathname, token: !!localStorage.getItem('li_token') || Object.keys(localStorage).some(k=>/token/i.test(k))})`)
  // 记录守卫执行前 store 是否已有 token（探测 localStorage 键）
  const keys = await c.evaluate(`JSON.stringify(Object.keys(localStorage))`)

  c.api401.length = 0
  await c.evaluate(`location.href='/members'`)
  await new Promise((r) => setTimeout(r, 2800))
  const after = await c.evaluate(`JSON.stringify({path: location.pathname, rows: document.querySelectorAll('article').length, skeletons: document.querySelectorAll('.ad-skeleton').length})`)

  const a = JSON.parse(afterLogin), b = JSON.parse(after)
  const bounced = b.path.startsWith('/login')
  results.push({ i, loginOk, keys: JSON.parse(keys), tokenStored: a.token, landedOn: b.path, bounced, api401: [...c.api401], rows: b.rows, skel: b.skeletons, errs: c.errors.length })
  console.log(
    `#${String(i).padStart(2)} login=${loginOk} token=${a.token} keys=${JSON.parse(keys).length} ` +
    `landed=${b.path.padEnd(13)} bounced=${bounced} 401=${JSON.stringify([...c.api401])} rows=${b.rows} skel=${b.skel} err=${c.errors.length}`
  )
  c.close()
}

const bounces = results.filter((r) => r.bounced).length
const with401 = results.filter((r) => r.api401.length > 0).length
console.log(`\n===== 冷加载 ${N} 轮：被踢回登录 ${bounces} 次，出现 401/403 ${with401} 次 =====`)
console.log(bounces === 0 && with401 === 0 ? '结论：本轮未复现偶发 401，鉴权链路在冷加载下稳定。' : `结论：复现 ${bounces} 次跳登录 / ${with401} 次 401，存在真实竞态。`)
fs.writeFileSync('qa-tests/.out/coldload.json', JSON.stringify(results, null, 2))
process.exit(bounces === 0 && with401 === 0 ? 0 : 1)
