// §0.2「不要实现」清单 + 全局按钮样式禁项（前台 + 后台）
const DEBUG = 'http://127.0.0.1:9223'
const FE = process.argv[2] || 'http://127.0.0.1:4173'
const AD = process.argv[3] || 'http://127.0.0.1:5174'
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map()
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) } } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result?.value }
  close() { try { this.ws.close() } catch {} }
}
async function open(url, w = 1440, h = 900, shim = false) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
  const c = await CDP.c(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  if (shim) await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const o = Document.prototype.querySelector; Document.prototype.querySelector = function (s) { if (s === '#page-actions' && !this.querySelectorAll('#page-actions').length) { const d = this.createElement('div'); d.id='page-actions'; (this.body||this.documentElement).appendChild(d); } return o.call(this, s); }; })()` })
  await c.send('Page.navigate', { url })
  for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`document.readyState==='complete'`).catch(() => false)) break }
  await new Promise(r => setTimeout(r, 1500))
  return c
}
const STYLE_SCAN = `(() => {
  const els = [...document.querySelectorAll('button, a, [class*=btn]')].filter(e => e.offsetParent !== null || e.innerText.trim());
  const bad = [];
  for (const e of els) {
    const s = getComputedStyle(e);
    const txt = (e.innerText || '').trim();
    if ((s.backgroundImage && s.backgroundImage.includes('gradient')) || (s.boxShadow && s.boxShadow !== 'none') || (s.textShadow && s.textShadow !== 'none') || /[→›»]/.test(txt)) {
      bad.push({ txt: txt.slice(0, 16), bg: s.backgroundImage, shadow: s.boxShadow, ts: s.textShadow });
    }
  }
  return JSON.stringify({ total: els.length, bad });
})()`

let pass = 0, fail = 0
const chk = (label, ok, detail = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + label + (detail ? ' :: ' + detail : '')); ok ? pass++ : fail++ }

// ---------- 前台 ----------
let c = await open(FE)
const fe = JSON.parse(await c.ev(`(() => {
  const t = document.body.innerText;
  const nav = [...document.querySelectorAll('a,nav *')].map(e => (e.innerText||'').trim()).join('|');
  return JSON.stringify({
    navHasGallery: /作品图集|图集/.test(nav),
    bodyHas4K: /4K|HDR|超清/.test(t),
    durationPlay: /播放量|时长|次播放|万次/.test(t),
    arrowChars: [...document.querySelectorAll('button,a')].filter(e=>/[←→‹›«»]/.test((e.innerText||''))).map(e=>e.innerText.trim().slice(0,10)),
    biliLinks: [...document.querySelectorAll('a[href*=bilibili],a[href*=b23]')].length
  });
})()`))
chk('§0.2-1 官网无「作品图集」板块/导航', fe.navHasGallery === false, JSON.stringify(fe.navHasGallery))
chk('§0.2-2 官网正文无 4K/HDR', fe.bodyHas4K === false)
chk('§0.2-2 官网无播放量/时长数据', fe.durationPlay === false)
chk('§0.2-4 官网无左右切换箭头', fe.arrowChars.length === 0, JSON.stringify(fe.arrowChars))
const feStyle = JSON.parse(await c.ev(STYLE_SCAN))
chk('§0.2-3 官网页面上全部按钮/链接无渐变·外发光·内高光·装饰箭头', feStyle.bad.length === 0, `scanned=${feStyle.total} bad=${JSON.stringify(feStyle.bad)}`)
c.close()

// ---------- 后台 ----------
c = await open(`${AD}/dashboard`, 1440, 900, true)
await c.ev(`localStorage.clear()`).catch(() => {})
await c.send('Page.navigate', { url: `${AD}/login` })
for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,'admin@lightisle.studio');set(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
await new Promise(r => setTimeout(r, 2600))
const adNav = JSON.parse(await c.ev(`JSON.stringify([...document.querySelectorAll('aside nav a')].map(a=>a.innerText.trim()))`))
chk('§0.2-1 后台无「作品图集」模块', !adNav.some(x => /图集/.test(x)), JSON.stringify(adNav))
await c.ev(`location.href='/videos'`); await new Promise(r => setTimeout(r, 2800))
const adV = JSON.parse(await c.ev(`(() => {
  const t = document.querySelector('main').innerText;
  const heads = [...document.querySelectorAll('table thead th')].map(x=>x.innerText.trim());
  return JSON.stringify({ heads, hasPlayCount: /播放量|播放次数|观看数/.test(t), hasDuration: /时长/.test(t) });
})()`))
chk('§0.2-2 后台视频表无时长/播放量列', !adV.heads.some(h => /时长|播放量/.test(h)) && !adV.hasPlayCount, JSON.stringify(adV.heads))
const adStyle = JSON.parse(await c.ev(STYLE_SCAN))
chk('§0.2-3 后台页面按钮无渐变·外发光·内高光·装饰箭头', adStyle.bad.length === 0, `scanned=${adStyle.total} bad=${JSON.stringify(adStyle.bad)}`)
c.close()

console.log('='.repeat(50))
console.log(`§0.2 校验 RESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
