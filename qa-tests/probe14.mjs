// 用 CDP Debugger 在 shouldUpdateComponent 处下断点，读出 prev/next vnode 的组件身份
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const ROUTE = process.argv[3] || '/videos'
const LINE = parseInt(process.argv[4] || '7104', 10) // 1-based
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map(); this.exc = []; this.paused = null
    ws.onmessage = e => { const m = JSON.parse(e.data)
      if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) }
      else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; this.exc.push((d.exception?.description || d.text).split('\n')[0]) }
      else if (m.method === 'Debugger.paused') { if (!this.paused) this.paused = m.params }
    } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x, frame) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true, ...(frame ? { callFrameId: frame } : {}) }); return r }
  close() { try { this.ws.close() } catch {} }
}
const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
const c = await CDP.c(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Debugger.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
// 建会话
await c.send('Page.navigate', { url: `${BASE}/dashboard` })
for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); const r = await c.ev(`!!document.querySelector('aside')`); if (r.result?.value) break }
console.log('auth ready')
// 切断点
const bp = await c.send('Debugger.setBreakpointByUrl', { lineNumber: LINE - 1, urlRegex: 'chunk-KOZD35AO\\.js', condition: 'prevVNode.component == null' })
console.log('breakpoint id=', bp.breakpointId, 'locations=', JSON.stringify(bp.locations))
c.exc = []
await c.send('Page.navigate', { url: `${BASE}${ROUTE}` })
for (let i = 0; i < 200 && !c.paused; i++) await new Promise(r => setTimeout(r, 100))
if (!c.paused) { console.log('NOT PAUSED; exc=', c.exc.slice(0, 2)); c.close(); process.exit(0) }
const f = c.paused.callFrames[0]
console.log('paused at:', f.functionName, f.location.lineNumber + 1 + ':' + (f.location.columnNumber + 1))
const info = await c.send('Debugger.evaluateOnCallFrame', { callFrameId: f.callFrameId, expression: `(() => {
  const out = {};
  try { const p = prevVNode, n = nextVNode;
    const name = (v) => v && v.type ? (v.type.__name || v.type.name || (typeof v.type === 'string' ? v.type : 'comp')) : String(v);
    const file = (v) => v && v.type && v.type.__file ? v.type.__file : null;
    out.prevName = name(p); out.prevFile = file(p); out.prevKey = p && p.key; out.prevCompNull = !p || p.component == null;
    out.nextName = name(n); out.nextFile = file(n); out.nextKey = n && n.key;
    out.prevPropsKeys = p && p.props ? Object.keys(p.props).slice(0,8) : null;
    out.nextPropsKeys = n && n.props ? Object.keys(n.props).slice(0,8) : null;
    out.prevChildType = p && p.children != null ? (typeof p.children === 'object' && p.children.default ? 'slots' : typeof p.children) : null;
  } catch (e) { out.err = e.message }
  return JSON.stringify(out);
})()`, returnByValue: true })
console.log('VNode info:', info.result?.value, info.exceptionDetails ? JSON.stringify(info.exceptionDetails.exception?.description) : '')
// 打印调用栈中的用户组件帧
for (const cf of c.paused.callFrames.slice(0, 20)) {
  if (/src\//.test(cf.url)) console.log('  user frame:', cf.functionName || '(anon)', cf.url.replace(BASE, ''), cf.location.lineNumber + 1)
}
await c.send('Debugger.resume')
await new Promise(r => setTimeout(r, 1500))
console.log('total exceptions:', c.exc.length)
c.close(); process.exit(0)
