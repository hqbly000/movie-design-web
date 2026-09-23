// 决定性实验：让 #page-actions 在 app 挂载前就存在于 document 中（真正可被 querySelector 命中）
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const ROUTE = process.argv[3] || '/videos'
const FIX = process.argv[4] === 'fix'
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map(); this.exc = []; this.warn = []
    ws.onmessage = e => { const m = JSON.parse(e.data)
      if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) }
      else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; this.exc.push((d.exception?.description || d.text).split('\n')[0]) }
      else if (m.method === 'Runtime.consoleAPICalled') { const t = m.params.args.map(a => a.value ?? a.description ?? '').join(' '); if (/Teleport|\[Vue warn\]/i.test(t)) this.warn.push(t.slice(0, 160)) }
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
if (FIX) {
  await c.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const orig = Document.prototype.querySelector;
      Document.prototype.querySelector = function (sel) {
        if (sel === '#page-actions' && !this.getElementById('page-actions')) {
          const d = this.createElement('div'); d.id = 'page-actions';
          d.className = 'flex items-center gap-2';
          (this.body || this.documentElement).appendChild(d);
          console.log('[qa-fix] injected #page-actions into document before mount');
        }
        return orig.call(this, sel);
      };
    })()`
  })
}
await c.send('Page.navigate', { url: `${BASE}/dashboard` })
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`!!document.querySelector('aside')`)) break }
console.log('auth ready; fix =', FIX)
c.exc = []; c.warn = []
await c.send('Page.navigate', { url: `${BASE}${ROUTE}` })
for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`document.readyState==='complete'`)) break }
await new Promise(r => setTimeout(r, 4000))
console.log('path=', await c.ev('location.pathname'))
console.log('exceptions:', c.exc.length, c.exc.slice(0, 2))
console.log('teleport warnings:', c.warn.length, JSON.stringify(c.warn.slice(0, 3)))
console.log('tableRows=', await c.ev(`document.querySelectorAll('table tbody tr').length`))
console.log('skeletons=', await c.ev(`document.querySelectorAll('.ad-skeleton, [class*=skeleton]').length`))
console.log('actionsText=', await c.ev(`(document.getElementById('page-actions')?.innerText || '').trim().slice(0,40)`))
console.log('subtitle=', await c.ev(`(document.querySelector('header p')?.innerText || '').slice(0,60)`))
console.log('actionsCount=', await c.ev(`document.querySelectorAll('#page-actions').length`))
c.close(); process.exit(0)
