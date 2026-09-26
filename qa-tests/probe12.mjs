// 精确定位 admin /videos 崩溃堆栈（含 sourceURL:line:col）
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const ROUTE = process.argv[3] || '/videos'
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map(); this.exc = []; this.logs = []
    ws.onmessage = e => { const m = JSON.parse(e.data)
      if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) }
      else if (m.method === 'Runtime.exceptionThrown') { this.exc.push(m.params.exceptionDetails) }
      else if (m.method === 'Log.entryAdded') { this.logs.push(m.params.entry.text) }
    } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
  close() { try { this.ws.close() } catch {} }
}
const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const c = await CDP.c(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await c.send('Page.navigate', { url: `${BASE}/login` })
let ok = false
for (let i = 0; i < 160; i++) { await new Promise(r => setTimeout(r, 500)); try { ok = await c.ev(`!!document.querySelector('input[type=email]')`) } catch {} if (ok) break }
console.log('login form ready=', ok)
if (!ok) {
  const p = await c.ev('location.pathname').catch(() => '?')
  if (p === '/login') {
    console.log('LOGS:', c.logs.slice(0, 10))
    console.log('EXC:', c.exc.slice(0, 3).map(d => d.exception?.description || d.text))
    c.close(); process.exit(3)
  }
  console.log('already authenticated, path =', p)
} else {
  await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,'admin@jiaodianfilm.com');set(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise(r => setTimeout(r, 3000))
  console.log('after login path=', await c.ev('location.pathname'))
}
c.exc = []; c.logs = []
await c.ev(`location.href='${ROUTE}'`); await new Promise(r => setTimeout(r, 6000))
console.log('route path=', await c.ev('location.pathname'))
console.log('=== exceptionThrown count:', c.exc.length, '===')
for (const d of c.exc.slice(0, 3)) {
  console.log('--- exception ---')
  console.log('text:', d.text)
  console.log('desc:', (d.exception?.description || '').split('\n').slice(0, 6).join('\n'))
  const st = d.stackTrace
  if (st?.callFrames) {
    for (const f of st.callFrames.slice(0, 12)) {
      console.log(`  at ${f.functionName || '(anon)'} ${f.url}:${f.lineNumber + 1}:${f.columnNumber + 1}`)
    }
  }
}
console.log('=== console/Log entries ===')
for (const l of c.logs.slice(0, 12)) console.log(' ', l.split('\n')[0].slice(0, 220))
console.log('=== DOM state ===')
console.log('tableRows=', await c.ev(`document.querySelectorAll('table tbody tr').length`))
console.log('skeletons=', await c.ev(`document.querySelectorAll('[class*=skeleton], .ad-skeleton').length`))
console.log('bodyHead=', (await c.ev(`document.body.innerText.slice(0,160)`)).replace(/\n/g, ' | '))
c.close(); process.exit(0)
