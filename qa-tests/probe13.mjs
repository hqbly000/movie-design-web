// 实验：直接整页加载 /videos（首次挂载）是否崩溃；再实验运行时屏蔽 usePageHeader 的 store 写入
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const ROUTE = process.argv[3] || '/videos'
const PATCH = process.argv[4] === 'patch' // 是否注入 setPage no-op
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map(); this.exc = []
    ws.onmessage = e => { const m = JSON.parse(e.data)
      if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) }
      else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; this.exc.push((d.exception?.description || d.text).split('\n').slice(0, 2).join(' ')) }
    } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
  close() { try { this.ws.close() } catch {} }
}
const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const c = await CDP.c(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

// 先到首页建立会话（复用 profile 里已有的登录态）
await c.send('Page.navigate', { url: `${BASE}/dashboard` })
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); const ok = await c.ev(`!!document.querySelector('aside')`).catch(() => false); if (ok) break }
console.log('auth ready, path=', await c.ev('location.pathname'))

if (PATCH) {
  // 运行时把 Pinia ui store 的 setPage 换成 no-op：通过扫 __pinia 实例
  const r = await c.ev(`(()=>{
    try {
      // Vue 应用挂在 #app 上，从 DOM 元素拿不到实例；尝试全局
      const cands = [];
      const app = document.querySelector('#app')?.__vue_app__;
      if (app) cands.push(app);
      return JSON.stringify({ hasApp: !!app });
    } catch(e){ return 'err '+e.message }
  })()`)
  console.log('patch probe:', r)
}

c.exc = []
console.log('--- 整页加载', ROUTE, '(full reload) ---')
await c.send('Page.navigate', { url: `${BASE}${ROUTE}` })
for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 250)); const done = await c.ev(`document.readyState === 'complete'`).catch(() => false); if (done) break }
await new Promise(r => setTimeout(r, 3000))
console.log('path=', await c.ev('location.pathname'))
console.log('exceptions:', c.exc.length)
c.exc.slice(0, 2).forEach((e, i) => console.log(` [${i}]`, e))
console.log('tableRows=', await c.ev(`document.querySelectorAll('table tbody tr').length`))
console.log('skeletons=', await c.ev(`document.querySelectorAll('.ad-skeleton, [class*=skeleton]').length`))
console.log('pageActionsHTMLlen=', await c.ev(`(document.getElementById('page-actions')||{}).innerHTML ? document.getElementById('page-actions').innerHTML.length : -1`))
c.close(); process.exit(0)
