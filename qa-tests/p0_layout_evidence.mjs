/**
 * P0 证据：管理后台桌面端主内容被整体下推 100vh（首屏只见侧栏，主区空白）
 * 产出：
 *   docs/qa-shots/r2-P0-desktop-top.png      首屏（scrollTop=0，主区空白）
 *   docs/qa-shots/r2-P0-desktop-scrolled.png 滚动一屏后（布局正常）
 *   qa-tests/.out/p0_layout.txt              几何证据表
 * 用法：node p0_layout_evidence.mjs <cdpPort> <base>
 */
import fs from 'node:fs'
const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:4174'
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
async function open(w, h) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const c = await CDP.connect(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await c.send('Page.navigate', { url: `${base}/login` })
  await new Promise((r) => setTimeout(r, 1800))
  try { await c.evaluate('localStorage.clear()') } catch {}
  await c.send('Page.navigate', { url: `${base}/login` })
  for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 250)); if (await c.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
  await c.evaluate(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');if(!e||!p)return 0;const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};s(e,'admin@jiaodianfilm.com');s(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2600))
  return c
}
const M = `(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), x: Math.round(r.x), w: Math.round(r.width) } };
  const root = document.querySelector('#app > div');
  const aside = document.querySelector('aside');
  const wrap = aside ? aside.nextElementSibling : null;
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  const hr = header ? header.getBoundingClientRect() : null;
  const mr = main ? main.getBoundingClientRect() : null;
  const pa = document.querySelector('#page-actions');
  return JSON.stringify({
    innerH: innerHeight, innerW: innerWidth,
    root: root ? { display: getComputedStyle(root).display, cls: root.className } : null,
    aside: { rect: R(aside), position: aside ? getComputedStyle(aside).position : null, cls: aside ? aside.className : null },
    wrap: { rect: R(wrap), cls: wrap ? wrap.className : null, marginLeft: wrap ? getComputedStyle(wrap).marginLeft : null },
    header: R(header), main: R(main),
    headerInViewport: hr ? (hr.top >= 0 && hr.top < innerHeight) : null,
    mainInViewport: mr ? (mr.top >= 0 && mr.top < innerHeight) : null,
    pageActions: pa ? { rect: R(pa), text: pa.innerText.trim().replace(/\\s+/g,' ') } : null,
    rows: document.querySelectorAll('table tbody tr').length,
    docH: document.documentElement.scrollHeight,
    scrollTop: document.documentElement.scrollTop || document.body.scrollTop
  });
})()`
const log = []
const say = (s) => { console.log(s); log.push(s) }

const c = await open(1440, 900)
await c.evaluate(`location.href='/videos'`)
await new Promise((r) => setTimeout(r, 3200))
say('== 管理后台桌面端 @1440x900 · /videos ==')
say('[首屏 scrollTop=0]  ' + await c.evaluate(M))
fs.mkdirSync('docs/qa-shots', { recursive: true })
fs.writeFileSync('docs/qa-shots/r2-P0-desktop-top.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
await c.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
await new Promise((r) => setTimeout(r, 700))
say('[滚动到底后]      ' + await c.evaluate(M))
fs.writeFileSync('docs/qa-shots/r2-P0-desktop-scrolled.png', Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
c.close()
fs.writeFileSync('qa-tests/.out/p0_layout.txt', log.join('\n') + '\n')
console.log('\nDONE')
process.exit(0)
