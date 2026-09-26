/** 第二轮 · 精修复核：顶栏按钮定位基准 + 移动端底部 Tab / 触摸目标明细
 *  用法：node round2_refine.mjs <cdpPort> <adminBase>
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
const go = async (c, r, ms = 3000) => { await c.evaluate(`location.href='${r}'`); await new Promise((x) => setTimeout(x, ms)) }

let pass = 0, fail = 0
const chk = (l, ok, d = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + l + (d ? ' :: ' + d : '')); ok ? pass++ : fail++ }

// ---------- 1) 顶栏按钮定位：与 TopBar 的右内边距基准对齐 ----------
let c = await loginAs('admin@jiaodianfilm.com', 'Admin@123456', 1440, 900)
await go(c, '/videos')
const geom = JSON.parse(await c.evaluate(`(() => {
  const pa = document.querySelector('#page-actions');
  const hdr = document.querySelector('header');
  const inner = hdr.firstElementChild;           // flex items-center justify-between ...
  const cs = getComputedStyle(inner);
  const paR = pa.getBoundingClientRect();
  const inR = inner.getBoundingClientRect();
  const hdrR = hdr.getBoundingClientRect();
  const btn = pa.querySelector('button').getBoundingClientRect();
  return JSON.stringify({
    viewportW: innerWidth,
    clientW: document.documentElement.clientWidth,
    headerH: Math.round(hdrR.height), headerTop: Math.round(hdrR.top),
    innerRight: +inR.right.toFixed(1), paddingRight: cs.paddingRight, paddingLeft: cs.paddingLeft,
    paRight: +paR.right.toFixed(1), paTop: +paR.top.toFixed(1), paH: +paR.height.toFixed(1),
    btnW: Math.round(btn.width), btnH: Math.round(btn.height),
    expectedRight: +(inR.right - parseFloat(cs.paddingRight)).toFixed(1),
    paIsLastChild: pa === inner.lastElementChild
  });
})()`))
console.log('\n[1] /videos @1440 顶栏几何:', JSON.stringify(geom))
chk('顶栏按钮右边缘 == 布局右内边距基准（innerRight - paddingRight）',
  Math.abs(geom.paRight - geom.expectedRight) <= 2, `paRight=${geom.paRight} expected=${geom.expectedRight} (padding=${geom.paddingRight})`)
chk('#page-actions 是 TopBar 右组的最后一个子节点（位置未变）', geom.paIsLastChild === true)
chk('顶栏高度为桌面态 h-topbar（≥64）', geom.headerH >= 64, String(geom.headerH))
chk('按钮尺寸为桌面 ad-btn（高 36）', geom.btnH === 36, `w=${geom.btnW} h=${geom.btnH}`)

// ---------- 2) 移动端底部 Tab 与触摸目标明细 ----------
c.close()
c = await loginAs('admin@jiaodianfilm.com', 'Admin@123456', 390, 780)
const DETAIL = `(() => {
  const vis = e => { const r = e.getBoundingClientRect(); return e.offsetParent !== null && r.width > 0 && r.height > 0 };
  // 底部 Tab：可见、位于视口底部 140px 内、且含 4+ 个导航项
  const bars = [...document.querySelectorAll('nav, footer, div')].filter(e => {
    if (!vis(e)) return false;
    const r = e.getBoundingClientRect();
    if (r.top < innerHeight - 140) return false;
    const items = [...e.querySelectorAll('a,button')].filter(vis);
    return items.length >= 4 && items.length <= 6;
  });
  const bar = bars.sort((a,b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0] || null;
  const barInfo = bar ? {
    h: Math.round(bar.getBoundingClientRect().height),
    cls: (bar.className||'').toString().slice(0,60),
    items: [...bar.querySelectorAll('a,button')].filter(vis).map(e => { const r = e.getBoundingClientRect(); return { t: (e.innerText||'').trim().slice(0,6), w: Math.round(r.width), h: Math.round(r.height) } })
  } : null;
  // 触摸目标明细
  const all = [...document.querySelectorAll('button, a, input[type=checkbox], [role=button]')].filter(vis);
  const small = all.map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName.toLowerCase(), cls: (e.className||'').toString().slice(0,42), t: (e.innerText||'').trim().slice(0,10), w: Math.round(r.width), h: Math.round(r.height) } }).filter(x => x.w < 44 || x.h < 44);
  const byKey = {};
  for (const s of small) { const k = s.tag + '|' + s.w + 'x' + s.h + '|' + (s.t||s.cls.slice(0,18)); byKey[k] = (byKey[k]||0)+1; }
  return JSON.stringify({ bar: barInfo, total: all.length, smallCount: small.length, smallKinds: byKey });
})()`
const mob = []
for (const r of ['/videos', '/distributions', '/honors', '/members', '/leads']) {
  await go(c, r, 3200)
  const d = JSON.parse(await c.evaluate(DETAIL))
  mob.push({ r, ...d })
  console.log(`\n[2] ${r} 底部Tab=${JSON.stringify(d.bar)}  触摸目标 ${d.total - d.smallCount}/${d.total} 达标`)
  const kinds = Object.entries(d.smallKinds).sort((a, b) => b[1] - a[1]).slice(0, 6)
  for (const [k, n] of kinds) console.log(`     <44 : ${n} × ${k}`)
}
chk('5 个列表页均存在可见底部 Tab 且高度 ≈64', mob.every((m) => m.bar && Math.abs(m.bar.h - 64) <= 8), JSON.stringify(mob.map((m) => [m.r, m.bar && m.bar.h])))
chk('底部 Tab 各导航项触摸目标 ≥44×44', mob.every((m) => m.bar && m.bar.items.every((i) => i.w >= 44 && i.h >= 44)), JSON.stringify(mob[0].bar && mob[0].bar.items))
const worst = mob.map((m) => [m.r, m.smallCount, m.total])
chk('列表页内所有可交互元素触摸目标均 ≥44×44', mob.every((m) => m.smallCount === 0), JSON.stringify(worst))

console.log('\n' + '='.repeat(56))
console.log(`精修复核 RESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
