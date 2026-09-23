// 生产产物验证：登录后访问 /videos，比较「原样」与「预置 Teleport 目标」两组
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:4174'
const ROUTE = process.argv[3] || '/videos'
const FIX = process.argv[4] === 'fix'
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map(); this.exc = []; this.warn = []
    ws.onmessage = e => { const m = JSON.parse(e.data)
      if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) }
      else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; this.exc.push((d.exception?.description || d.text).split('\n')[0]) }
      else if (m.method === 'Runtime.consoleAPICalled') { const t = m.params.args.map(a => a.value ?? a.description ?? '').join(' '); if (/Teleport|\[Vue warn\]|emitsOptions/i.test(t)) this.warn.push(t.slice(0, 150)) }
    } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result?.value }
  close() { try { this.ws.close() } catch {} }
}
const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const c = await CDP.c(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
if (FIX) {
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const orig = Document.prototype.querySelector;
    Document.prototype.querySelector = function (sel) {
      if (sel === '#page-actions' && !this.getElementById('page-actions')) {
        const d = this.createElement('div'); d.id = 'page-actions';
        (this.body || this.documentElement).appendChild(d);
      }
      return orig.call(this, sel);
    }; })()` })
}
await c.send('Page.navigate', { url: `${BASE}/login` })
let ok = false
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); ok = await c.ev(`!!document.querySelector('input[type=email]')`).catch(() => false); if (ok) break }
if (!ok) { console.log('login page not ready, path=', await c.ev('location.pathname').catch(() => '?')); }
else {
  await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,'admin@lightisle.studio');set(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise(r => setTimeout(r, 3000))
}
console.log('after login path=', await c.ev('location.pathname'))
c.exc = []; c.warn = []
await c.send('Page.navigate', { url: `${BASE}${ROUTE}` })
for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`document.readyState==='complete'`)) break }
await new Promise(r => setTimeout(r, 4000))
console.log(`[PROD fix=${FIX}] path=`, await c.ev('location.pathname'))
console.log('  exceptions:', c.exc.length, JSON.stringify(c.exc.slice(0, 2)))
console.log('  warn:', c.warn.length, JSON.stringify(c.warn.slice(0, 2)))
console.log('  tableRows=', await c.ev(`document.querySelectorAll('table tbody tr').length`))
console.log('  skeletons=', await c.ev(`document.querySelectorAll('.ad-skeleton, [class*=skeleton]').length`))
console.log('  pageActionsText=', JSON.stringify(await c.ev(`(document.getElementById('page-actions')?.innerText || '').trim().slice(0,30)`)))
console.log('  bodyHead=', (await c.ev(`document.body.innerText.slice(0,120)`)).replace(/\n/g, '|'))
const { data } = await c.send('Page.captureScreenshot', { format: 'png' })
const fs = await import('node:fs')
fs.writeFileSync(new URL(`./shots-prod-videos${FIX ? '-fix' : ''}.png`, import.meta.url), Buffer.from(data, 'base64'))
c.close(); process.exit(0)
