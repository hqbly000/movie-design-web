/** 诊断：截图主区域空白 vs DOM 有数据
 *  用法：node diag_blank.mjs <cdpPort> <adminBase>
 */
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
async function loginAs(email, pwd, w, h) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const c = await CDP.connect(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await c.send('Page.navigate', { url: `${base}/login` })
  await new Promise((r) => setTimeout(r, 1500))
  await c.evaluate('localStorage.clear()')
  await c.send('Page.navigate', { url: `${base}/login` })
  for (let i = 0; i < 120; i++) { await new Promise((r) => setTimeout(r, 250)); if (await c.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
  await c.evaluate(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};s(e,${JSON.stringify(email)});s(p,${JSON.stringify(pwd)});document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2600))
  return c
}
const go = async (c, r, ms = 3200) => { await c.evaluate(`location.href='${r}'`); await new Promise((x) => setTimeout(x, ms)) }

const PROBE = `(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) } };
  const pick = (sel) => document.querySelector(sel);
  const info = (sel) => {
    const el = pick(sel); if (!el) return { sel, missing: true };
    const cs = getComputedStyle(el);
    return { sel, rect: R(el), display: cs.display, position: cs.position, overflow: cs.overflow, opacity: cs.opacity, visibility: cs.visibility, transform: cs.transform, zIndex: cs.zIndex, cls: (el.className||'').toString().slice(0,80) };
  };
  const sels = ['#app', 'aside', 'header', 'main', 'table', 'table tbody', 'header h1', '#page-actions', '#page-actions button'];
  const nodes = sels.map(info);
  // 所有祖先链上的滚动容器
  let scrollers = [];
  let cur = pick('main') || pick('#app');
  while (cur && cur !== document.documentElement) {
    const cs = getComputedStyle(cur);
    if (/(auto|scroll|hidden)/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
      scrollers.push({ tag: cur.tagName.toLowerCase(), cls: (cur.className||'').toString().slice(0,60), overflowY: cs.overflowY, scrollTop: cur.scrollTop, scrollHeight: cur.scrollHeight, clientHeight: cur.clientHeight });
    }
    cur = cur.parentElement;
  }
  const rows = document.querySelectorAll('table tbody tr').length;
  const h1 = pick('header h1');
  return JSON.stringify({
    url: location.href,
    viewport: { innerW: innerWidth, innerH: innerHeight, clientW: document.documentElement.clientWidth, clientH: document.documentElement.clientHeight },
    docScroll: { top: document.documentElement.scrollTop || document.body.scrollTop, height: document.documentElement.scrollHeight, bodyHeight: document.body.scrollHeight },
    bodyChildren: [...document.body.children].map(e => ({ tag: e.tagName.toLowerCase(), id: e.id, cls: (e.className||'').toString().slice(0,50) })),
    appChildrenCount: pick('#app') ? pick('#app').children.length : null,
    nodes, scrollers, rows, h1Text: h1 ? h1.textContent.trim() : null,
    mainHtmlHead: (pick('main') ? pick('main').innerHTML.slice(0, 200) : null)
  });
})()`

let c = await loginAs('admin@lightisle.studio', 'Admin@123456', 1440, 900)
for (const r of ['/videos', '/distributions']) {
  await go(c, r)
  const d = JSON.parse(await c.evaluate(PROBE))
  console.log('\n==== ' + r + ' ====')
  console.log('viewport:', JSON.stringify(d.viewport))
  console.log('docScroll:', JSON.stringify(d.docScroll))
  console.log('body children:', JSON.stringify(d.bodyChildren))
  console.log('#app children:', d.appChildrenCount, ' | rows:', d.rows, ' | h1:', JSON.stringify(d.h1Text))
  for (const n of d.nodes) console.log('  ', JSON.stringify(n))
  console.log('scrollers:', JSON.stringify(d.scrollers, null, 0))
  console.log('mainHead:', JSON.stringify(d.mainHtmlHead))

  // 截图（视口内）
  const shot = await c.send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.writeFileSync(`qa-tests/.out/diag${r.replace('/', '-')}.png`, Buffer.from(shot.data, 'base64'))
}
c.close()
console.log('\nDONE')
process.exit(0)
