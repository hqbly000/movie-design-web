// 逐路由扫描（生产产物）：记录每页的 Vue 错误日志与渲染状态
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:4174'
const ROUTES = (process.argv[3] || '/dashboard,/videos,/distributions,/hero-slides,/company,/segments,/honors,/members,/leads,/profile').split(',')
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map(); this.errs = []
    ws.onmessage = e => { const m = JSON.parse(e.data)
      if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) }
      else if (m.method === 'Runtime.exceptionThrown') { this.errs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]) }
      else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) { const t = m.params.args.map(a => a.value ?? a.description ?? '').join(' '); if (/emitsOptions|Teleport|Vue warn/i.test(t)) this.errs.push('LOG ' + t.split('\n')[0].slice(0, 90)) }
    } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.value }
  close() { try { this.ws.close() } catch {} }
}
const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const c = await CDP.c(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await c.send('Page.navigate', { url: `${BASE}/login` })
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`!!document.querySelector('input[type=email]')`)) break }
await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,'admin@jiaodianfilm.com');set(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
await new Promise(r => setTimeout(r, 2500))
console.log('route | exceptions/logs | rows | skeletons | cards | textHead')
for (const route of ROUTES) {
  c.errs = []
  await c.ev(`location.href='${route}'`)
  await new Promise(r => setTimeout(r, 3500))
  const path = await c.ev('location.pathname')
  const rows = await c.ev(`document.querySelectorAll('table tbody tr').length`)
  const sk = await c.ev(`document.querySelectorAll('.ad-skeleton, [class*=skeleton]').length`)
  const cards = await c.ev(`document.querySelectorAll('.ad-card, article, .ad-segment-card').length`)
  const txt = (await c.ev(`document.querySelector('main')?.innerText.slice(0,60)`) || '').replace(/\n/g, '|')
  console.log(`${route} -> ${path} | ${c.errs.length} ${JSON.stringify(c.errs.slice(0, 1))} | rows=${rows} sk=${sk} cards=${cards} | ${txt}`)
}
c.close(); process.exit(0)
