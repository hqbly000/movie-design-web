const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const ROUTE = process.argv[3] || '/videos'
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map()
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) } } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.value }
  close() { try { this.ws.close() } catch {} }
}
const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const c = await CDP.c(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await c.send('Page.navigate', { url: `${BASE}/dashboard` })
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`!!document.querySelector('aside')`)) break }
console.log('--- dashboard 上 #page-actions ---')
console.log('count=', await c.ev(`document.querySelectorAll('#page-actions').length`))
console.log('headerHTML=', (await c.ev(`document.querySelector('header')?.innerHTML || '(no header)'`)).replace(/\s+/g, ' ').slice(0, 400))
await c.send('Page.navigate', { url: `${BASE}${ROUTE}` })
for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`document.readyState==='complete'`)) break }
await new Promise(r => setTimeout(r, 3500))
console.log('--- ' + ROUTE + ' 上 #page-actions ---')
console.log('count=', await c.ev(`document.querySelectorAll('#page-actions').length`))
console.log('headerHTML=', (await c.ev(`document.querySelector('header')?.innerHTML || '(no header)'`)).replace(/\s+/g, ' ').slice(0, 500))
console.log('mainFirstChild=', (await c.ev(`document.querySelector('main')?.firstElementChild?.outerHTML || ''`)).replace(/\s+/g, ' ').slice(0, 200))
c.close(); process.exit(0)
