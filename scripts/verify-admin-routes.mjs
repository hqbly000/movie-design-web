/**
 * 管理后台 · 全路由健康扫描（桌面 1440 + 移动 390）
 * 断言：0 console error / 0 异常 / 0 残留骨架屏 / 顶栏主操作按钮在视口内 / 无横向滚动 / 卡片流（移动端）
 * 用法：node scripts/verify-admin-routes.mjs <cdpPort> <base>
 *  例：node scripts/verify-admin-routes.mjs 9223 http://127.0.0.1:4174
 */
import fs from 'node:fs'

const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:4174'
const DEBUG = `http://127.0.0.1:${port}`
const SHOTS = 'docs/qa-shots'
fs.mkdirSync(SHOTS, { recursive: true })

class CDP {
  constructor(ws) {
    this.ws = ws
    this.seq = 0
    this.pending = new Map()
    this.errors = []
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
        const t = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')
        this.errors.push(`${m.params.type}: ${t.slice(0, 200)}`)
      }
      if (m.method === 'Runtime.exceptionThrown') {
        this.errors.push(`exception: ${(m.params.exceptionDetails?.exception?.description || '').slice(0, 200)}`)
      }
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
      }
    }
  }
  static async connect(u) {
    const ws = new WebSocket(u)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) })
    return new CDP(ws)
  }
  send(method, params = {}) {
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async evaluate(x) {
    const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval ' + (r.exceptionDetails.exception?.description || ''))
    return r.result.value
  }
  async shot(name) {
    const d = (await this.send('Page.captureScreenshot', { format: 'png' })).data
    fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(d, 'base64'))
  }
  close() { try { this.ws.close() } catch {} }
}

const ROUTES = [
  ['dashboard', '工作台'], ['videos', '视频库'], ['distributions', '合集分发'],
  ['hero-slides', '首页首屏'], ['company', '公司介绍'], ['segments', '业务板块'],
  ['honors', '荣誉条目'], ['leads', '预约留言'], ['members', '账号与权限'], ['profile', '我的']
]

async function login(c) {
  await c.send('Page.navigate', { url: `${base}/login` })
  await new Promise((r) => setTimeout(r, 1500))
  try { await c.evaluate('localStorage.clear()') } catch {}
  await c.send('Page.navigate', { url: `${base}/login` })
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 250))
    if (await c.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break
  }
  const ok = await c.evaluate(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');if(!e||!p)return 0;const s=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};s(e,'admin@jiaodianfilm.com');s(p,'Admin@123456');document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2600))
  return ok
}

const PROBE = `(() => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height) } };
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  const pa = document.querySelector('#page-actions');
  const par = pa ? pa.getBoundingClientRect() : null;
  return JSON.stringify({
    path: location.pathname,
    headerY: R(header)?.y ?? null,
    mainY: R(main)?.y ?? null,
    skeletons: document.querySelectorAll('.ad-skeleton').length,
    rows: document.querySelectorAll('table tbody tr').length,
    cards: document.querySelectorAll('article').length,
    tables: document.querySelectorAll('table').length,
    actionBtn: pa ? { text: pa.innerText.trim().replace(/\\s+/g,' ').slice(0,20), y: Math.round(par.y), inViewport: par.y >= 0 && par.y < innerHeight } : null,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth
  });
})()`

async function scan(width, height, tag, mobile) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const c = await CDP.connect(t.webSocketDebuggerUrl)
  await c.send('Page.enable'); await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  const logged = await login(c)
  const out = []
  for (const [route, label] of ROUTES) {
    c.errors.length = 0
    await c.evaluate(`window.__r=1; history.pushState({},'','/${route}'); location.href='/${route}'`)
    await new Promise((r) => setTimeout(r, 2600))
    const p = JSON.parse(await c.evaluate(PROBE))
    const errs = [...c.errors]
    const pass =
      errs.length === 0 &&
      p.skeletons === 0 &&
      (!p.actionBtn || p.actionBtn.inViewport) &&
      !p.hScroll &&
      (mobile ? p.tables === 0 : true)
    out.push({ tag, route, label, ...p, errors: errs.slice(0, 3), pass })
    await c.shot(`lead-${tag}-${route}`)
  }
  c.close()
  return { logged, out }
}

let pass = 0, fail = 0
for (const [w, h, tag, mobile] of [[1440, 900, '1440', false], [390, 844, '390', true]]) {
  const { out } = await scan(w, h, tag, mobile)
  console.log(`\n===== ${tag}x${h} =====`)
  for (const r of out) {
    r.pass ? pass++ : fail++
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} /${r.route.padEnd(14)} headerY=${String(r.headerY).padStart(4)} mainY=${String(r.mainY).padStart(4)} ` +
      `skel=${r.skeletons} rows=${String(r.rows).padStart(2)} cards=${String(r.cards).padStart(2)} tables=${r.tables} ` +
      `btn=${r.actionBtn ? r.actionBtn.text + '@' + r.actionBtn.y : '-'} hScroll=${r.hScroll} err=${r.errors.length}`
    )
    r.errors.forEach((e) => console.log('        ! ' + e))
  }
}
console.log(`\n===== TOTAL: PASS ${pass} / FAIL ${fail} =====`)
process.exit(fail === 0 ? 0 : 1)
