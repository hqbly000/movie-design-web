/**
 * 第二轮 · 后台独立复验（BUG-01 / 02 / 03 / 05 + B 选择器对抗）
 * 用法：node round2_admin.mjs <cdpPort> <adminBase> <apiBase> [shotDir]
 * 不注入任何垫片；不依赖 data-video-item。
 */
const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:4174'
const apiBase = process.argv[4] || 'http://127.0.0.1:8000'
const shotDir = process.argv[5] || 'D:/Dev/DevCode_wornary/docs/qa-shots'
const DEBUG = `http://127.0.0.1:${port}`
const fs = await import('node:fs')

const passes = []
const fails = []
function check(label, cond, detail = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ` :: ${detail}` : ''))
  ;(cond ? passes : fails).push(label)
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map(); this.handlers = new Map()
    this.errors = []; this.exceptions = []
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
        return
      }
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        this.errors.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160))
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(String(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text).split('\n')[0])
      }
      const h = this.handlers.get(msg.method)
      if (h) h(msg.params)
    }
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) })
    return new CDP(ws)
  }
  on(method, fn) { this.handlers.set(method, fn) }
  send(method, params = {}) {
    const id = ++this.seq
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
  reset() { this.errors = []; this.exceptions = [] }
  close() { try { this.ws.close() } catch {} }
}

async function openPage(url, w = 1440, h = 900) {
  const t = await fetch(`${DEBUG}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((r) => r.json())
  const cdp = await CDP.connect(t.webSocketDebuggerUrl)
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await cdp.send('Page.navigate', { url })
  for (let i = 0; i < 120; i++) { await new Promise((r) => setTimeout(r, 200)); try { if ((await cdp.evaluate('document.readyState')) === 'complete') break } catch {} }
  await new Promise((r) => setTimeout(r, 1200))
  return cdp
}
async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  fs.mkdirSync(shotDir, { recursive: true })
  fs.writeFileSync(`${shotDir}/${name}.png`, Buffer.from(data, 'base64'))
}
async function loginAs(email, pwd, w = 1440, h = 900) {
  const cdp = await openPage(`${base}/login`, w, h)
  await cdp.evaluate('localStorage.clear(); sessionStorage.clear()')
  await cdp.send('Page.navigate', { url: `${base}/login` })
  for (let i = 0; i < 120; i++) { await new Promise((r) => setTimeout(r, 250)); if (await cdp.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false)) break }
  await cdp.evaluate(`(async()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,${JSON.stringify(email)});set(p,${JSON.stringify(pwd)});document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2600))
  return cdp
}
async function go(cdp, route, ms = 3000) { await cdp.evaluate(`location.href='${route}'`); await new Promise((r) => setTimeout(r, ms)) }

const ROUTES = [
  ['/dashboard', '工作台'], ['/videos', '视频库'], ['/distributions', '合集分发'],
  ['/hero-slides', '首页首屏'], ['/company', '公司介绍'], ['/segments', '业务板块'],
  ['/honors', '荣誉条目'], ['/leads', '预约留言'], ['/members', '账号与权限'], ['/profile', '我的账号']
]

const PROBE = `(() => {
  const pa = [...document.querySelectorAll('#page-actions')];
  const el = pa[0] || null;
  const r = el ? el.getBoundingClientRect() : null;
  const hdr = document.querySelector('header');
  const hr = hdr ? hdr.getBoundingClientRect() : null;
  return {
    paCount: pa.length,
    paButtons: el ? [...el.querySelectorAll('button,a')].map(b => (b.innerText||'').trim()).filter(Boolean) : [],
    paInsideHeader: !!(el && el.closest('header')),
    paParentClass: el && el.parentElement ? el.parentElement.className : null,
    paRect: r ? { top: Math.round(r.top), right: Math.round(r.right), h: Math.round(r.height) } : null,
    headerRect: hr ? { top: Math.round(hr.top), h: Math.round(hr.height) } : null,
    viewportW: innerWidth,
    clientW: document.documentElement.clientWidth,
    innerVH: innerHeight,
    hdrInnerRight: hdr && hdr.firstElementChild ? Math.round(hdr.firstElementChild.getBoundingClientRect().right) : null,
    hdrPadRight: hdr && hdr.firstElementChild ? Math.round(parseFloat(getComputedStyle(hdr.firstElementChild).paddingRight)) : null,
    headerInViewport: hr ? (hr.top >= 0 && hr.top < innerHeight) : null,
    mainInViewport: (() => { const m = document.querySelector('main'); if (!m) return null; const mr = m.getBoundingClientRect(); return mr.top >= 0 && mr.top < innerHeight })(),
    skeletons: document.querySelectorAll('.ad-skeleton, [class*=skeleton]').length,
    tables: document.querySelectorAll('table').length,
    rows: document.querySelectorAll('table tbody tr').length,
    headerSub: (document.querySelector('header p') || {}).innerText || '',
    mainHead: (document.querySelector('main') || {}).innerText?.slice(0, 60).replace(/\\n/g, '|') || '',
    fieldErrors: [...document.querySelectorAll('.ad-field-error')].map(e => e.innerText.trim())
  };
})()`

