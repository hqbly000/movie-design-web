// 定点复核：①板块编辑弹框「客户端不可见」②选择视频弹框内容 ③viewer 按钮禁用态 ④/leads 原始报错
const DEBUG = 'http://127.0.0.1:9223'
const BASE = process.argv[2] || 'http://127.0.0.1:5174'
const SHIM = `(() => { const o = Document.prototype.querySelector; Document.prototype.querySelector = function (s) { if (s === '#page-actions' && !this.querySelectorAll('#page-actions').length) { const d = this.createElement('div'); d.id = 'page-actions'; d.setAttribute('style','position:fixed;top:10px;right:16px;z-index:60'); (this.body||this.documentElement).appendChild(d); } return o.call(this, s); }; })()`
class CDP {
  constructor(ws) { this.ws = ws; this.seq = 0; this.p = new Map()
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && this.p.has(m.id)) { const { r, j } = this.p.get(m.id); this.p.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result) } } }
  static async c(u) { const ws = new WebSocket(u); await new Promise((a, b) => { ws.onopen = a; ws.onerror = () => b(new Error('ws')) }); return new CDP(ws) }
  send(m, pr = {}) { const id = ++this.seq; return new Promise((r, j) => { this.p.set(id, { r, j }); this.ws.send(JSON.stringify({ id, method: m, params: pr })) }) }
  async ev(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result?.value }
  close() { try { this.ws.close() } catch {} }
}
async function login(email, pwd) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json())
  const c = await CDP.c(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM })
  await c.send('Page.navigate', { url: `${BASE}/login` })
  await new Promise(r => setTimeout(r, 1500))
  await c.ev(`localStorage.clear(); sessionStorage.clear()`)
  await c.send('Page.navigate', { url: `${BASE}/login` })
  for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 250)); if (await c.ev(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
  await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,${JSON.stringify(email)});set(p,${JSON.stringify(pwd)});document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise(r => setTimeout(r, 2600))
  return c
}
const go = async (c, r, ms = 2600) => { await c.ev(`location.href='${r}'`); await new Promise(x => setTimeout(x, ms)) }

// ---------- ① 板块编辑弹框 ----------
let c = await login('admin@jiaodianfilm.com', 'Admin@123456')
await go(c, '/segments')
const seg = JSON.parse(await c.ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = { cards: document.querySelectorAll('article, .ad-card').length };
  const btn = [...document.querySelectorAll('button')].find(b => /编辑|设置/.test(b.innerText));
  out.hasEditBtn = !!btn;
  btn?.click(); await sleep(900);
  const dlg = [...document.querySelectorAll('[role=dialog]')].pop();
  out.dlgOpen = !!dlg;
  if (dlg) {
    out.text = dlg.innerText.replace(/\\n+/g, ' | ').slice(0, 400);
    out.hasClientInvisible = dlg.innerText.includes('客户端不可见');
    out.types = ['有视频','图集','文章'].filter(x => dlg.innerText.includes(x));
    out.labels = [...dlg.querySelectorAll('label')].map(l => l.innerText.replace(/\\s+/g,' ').trim());
  }
  return JSON.stringify(out);
})()`))
console.log('① 板块编辑弹框:', JSON.stringify(seg, null, 1))

// ---------- ② 选择视频弹框 ----------
await go(c, '/distributions')
const pick = JSON.parse(await c.ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  [...document.querySelectorAll('button')].find(b => b.innerText.includes('新建分发'))?.click(); await sleep(800);
  const dlg = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('新建分发'));
  [...dlg.querySelectorAll('button')].find(b => b.innerText.includes('选择视频'))?.click(); await sleep(1500);
  const pk = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('选择视频') && !d.innerText.includes('新建分发'));
  out.open = !!pk;
  if (pk) { out.text = pk.innerText.replace(/\\n+/g, ' | ').slice(0, 500); out.html = pk.innerHTML.replace(/\\s+/g,' ').slice(0, 300); }
  return JSON.stringify(out);
})()`))
console.log('② 选择视频弹框:', JSON.stringify(pick, null, 1))
c.close()

// ---------- ③ viewer 按钮禁用态 ----------
c = await login('viewer@jiaodianfilm.com', 'Viewer@123456')
await go(c, '/videos')
const vw = JSON.parse(await c.ev(`(async () => {
  const btns = [...document.querySelectorAll('#page-actions button')].map(b => ({ t: b.innerText.trim(), disabled: b.disabled, cls: b.className, pe: getComputedStyle(b).pointerEvents, aria: b.getAttribute('aria-disabled') }));
  const rowBtns = [...document.querySelectorAll('table tbody tr')].slice(0,1).flatMap(tr => [...tr.querySelectorAll('button')].map(b => b.innerText.trim()));
  const rowDisabled = [...document.querySelectorAll('table tbody tr')].slice(0,1).flatMap(tr => [...tr.querySelectorAll('button')].map(b => b.disabled));
  return JSON.stringify({ btns, rowBtns, rowDisabled, hint: /只读/.test(document.querySelector('main').innerText) });
})()`))
console.log('③ viewer /videos:', JSON.stringify(vw))
c.close()

// ---------- ④ /leads 原始报错 ----------
c = await login('admin@jiaodianfilm.com', 'Admin@123456')
await go(c, '/leads')
const leads = JSON.parse(await c.ev(`JSON.stringify({ text: document.querySelector('main').innerText.replace(/\\n+/g,' | ').slice(0, 300), errs: [...document.querySelectorAll('.ad-field-error')].map(e => e.innerText.trim()) })`))
console.log('④ /leads:', JSON.stringify(leads, null, 1))
c.close()
process.exit(0)
