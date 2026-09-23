/** A/B 诊断：新 dist(4174) vs 旧 --outDir 构建(4175) 的 AdminLayout 几何
 *  同时验证滚动后行为
 */
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
async function loginAs(base, w, h) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const c = await CDP.connect(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await c.send('Page.navigate', { url: `${base}/login` })
  await new Promise((r) => setTimeout(r, 1500))
  await c.evaluate('localStorage.clear()')
  await c.send('Page.navigate', { url: `${base}/login` })
  for (let i = 0; i < 120; i++) { await new Promise((r) => setTimeout(r, 250)); if (await c.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
  await c.evaluate(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};s(e,'admin@lightisle.studio');s(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2600))
  return c
}
const go = async (c, r, ms = 3200) => { await c.evaluate(`location.href='${r}'`); await new Promise((x) => setTimeout(x, ms)) }

const M = `(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), x: Math.round(r.x), w: Math.round(r.width) } };
  const root = document.querySelector('#app > div');
  const wrap = document.querySelector('aside') ? document.querySelector('aside').nextElementSibling : null;
  return JSON.stringify({
    innerH: innerHeight, innerW: innerWidth,
    rootDisplay: root ? getComputedStyle(root).display : null,
    rootFlexDir: root ? getComputedStyle(root).flexDirection : null,
    wrapCls: wrap ? (wrap.className||'').toString() : null,
    wrapMarginLeft: wrap ? getComputedStyle(wrap).marginLeft : null,
    aside: R(document.querySelector('aside')),
    wrap: R(wrap),
    header: R(document.querySelector('header')),
    main: R(document.querySelector('main')),
    docH: document.documentElement.scrollHeight,
    maxScroll: document.documentElement.scrollHeight - innerHeight,
    scrollTop: document.documentElement.scrollTop || document.body.scrollTop
  });
})()`

for (const [label, base] of [['NEW 4174', 'http://127.0.0.1:4174'], ['OLD 4175', 'http://127.0.0.1:4175']]) {
  const c = await loginAs(base, 1440, 900)
  await go(c, '/videos')
  console.log(`\n==== ${label} /videos @1440x900 scrollTop=0 ====`)
  console.log(await c.evaluate(M))
  // 滚动到最大
  await c.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
  await new Promise((r) => setTimeout(r, 600))
  console.log(`---- ${label} 滚动到底后 ----`)
  console.log(await c.evaluate(M))
  const shot = await c.send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.writeFileSync(`qa-tests/.out/ab-${label.split(' ')[0]}-scrolled.png`, Buffer.from(shot.data, 'base64'))
  c.close()
}
console.log('\nDONE')
process.exit(0)
