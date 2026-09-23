// 实验：把 #page-actions 的 querySelector 结果伪装成 null，观察崩溃是否消失
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const ROUTE = process.argv[3] || '/videos'
const HIDE = process.argv[4] === 'hide' // 是否隐藏 Teleport 目标
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map(); this.exc = []; this.warn = []
    ws.onmessage = e => { const m = JSON.parse(e.data)
      if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) }
      else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; this.exc.push((d.exception?.description || d.text).split('\n')[0]) }
      else if (m.method === 'Runtime.consoleAPICalled') { const t = m.params.args.map(a => a.value ?? a.description ?? '').join(' '); if (/teleport|warn|Vue/i.test(t)) this.warn.push(t.slice(0, 200)) }
      else if (m.method === 'Log.entryAdded') { const t = m.params.entry.text; if (/teleport|warn/i.test(t)) this.warn.push(t.slice(0, 200)) }
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
if (HIDE) {
  // 在任何脚本执行前，让 document.querySelector('#page-actions') 永远返回 null
  await c.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const orig = Document.prototype.querySelector;
      Document.prototype.querySelector = function (sel) {
        if (sel === '#page-actions') return null;
        return orig.call(this, sel);
      };
      const origA = Document.prototype.querySelectorAll;
      Document.prototype.querySelectorAll = function (sel) {
        if (sel === '#page-actions') return [];
        return origA.call(this, sel);
      };
    })()`
  })
}
await c.send('Page.navigate', { url: `${BASE}/dashboard` })
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); const ok = await c.ev(`!!document.querySelector('aside')`).catch(() => false); if (ok) break }
console.log('auth ready; hide-target =', HIDE)
c.exc = []; c.warn = []
await c.send('Page.navigate', { url: `${BASE}${ROUTE}` })
for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 250)); const done = await c.ev(`document.readyState === 'complete'`).catch(() => false); if (done) break }
await new Promise(r => setTimeout(r, 3500))
console.log('path=', await c.ev('location.pathname'))
console.log('exceptions:', c.exc.length, c.exc.slice(0, 2))
console.log('vue warnings:', JSON.stringify(c.warn.slice(0, 6)))
console.log('tableRows=', await c.ev(`document.querySelectorAll('table tbody tr').length`))
console.log('skeletons=', await c.ev(`document.querySelectorAll('.ad-skeleton, [class*=skeleton]').length`))
console.log('actionsInnerHTML=', await c.ev(`(document.getElementById('page-actions')?.innerHTML || '').slice(0,120)`))
console.log('subtitle=', await c.ev(`(document.querySelector('header p')?.innerText || '').slice(0,60)`))
c.close(); process.exit(0)