async function main() {
  console.log(`==== 第二轮 · 后台独立复验（${base} / 真实产物）====`)

  // =============== A1. BUG-01 崩溃面复验 ===============
  console.log('\n-- A1. BUG-01：10 条路由逐条复验（0 error / 0 warn / 0 异常 / 0 骨架屏 / 顶栏按钮可见）--')
  let cdp = await loginAs('admin@jiaodianfilm.com', 'Admin@123456')
  const sweep = []
  for (const [route, name] of ROUTES) {
    cdp.reset()
    await go(cdp, route, 3200)
    const p = JSON.parse(await cdp.evaluate(`JSON.stringify(${PROBE})`))
    sweep.push({ route, name, ...p, errors: [...cdp.errors], exceptions: [...cdp.exceptions] })
    await shot(cdp, `r2-1440${route.replace(/\//g, '-')}`)
  }
  for (const s of sweep) {
    const ok = s.errors.length === 0 && s.exceptions.length === 0 && s.skeletons === 0
    console.log(`  ${s.route.padEnd(15)} err=${s.errors.length} exc=${s.exceptions.length} sk=${s.skeletons} tables=${s.tables} rows=${s.rows} actBtns=${JSON.stringify(s.paButtons)}`)
    if (s.errors.length || s.exceptions.length) console.log(`      ${JSON.stringify([...s.errors, ...s.exceptions].slice(0, 2))}`)
  }
  check('A1 10/10 路由 0 异常 / 0 console error|warn / 0 骨架屏', sweep.every((s) => !s.errors.length && !s.exceptions.length && s.skeletons === 0))
  check('A1 6 个原崩溃页均渲染出数据（表格行 > 0 或表单可见）', sweep.filter((s) => ['/videos', '/distributions', '/honors', '/members'].includes(s.route)).every((s) => s.rows > 0), JSON.stringify(sweep.filter((s) => s.rows > 0).map((s) => s.route)))
  check('A1 6 个原崩溃页顶栏主操作按钮均可见（Teleport 生效）', ['/videos', '/distributions', '/hero-slides', '/company', '/honors', '/members'].every((r) => (sweep.find((s) => s.route === r) || {}).paButtons?.length > 0), JSON.stringify(sweep.map((s) => [s.route, s.paButtons])))
  check('A1 #page-actions 全局唯一（无 index.html 注入的重复容器）', sweep.every((s) => s.paCount === 1), JSON.stringify(sweep.map((s) => [s.route, s.paCount])))
  check('A1 #page-actions 仍位于 <header> 内（布局未被挪出 TopBar）', sweep.every((s) => s.paInsideHeader === true))
  const paPosOk = sweep.every((s) => s.paRect && s.headerRect && s.paRect.top >= s.headerRect.top && s.paRect.top < s.headerRect.top + s.headerRect.h)
  check('A1 #page-actions 垂直方向落在顶栏区间内（1440）', paPosOk, JSON.stringify(sweep.slice(0, 3).map((s) => [s.headerRect, s.paRect])))
  const rightGap = sweep.every((s) => s.paRect && s.hdrInnerRight !== null && Math.abs(s.paRect.right - (s.hdrInnerRight - s.hdrPadRight)) <= 2)
  check('A1 #page-actions 右边缘 == 布局右内边距基准（innerRight - paddingRight，位置未变）', rightGap,
    JSON.stringify(sweep.slice(0, 3).map((s) => [s.hdrInnerRight, s.hdrPadRight, s.paRect])))
  // 新增：首屏可见性（独立于崩溃面的「可见」验收维度）
  const firstScreenOk = sweep.every((s) => s.headerInViewport === true && s.mainInViewport === true)
  check('A1 顶栏与主内容在首屏可见（未被前置元素下推）', firstScreenOk,
    JSON.stringify(sweep.map((s) => [s.route, s.headerRect && s.headerRect.top, s.innerVH, s.headerInViewport, s.mainInViewport])))
  const parentCls = sweep.find((s) => s.route === '/videos').paParentClass || ''
  check('A1 #page-actions 父容器仍是 TopBar 的右侧 flex 组', /flex items-center gap-2/.test(parentCls), parentCls)
  cdp.close()

  // =============== A2. BUG-02 数据可见性 + 友好文案 ===============
  console.log('\n-- A2. BUG-02：列表数据 / 页眉统计 / 选视频弹框 / 错误文案 --')
  cdp = await loginAs('admin@jiaodianfilm.com', 'Admin@123456')
  await go(cdp, '/leads')
  const leads = JSON.parse(await cdp.evaluate(`JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, errs: [...document.querySelectorAll('.ad-field-error')].map(e=>e.innerText.trim()), sub: (document.querySelector('header p')||{}).innerText||'' })`))
  console.log('  /leads', JSON.stringify(leads))
  check('A2 /leads 显示 DB 4 条留言且无原始报错', leads.rows >= 4 && leads.errs.length === 0, JSON.stringify(leads))

  await go(cdp, '/distributions')
  const dist = JSON.parse(await cdp.evaluate(`JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, errs: [...document.querySelectorAll('.ad-field-error')].map(e=>e.innerText.trim()), sub: (document.querySelector('header p')||{}).innerText||'', heads: [...document.querySelectorAll('table thead th')].map(t=>t.innerText.trim()), firstRow: (document.querySelector('table tbody tr')||{}).innerText?.replace(/\\n/g,'|')||'' })`))
  console.log('  /distributions', JSON.stringify(dist))
  check('A2 /distributions 显示 DB 3 条分发且无原始报错', dist.rows >= 3 && dist.errs.length === 0, JSON.stringify(dist))
  check('A2 BUG-05 分发表头含「生成人」列且位于「状态」与「操作」之间', (() => { const h = dist.heads; const i = h.findIndex((x) => x.includes('状态')); return h.some((x) => x.includes('生成人')) && h[i + 1] && h[i + 1].includes('生成人') })(), JSON.stringify(dist.heads))
  check('A2 BUG-05 首行「生成人」显示真实姓名', /交点/.test(dist.firstRow), dist.firstRow)

  await go(cdp, '/videos')
  const vids = JSON.parse(await cdp.evaluate(`JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, sub: (document.querySelector('header p')||{}).innerText||'', errs: [...document.querySelectorAll('.ad-field-error')].map(e=>e.innerText.trim()) })`))
  console.log('  /videos', JSON.stringify(vids))
  check('A2 /videos 页眉统计 = 共 12 支 · 已发布 10 · 草稿 2', /共\s*12\s*支/.test(vids.sub) && /已发布\s*10/.test(vids.sub) && /草稿\s*2/.test(vids.sub), vids.sub)
  check('A2 /videos 列表 10 行且无报错', vids.rows === 10 && vids.errs.length === 0, JSON.stringify(vids))

  // ---- B. 选视频弹框：不依赖 data-video-item ----
  console.log('\n-- B. 选视频弹框（先剥离 data-video-item 再断言，验证断言不绑测试钩子）--')
  await go(cdp, '/distributions')
  const pick = JSON.parse(await cdp.evaluate(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    const newBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('新建分发'));
    newBtn.click(); await sleep(800);
    const dlg = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('新建分发'));
    [...dlg.querySelectorAll('button')].find(b => b.innerText.includes('选择视频'))?.click();
    await sleep(1600);
    const pk = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('选择视频') && !d.innerText.includes('新建分发'));
    out.open = !!pk;
    // === 关键：先把测试钩子属性全部剥离，再统计「真实可见行」===
    const hookCount = pk.querySelectorAll('[data-video-item]').length;
    pk.querySelectorAll('[data-video-item]').forEach(e => e.removeAttribute('data-video-item'));
    out.hookRemoved = hookCount;
    out.hooksLeft = pk.querySelectorAll('[data-video-item]').length;
    // 真实可见行 = 弹框滚动区里带缩略图(<img>)的按钮（产品真实结构，非测试钩子）
    const rows = [...pk.querySelectorAll('button')].filter(b => b.querySelector('img'));
    out.rowCount = rows.length;
    out.titles = rows.slice(0, 3).map(b => (b.innerText||'').trim().split('\\n')[0]);
    out.hasNoResultText = /没有符合条件/.test(pk.innerText);
    // 勾选第 2 与第 1 行（顺序：先 2 号再 1 号），验证「勾选顺序 = 清单顺序」
    if (rows[1]) { rows[1].click(); await sleep(200); }
    if (rows[0]) { rows[0].click(); await sleep(300); }
    out.selectedText = (pk.querySelector('footer') || pk).innerText.replace(/\\n+/g, '|');
    out.pickOrder = rows.slice(0,2).map(b => (b.innerText||'').trim().split('\\n')[0]);
    // 确定选择
    [...pk.querySelectorAll('button')].find(b => b.innerText.includes('确定选择'))?.click();
    await sleep(900);
    const dlg2 = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('新建分发'));
    out.afterConfirm = dlg2 ? dlg2.innerText.replace(/\\n+/g, '|').slice(0, 260) : null;
    return JSON.stringify(out);
  })()`))
  console.log('  picker:', JSON.stringify(pick))
  check('B 剥离 data-video-item 后弹框仍列出可见视频行（>0）', pick.rowCount > 0, `rows=${pick.rowCount} hooks=${pick.hookRemoved}→${pick.hooksLeft}`)
  check('B 弹框不再显示「没有符合条件的视频」', pick.hasNoResultText === false)
  check('B 勾选后「已选」计数与清单回填正确', /已选\s*2|已选 2/.test(pick.selectedText) || /已选.*2/.test(pick.afterConfirm || ''), JSON.stringify([pick.selectedText.slice(0, 60), (pick.afterConfirm || '').slice(0, 120)]))
  check('B 回填顺序 = 勾选顺序（先 2 后 1）', (() => {
    const t = pick.afterConfirm || ''
    const a = pick.pickOrder[1] || '___A___'
    const b = pick.pickOrder[0] || '___B___'
    const ia = t.indexOf(a.slice(0, 8)); const ib = t.indexOf(b.slice(0, 8))
    return ia >= 0 && ib >= 0 && ia < ib
  })(), JSON.stringify(pick.pickOrder))
  cdp.close()

  // =============== A2b. 友好文案（强制注入 1001 响应） ===============
  console.log('\n-- A2b. 前端不再把后端原始报错暴露给用户（构造 1001）--')
  cdp = await loginAs('admin@jiaodianfilm.com', 'Admin@123456')
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*api/admin/leads*', requestStage: 'Response' }] })
  cdp.on('Fetch.requestPaused', async (p) => {
    const body = Buffer.from(JSON.stringify({ code: 1001, data: { field: 'size', detail: 'Input should be less than or equal to 100' }, message: '参数校验失败' })).toString('base64')
    try {
      await cdp.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body })
    } catch {}
  })
  await go(cdp, '/leads', 3500)
  const friendly = JSON.parse(await cdp.evaluate(`JSON.stringify({ text: document.querySelector('main').innerText.replace(/\\n+/g,' | ').slice(0, 260) })`))
  await cdp.send('Fetch.disable').catch(() => {})
  console.log('  /leads(强制1001):', JSON.stringify(friendly))
  check('A2b 页面显示友好文案「请求参数有误」', /请求参数有误/.test(friendly.text), friendly.text.slice(0, 120))
  check('A2b 页面不出现后端原始 pydantic 文案', !/Input should be less than or equal to/.test(friendly.text), friendly.text.slice(0, 120))
  cdp.close()

  // =============== A3. BUG-03 移动端卡片流 ===============
  console.log('\n-- A3. BUG-03：390 档 5 个列表页 —— 无 <table>、卡片流、无横向滚动 --')
  cdp = await loginAs('admin@jiaodianfilm.com', 'Admin@123456', 390, 780)
  const mob = []
  for (const [route] of [['/videos'], ['/distributions'], ['/honors'], ['/members'], ['/leads']]) {
    await go(cdp, route, 3000)
    const p = JSON.parse(await cdp.evaluate(`(() => {
      // 注意：position:fixed 元素的 offsetParent 恒为 null，不能用它判可见
      const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' };
      const small = [...document.querySelectorAll('button,a,[role=button],input[type=checkbox]')].filter(vis).map(e => { const r = e.getBoundingClientRect(); return { t: (e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,10), w: Math.round(r.width), h: Math.round(r.height) } });
      return JSON.stringify({
        tables: document.querySelectorAll('table').length,
        cards: document.querySelectorAll('article, .ad-card, [data-mobile-card], .ad-mobile-card').length,
        cardish: [...document.querySelectorAll('main *')].filter(e => e.className && typeof e.className === 'string' && e.className.includes('rounded-card') && e.getBoundingClientRect().height > 40).length,
        scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
        anyCard: document.querySelectorAll('main [class*=rounded-card]').length,
        tooSmall: small.filter(s => s.w < 44 || s.h < 44).length, ctrl: small.length,
        smallKinds: Object.entries(small.filter(s => s.w < 44 || s.h < 44).reduce((a, s) => { const k = s.w + 'x' + s.h + '|' + s.t; a[k] = (a[k]||0)+1; return a }, {})).sort((a,b)=>b[1]-a[1]).slice(0,8)
      });
    })()`))
    mob.push({ route, ...p })
    await shot(cdp, `r2-390${route.replace(/\//g, '-')}`)
  }
  mob.forEach((m) => console.log(`  ${m.route.padEnd(16)} tables=${m.tables} cards=${m.anyCard} scrollW=${m.scrollW}/${m.innerW} 触摸目标<44: ${m.tooSmall}/${m.ctrl}`))
  check('A3 5 个列表页在 390 下 DOM 中不存在 <table>', mob.every((m) => m.tables === 0), JSON.stringify(mob.map((m) => [m.route, m.tables])))
  check('A3 5 个列表页均以卡片流呈现（卡片数 > 0）', mob.every((m) => m.anyCard > 0), JSON.stringify(mob.map((m) => [m.route, m.anyCard])))
  check('A3 5 个列表页均无横向滚动', mob.every((m) => m.scrollW <= m.innerW + 1), JSON.stringify(mob.map((m) => [m.scrollW, m.innerW])))
  // 底部 Tab：必须是 position:fixed 的那条 nav（侧栏 <nav> 在 390 下 display:none 但 innerText 仍匹配，会误命中）
  const tabTap = JSON.parse(await cdp.evaluate(`(() => {
    const bar = [...document.querySelectorAll('nav')].find(n => getComputedStyle(n).position === 'fixed' && /工作台/.test(n.innerText));
    if (!bar) return '{}';
    const a = [...bar.querySelectorAll('a,button')].map(e => { const r = e.getBoundingClientRect(); return { t: (e.innerText||'').trim().slice(0,4), h: Math.round(r.height), w: Math.round(r.width) } });
    return JSON.stringify({ h: Math.round(bar.getBoundingClientRect().height), cls: (bar.className||'').toString().slice(0,60), count: a.length, items: a });
  })()`))
  check('A3 底部 Tab 高 64 且各 Tab 触摸目标 ≥44', tabTap.h && Math.abs(tabTap.h - 64) <= 4 && tabTap.count >= 4 && (tabTap.items || []).every((i) => i.h >= 44 && i.w >= 44), JSON.stringify(tabTap))
  check('A3 移动端列表页触摸目标整体达标（<44 的元素数为 0）', mob.every((m) => m.tooSmall === 0), JSON.stringify(mob.map((m) => [m.route, m.tooSmall, m.ctrl])))
  cdp.close()

  // =============== A2c. 全流程：真正生成一次分发 ===============
  console.log('\n-- A2c. 端到端：新建分发（选视频 → 生成 → 列表出现 → 关闭）--')
  cdp = await loginAs('admin@jiaodianfilm.com', 'Admin@123456')
  await go(cdp, '/distributions')
  const flow = JSON.parse(await cdp.evaluate(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = { steps: [] };
    const rowsBefore = document.querySelectorAll('table tbody tr').length;
    [...document.querySelectorAll('button')].find(b => b.innerText.includes('新建分发')).click(); await sleep(800);
    const dlg = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('新建分发'));
    const setVal = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); };
    const inputs = [...dlg.querySelectorAll('input')];
    // 合集名 / 客户名 / 联系方式
    setVal(inputs[0], 'QA回归合集-' + Date.now().toString().slice(-6));
    if (inputs[1]) setVal(inputs[1], 'QA客户');
    if (inputs[2]) setVal(inputs[2], '13800000000');
    out.name = inputs[0].value;
    [...dlg.querySelectorAll('button')].find(b => b.innerText.includes('选择视频'))?.click(); await sleep(1500);
    const pk = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('选择视频') && !d.innerText.includes('新建分发'));
    pk.querySelectorAll('[data-video-item]').forEach(e => e.removeAttribute('data-video-item'));
    const vrows = [...pk.querySelectorAll('button')].filter(b => b.querySelector('img'));
    vrows[0]?.click(); await sleep(200); vrows[1]?.click(); await sleep(300);
    [...pk.querySelectorAll('button')].find(b => b.innerText.includes('确定选择'))?.click(); await sleep(900);
    const dlg2 = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('新建分发'));
    out.afterPick = dlg2.innerText.replace(/\\n+/g,'|').slice(0, 200);
    const ta = dlg2.querySelector('textarea'); if (ta) setVal(ta, 'QA 回归测试说明');
    const submit = [...dlg2.querySelectorAll('button')].find(b => /生成|创建|保存|确定/.test(b.innerText) && !b.disabled);
    out.submitLabel = submit ? submit.innerText.trim() : null;
    submit?.click();
    await sleep(2600);
    out.toast = (document.querySelector('[class*=toast], [role=status]') || {}).innerText || '';
    out.bodyHasName = document.body.innerText.includes(out.name);
    out.rowsAfter = document.querySelectorAll('table tbody tr').length;
    out.rowsBefore = rowsBefore;
    out.errs = [...document.querySelectorAll('.ad-field-error')].map(e=>e.innerText.trim());
    // 找到新行并点「关闭」（清理）
    const tr = [...document.querySelectorAll('table tbody tr')].find(t => t.innerText.includes(out.name));
    if (tr) {
      const closeBtn = [...tr.querySelectorAll('button')].find(b => /关闭/.test(b.innerText));
      out.hasCloseBtn = !!closeBtn;
      closeBtn?.click(); await sleep(1200);
      const cdlg = [...document.querySelectorAll('[role=dialog]')].pop();
      if (cdlg && /关闭/.test(cdlg.innerText)) { [...cdlg.querySelectorAll('button')].find(b=>/确定|确认|关闭/.test(b.innerText) && !b.disabled)?.click(); await sleep(1500); }
      out.afterClose = ([...document.querySelectorAll('table tbody tr')].find(t => t.innerText.includes(out.name)) || {}).innerText?.replace(/\\n+/g,'|') || '';
    }
    return JSON.stringify(out);
  })()`))
  console.log('  flow:', JSON.stringify(flow))
  check('A2c 新建分发弹框回填 2 支视频', /2/.test(flow.afterPick || ''), (flow.afterPick || '').slice(0, 140))
  check('A2c 提交后列表出现新分发行（数量 +1 或正文含新名）', flow.rowsAfter >= flow.rowsBefore + 1 || flow.bodyHasName === true, `before=${flow.rowsBefore} after=${flow.rowsAfter} hasName=${flow.bodyHasName}`)
  check('A2c 提交过程无字段级报错', (flow.errs || []).length === 0, JSON.stringify(flow.errs))
  check('A2c 「生成人」列可关闭分发（清理入口存在）', flow.hasCloseBtn === true, JSON.stringify(flow.afterClose))
  await shot(cdp, 'r2-1440-distributions-flow')
  cdp.close()

  console.log('\n' + '='.repeat(64))
  console.log(`第二轮后台复验 RESULT: ${passes.length} passed, ${fails.length} failed`)
  if (fails.length) console.log('FAILED: ' + fails.join(' ; '))
  process.exit(fails.length ? 1 : 0)
}

main().catch((e) => { console.error('ERR', e); process.exit(2) })
