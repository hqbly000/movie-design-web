/** 多视口高度/多构建源：确认「内容被整体下推 100vh」是否为真实布局缺陷 */
const port = process.argv[2] || '9223'
const DEBUG = `http://127.0.0.1:${port}`
class CDP {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map()
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result) } }
  }
  static async connect(u) { const ws = new WebSocket(u); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) }); return new CDP(ws) }
  send(method, params = {}) { const id = ++this.seq; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async evaluate(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval ' + (r.exceptionDetails.exception?.description || '')); return r.result.value }
  close() { try { this.ws.close() } catch {} }
}
async function open(base, w, h) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const c = await CDP.connect(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await c.send('Page.navigate', { url: `${base}/login` })
  await new Promise((r) => setTimeout(r, 1800))
  try { await c.evaluate('localStorage.clear()') } catch {}
  await c.send('Page.navigate', { url: `${base}/login` })
  for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 250)); if (await c.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
  await c.evaluate(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');if(!e||!p)return 0;const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};s(e,'admin@lightisle.studio');s(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2600))
  return c
}
const M = `(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), x: Math.round(r.x) } };
  const root = document.querySelector('#app > div');
  const aside = document.querySelector('aside');
  const wrap = aside ? aside.nextElementSibling : null;
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  const rows = document.querySelectorAll('table tbody tr').length;
  return JSON.stringify({
    innerH: innerHeight, rootDisplay: root ? getComputedStyle(root).display : null,
    aside: R(aside), asidePos: aside ? getComputedStyle(aside).position : null,
    wrap: R(wrap), header: R(header), main: R(main),
    headerVisibleInViewport: header ? (header.getBoundingClientRect().top >= 0 && header.getBoundingClientRect().top < innerHeight) : null,
    mainVisibleInViewport: main ? (main.getBoundingClientRect().top >= 0 && main.getBoundingClientRect().top < innerHeight) : null,
    rows, docH: document.documentElement.scrollHeight
  });
})()`
for (const [label, base, w, h] of [
  ['DEV 5174', 'http://127.0.0.1:5174', 1440, 900],
  ['DEV 5174', 'http://127.0.0.1:5174', 1440, 700],
  ['DIST 4174', 'http://127.0.0.1:4174', 1440, 700],
  ['DIST 4174', 'http://127.0.0.1:4174', 1280, 800],
  ['DIST 4174', 'http://127.0.0.1:4174', 390, 780]
]) {
  const c = await open(base, w, h)
  await c.evaluate(`location.href='/videos'`)
  await new Promise((r) => setTimeout(r, 3200))
  console.log(`\n==== ${label} /videos @${w}x${h} ====`)
  console.log(await c.evaluate(M))
  c.close()
}
console.log('\nDONE')
process.exit(0)
