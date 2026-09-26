/** 管理后台视觉现状取证：截图 + 关键样式读取 */
import fs from 'node:fs'

const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:5174'
const DEBUG = `http://127.0.0.1:${port}`
fs.mkdirSync('docs/qa-shots', { recursive: true })

class CDP {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map(); this.errors = []
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result) }
    }
  }
  static async connect(u) { const ws = new WebSocket(u); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) }); return new CDP(ws) }
  send(method, params = {}) { const id = ++this.seq; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async evaluate(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval'); return r.result.value }
  async shot(name) { const d = (await this.send('Page.captureScreenshot', { format: 'png' })).data; fs.writeFileSync(`docs/qa-shots/${name}.png`, Buffer.from(d, 'base64')) }
  close() { try { this.ws.close() } catch {} }
}

const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
const c = await CDP.connect(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await c.send('Page.navigate', { url: `${base}/login` })
await new Promise((r) => setTimeout(r, 1500))
try { await c.evaluate('localStorage.clear()') } catch {}
await c.send('Page.navigate', { url: `${base}/login` })
for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 250)); if (await c.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
await c.evaluate(`(()=>{const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};s(document.querySelector('input[type=email]'),'admin@jiaodianfilm.com');s(document.querySelector('input[type=password]'),'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))})()`)
await new Promise((r) => setTimeout(r, 2800))

const PROBE = `(() => {
  const cs = (el, p) => (el ? getComputedStyle(el)[p] : null)
  const btns = [...document.querySelectorAll('button')].slice(0, 12).map((b) => ({
    text: (b.innerText || '').trim().slice(0, 10),
    cls: b.className.slice(0, 60),
    bg: cs(b, 'backgroundColor'),
    color: cs(b, 'color'),
    border: cs(b, 'borderColor')
  }))
  const aside = document.querySelector('aside')
  return JSON.stringify({
    bodyBg: cs(document.body, 'backgroundColor'),
    asideBorderRight: aside ? cs(aside, 'borderRightColor') + ' ' + cs(aside, 'borderRightWidth') : 'no-aside',
    asideW: aside ? Math.round(aside.getBoundingClientRect().width) : 0,
    navActive: (() => { const a = document.querySelector('.ad-nav-item.is-active'); return a ? cs(a, 'backgroundColor') + ' / ' + cs(a, 'color') : 'none' })(),
    buttons: btns,
    tableHeader: (() => { const th = document.querySelector('.ad-th'); return th ? cs(th, 'borderBottomColor') : 'no-th' })(),
    cardBorder: (() => { const card = document.querySelector('.ad-card'); return card ? cs(card, 'borderColor') : 'no-card' })()
  })
})()`

for (const [route, name] of [['/dashboard', 'audit-dashboard'], ['/videos', 'audit-videos'], ['/distributions', 'audit-distributions'], ['/leads', 'audit-leads']]) {
  await c.evaluate(`location.href='${route}'`)
  await new Promise((r) => setTimeout(r, 2600))
  console.log(`\n===== ${route} =====`)
  console.log(await c.evaluate(PROBE))
  await c.shot(name)
}
c.close()
console.log('\nDONE')
