// 复核 size=200 造成的用户可见影响：/distributions 列表、/videos 统计、板块「从视频库选择」
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const SHIM = `(() => { const o = Document.prototype.querySelector; Document.prototype.querySelector = function (s) { if (s === '#page-actions' && !this.querySelectorAll('#page-actions').length) { const d = this.createElement('div'); d.id = 'page-actions'; d.setAttribute('style','position:fixed;top:10px;right:16px;z-index:60'); (this.body||this.documentElement).appendChild(d); } return o.call(this, s); }; })()`
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map()
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) } } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result?.value }
  close() { try { this.ws.close() } catch {} }
}
const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const c = await CDP.c(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await c.send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM })
await c.send('Page.navigate', { url: `${BASE}/login` })
await new Promise(r => setTimeout(r, 1500))
await c.ev(`localStorage.clear()`)
await c.send('Page.navigate', { url: `${BASE}/login` })
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,'admin@lightisle.studio');set(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
await new Promise(r => setTimeout(r, 2600))

for (const route of ['/distributions', '/videos', '/leads']) {
  await c.ev(`location.href='${route}'`); await new Promise(r => setTimeout(r, 2800))
  const o = JSON.parse(await c.ev(`JSON.stringify({
    rows: document.querySelectorAll('table tbody tr').length,
    errs: [...document.querySelectorAll('.ad-field-error')].map(e => e.innerText.trim()),
    header: (document.querySelector('header p')||{}).innerText || '',
    empty: /暂无|还没有|没有符合条件/.test(document.querySelector('main').innerText)
  })`))
  console.log(`${route} =>`, JSON.stringify(o))
}
c.close(); process.exit(0)
