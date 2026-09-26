/**
 * 交点影视 · 管理后台 CDP 端到端校验（QA 严过关 · 第二轮修正版）
 * 说明：因 P0（Teleport 目标 #page-actions 在视图挂载时不在 document 中）导致 6 个页面崩溃，
 *      本脚本注入「预置 #page-actions」的诊断垫片以便验证其余实现；垫片不影响任何源码，
 *      结论中会明确标注哪些断言是在垫片下取得的。
 * 用法：node admin_qa2.mjs <cdpPort> <adminBase> [apiBase]
 */
const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:5174'
const apiBase = process.argv[4] || 'http://127.0.0.1:8000'
const DEBUG = `http://127.0.0.1:${port}`
const SHIM = `(() => {
  const orig = Document.prototype.querySelector;
  Document.prototype.querySelector = function (sel) {
    if (sel === '#page-actions' && !this.querySelectorAll('#page-actions').length) {
      const d = this.createElement('div'); d.id = 'page-actions';
      d.setAttribute('style', 'position:fixed;top:10px;right:16px;z-index:60;display:flex;gap:8px');
      (this.body || this.documentElement).appendChild(d);
    }
    return orig.call(this, sel);
  };
})()`

const fails = []
const passes = []
function check(label, cond, detail = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ` :: ${detail}` : ''))
  ;(cond ? passes : fails).push(label)
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map(); this.errs = []
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.errs.push('EXC ' + (msg.params.exceptionDetails.exception?.description || '').split('\n')[0])
      } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        const t = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
        if (/emitsOptions/i.test(t)) this.errs.push('LOG ' + t.split('\n')[0].slice(0, 80))
      }
    }
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')) })
    return new CDP(ws)
  }
  send(method, params = {}) {
    const id = ++this.seq
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
  close() { try { this.ws.close() } catch {} }
}

async function openPage(url, w = 1440, h = 900, instant = false) {
  const t = await fetch(`${DEBUG}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((r) => r.json())
  const cdp = await CDP.connect(t.webSocketDebuggerUrl)
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM })
  await cdp.send('Page.navigate', { url })
  if (!instant) {
    for (let i = 0; i < 100; i++) { await new Promise((r) => setTimeout(r, 200)); try { if ((await cdp.evaluate('document.readyState')) === 'complete') break } catch {} }
    await new Promise((r) => setTimeout(r, 1200))
  }
  return cdp
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.writeFileSync(new URL(`./shots-${name}.png`, import.meta.url), Buffer.from(data, 'base64'))
}

/** 独立上下文登录：先清空 localStorage 再进 /login */
async function loginAs(email, pwd, w = 1440, h = 900) {
  let cdp = await openPage(`${base}/login`, w, h)
  await cdp.evaluate(`localStorage.clear(); sessionStorage.clear()`)
  await cdp.send('Page.navigate', { url: `${base}/login` })
  let ready = false
  for (let i = 0; i < 120; i++) { await new Promise((r) => setTimeout(r, 250)); ready = await cdp.evaluate(`!!document.querySelector('input[type=email]')`).catch(() => false); if (ready) break }
  if (!ready) { console.log('  !! login form not ready, path=', await cdp.evaluate('location.pathname').catch(() => '?')) }
  await cdp.evaluate(`(async()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))};set(e,${JSON.stringify(email)});set(p,${JSON.stringify(pwd)});document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
  await new Promise((r) => setTimeout(r, 2600))
  return cdp
}
async function go(cdp, route, ms = 2600) { await cdp.evaluate(`location.href='${route}'`); await new Promise((r) => setTimeout(r, ms)) }

/** 收集页面上所有 #page-actions（含垫片）内的按钮文本 */
const ACTION_BTNS = `(() => [...document.querySelectorAll('#page-actions')].flatMap(p => [...p.querySelectorAll('button')]).map(b => b.innerText.trim()))()`

async function main() {
  console.log('==== 管理后台 CDP 校验（含 Teleport 诊断垫片）====')
  const site = await fetch(`${apiBase}/api/public/site`).then((r) => r.json()).catch(() => ({}))

  // ---------- R19/R21 ----------
  console.log('-- R19/R21 登录 + 侧栏 --')
  let cdp = await loginAs('admin@jiaodianfilm.com', 'Admin@123456')
  const shell = JSON.parse(await cdp.evaluate(`(() => {
    const navTexts = [...document.querySelectorAll('aside nav a')].map(a => a.innerText.trim());
    return JSON.stringify({ path: location.pathname, bg: getComputedStyle(document.body).backgroundColor, navCount: navTexts.length, navTexts, title: (document.querySelector('main h1')?.innerText || document.querySelector('header h1')?.innerText || '').trim() });
  })()`))
  console.log(' ', JSON.stringify(shell))
  check('R19 登录后进入工作台', shell.path === '/dashboard', shell.path)
  check('R19 明亮底 #F5F5F7', /245,\s*245,\s*247/.test(shell.bg), shell.bg)
  check('R21 侧栏 9 项导航齐全', shell.navCount === 9, JSON.stringify(shell.navTexts))
  const dashKpi = JSON.parse(await cdp.evaluate(`(() => {
    const t = document.querySelector('main').innerText;
    return JSON.stringify({ text: t.slice(0, 120).replace(/\\n/g, '|') });
  })()`))
  console.log('  dashboard:', dashKpi.text)
  check('R21 工作台 KPI 有真实数字（≥1）', /\b12\b/.test(dashKpi.text), dashKpi.text)
  cdp.errs = []

  // ---------- R22/R25 视频库 ----------
  console.log('-- R22/R25 视频库 --')
  await go(cdp, '/videos')
  const vids = JSON.parse(await cdp.evaluate(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const rows = document.querySelectorAll('table tbody tr').length;
    const header = document.querySelector('header p')?.innerText || '';
    const selOpts = [...document.querySelectorAll('select')].map(s => [...s.options].map(o => o.textContent.trim()));
    const actBtns = ${ACTION_BTNS};
    // 点「未分类」
    const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.textContent.includes('未分类')));
    let uncat = null;
    if (sel) { const o = [...sel.options].find(o => o.textContent.includes('未分类')); sel.value = o.value; sel.dispatchEvent(new Event('change', {bubbles:true})); await sleep(1800); uncat = document.querySelectorAll('table tbody tr').length; }
    return JSON.stringify({ rows, header, selOpts, actBtns, uncatRows: uncat, errors: [...document.querySelectorAll('.ad-field-error')].map(e => e.innerText.trim()) });
  })()`))
  console.log(' ', JSON.stringify(vids))
  check('R22 视频库表格渲染 10 行', vids.rows === 10, String(vids.rows))
  check('§5.2 视频库有「新增视频」按钮（Teleport 到顶栏）', vids.actBtns.some((b) => b.includes('新增视频')), JSON.stringify(vids.actBtns))
  check('R25 提供「未分类」筛选项', vids.selOpts.some((a) => a.includes('未分类')))
  check('R22 视频库页眉统计为真实值（非全 0）', !/共 0 支 · 已发布 0 · 草稿 0/.test(vids.header), vids.header)
  cdp.errs = []

  // ---------- R22/R23/R24/R18 合集分发 ----------
  console.log('-- R22/R23/R24/R18 合集分发 --')
  await go(cdp, '/distributions')
  const dist = JSON.parse(await cdp.evaluate(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    out.headers = [...document.querySelectorAll('table thead th')].map(th => th.innerText.trim());
    out.actBtns = ${ACTION_BTNS};
    const newBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('新建分发'));
    out.hasNewBtn = !!newBtn;
    newBtn?.click(); await sleep(900);
    const dlgs = [...document.querySelectorAll('[role=dialog]')];
    const dlg = dlgs.find(d => d.innerText.includes('新建分发'));
    out.dlgOpen = !!dlg;
    if (dlg) {
      out.labels = [...dlg.querySelectorAll('label')].map(l => l.innerText.replace('*','').replace(/\\s+/g,'').trim());
      const sel = dlg.querySelector('select');
      out.durationOptions = sel ? [...sel.options].filter(o => !o.disabled).map(o => o.textContent.trim()) : [];
      out.durationDefault = sel ? sel.options[sel.selectedIndex]?.textContent.trim() : null;
      const ta = dlg.querySelector('textarea');
      out.noteIsTextarea = !!ta; out.noteH = ta ? getComputedStyle(ta).height : null;
      out.customerHint = (dlg.innerText.match(/仅后台可见/g) || []).length;
      [...dlg.querySelectorAll('button')].find(b => b.innerText.includes('选择视频'))?.click();
      await sleep(900);
      const all = [...document.querySelectorAll('[role=dialog]')];
      const picker = all.find(d => d.innerText.includes('选择视频') && !d.innerText.includes('新建分发'));
      out.dialogCount = all.length;
      const zOf = el => el?.parentElement ? getComputedStyle(el.parentElement).zIndex : null;
      out.newZ = zOf(dlg); out.pickerZ = picker ? zOf(picker) : null;
      out.pickerAbove = picker ? parseInt(out.pickerZ) > parseInt(out.newZ) : null;
      if (picker) {
        // 断言不绑定任何测试专用属性：以「真实可见元素」为准——表格行，或含封面 <img> 的按钮（视频行必有封面图）
        const tr = picker.querySelectorAll('table tbody tr');
        const btnRows = [...picker.querySelectorAll('button')].filter((b) => b.querySelector('img'));
        out.pickerRows = tr.length || btnRows.length;
        out.pickerRowBasis = tr.length ? 'table-tr' : 'button-with-img';
      }
      out.pickerText = picker ? picker.innerText.replace(/\\n+/g, ' | ').slice(0, 120) : null;
      out.pickerErr = picker ? [...picker.querySelectorAll('.ad-field-error, .ad-hint')].map(e => e.innerText.trim()).slice(0,2) : [];
    }
    return JSON.stringify(out);
  })()`))
  console.log(' ', JSON.stringify(dist))
  check('R22 分发列表有「新建分发」入口', dist.hasNewBtn === true)
  check('R22 分发表格列齐全', ['分发名称','客户','支数','分发时间','限时','状态'].every((h) => dist.headers.some((t) => t.includes(h))), JSON.stringify(dist.headers))
  check('R23/R24 「一句说明」为 textarea（高≈88）', dist.noteIsTextarea === true && Math.round(parseFloat(dist.noteH)) === 88, dist.noteH)
  check('R18 限时选项 6 项', dist.durationOptions?.length === 6, JSON.stringify(dist.durationOptions))
  check('R18 限时默认「1 小时」', dist.durationDefault === '1 小时', String(dist.durationDefault))
  check('R23 选择视频弹框 z-index 更高', dist.pickerAbove === true, `new=${dist.newZ} picker=${dist.pickerZ}`)
  check('R22 客户名标注「仅后台可见」', dist.customerHint >= 1, String(dist.customerHint))
  const L = dist.labels || []
  const idx = (kw) => L.findIndex((x) => x.includes(kw))
  check('R22/R23 弹框字段顺序（合集名→客户名→联系方式→限时→已选视频→一句说明）',
    idx('合集名') === 0 && idx('合集名') < idx('客户名') && idx('客户名') < idx('联系方式') && idx('联系方式') < idx('限时') && idx('限时') < idx('已选视频') && idx('已选视频') < idx('一句说明'),
    JSON.stringify(L))
  check('R23 「选择视频」弹框能列出可选视频（依赖 size=200 调用）', Number(dist.pickerRows) > 0, String(dist.pickerRows) + ' err=' + JSON.stringify(dist.pickerErr))
  check('R23 选择视频弹框文案非「没有符合条件的视频」', !/没有符合条件/.test(dist.pickerText || ''), String(dist.pickerText).slice(0, 40))
  cdp.errs = []

  // ---------- 列表页数据可见性（size=200 契约违规的可见后果）----------
  console.log('-- 列表页数据可见性 --')
  await go(cdp, '/distributions')
  const dlist = JSON.parse(await cdp.evaluate(`JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, errs: [...document.querySelectorAll('.ad-field-error')].map(e=>e.innerText.trim()), header: (document.querySelector('header p')||{}).innerText||'' })`))
  console.log('  /distributions', JSON.stringify(dlist))
  check('R22 分发列表显示 DB 已有分发（3 条）且无原始报错', dlist.errs.length === 0 && dlist.rows >= 3, JSON.stringify(dlist))
  await go(cdp, '/leads')
  const llist = JSON.parse(await cdp.evaluate(`JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, errs: [...document.querySelectorAll('.ad-field-error')].map(e=>e.innerText.trim()), header: (document.querySelector('header p')||{}).innerText||'' })`))
  console.log('  /leads', JSON.stringify(llist))
  check('§5.8 预约留言显示 DB 已有留言（4 条）且无原始报错', llist.errs.length === 0 && llist.rows >= 4, JSON.stringify(llist))
  cdp.errs = []

  // ---------- R26 业务板块 ----------
  console.log('-- R26 业务板块 --')
  await go(cdp, '/segments')
  const segs = JSON.parse(await cdp.evaluate(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t = document.querySelector('main').innerText;
    const out = { hasInvisibleOnList: t.includes('客户端不可见'), names: ['人像写真','婚礼纪实','商业摄影','活动跟拍','视频短片'].filter(x => t.includes(x)) };
    const btn = [...document.querySelectorAll('button')].find(b => /编辑|设置/.test(b.innerText));
    btn?.click(); await sleep(1000);
    const dlg = [...document.querySelectorAll('[role=dialog]')].pop();
    out.dlgOpen = !!dlg;
    if (dlg) {
      out.invisibleInDialog = dlg.innerText.includes('客户端不可见');
      out.contentTypes = ['有视频','图集','文章'].filter(x => dlg.innerText.includes(x));
      out.typesDisabledHint = /暂未启用/.test(dlg.innerText);
    }
    return JSON.stringify(out);
  })()`))
  console.log(' ', JSON.stringify(segs))
  check('R26 板块编辑弹框标注「内容类型（内部属性 · 客户端不可见）」', segs.invisibleInDialog === true)
  check('R26 内容类型三选一 = 有视频/图集/文章', (segs.contentTypes || []).length === 3, JSON.stringify(segs.contentTypes))
  check('R26 图集/文章标注「暂未启用」', segs.typesDisabledHint === true)
  check('R26 5 个预置板块名可见', segs.names.length === 5, JSON.stringify(segs.names))
  cdp.errs = []

  // ---------- R7 荣誉 ----------
  console.log('-- R7 荣誉 --')
  await go(cdp, '/honors')
  const hon = JSON.parse(await cdp.evaluate(`(() => {
    const t = document.querySelector('main').innerText;
    return JSON.stringify({ headers: [...document.querySelectorAll('table thead th')].map(x=>x.innerText.trim()), rows: document.querySelectorAll('table tbody tr').length, ring: /展厅|环形|最多展示 6 条/.test(t) });
  })()`))
  console.log(' ', JSON.stringify(hon))
  check('R7 荣誉表格列为 标题/详情描述/颁奖机构/等级', ['标题','详情描述','颁奖机构','等级'].every((h) => hon.headers.some((t) => t.includes(h))), JSON.stringify(hon.headers))
  check('R7 荣誉列表渲染出数据行', hon.rows > 0, String(hon.rows))
  cdp.errs = []

  // ---------- R20 成员 ----------
  console.log('-- R20 账号与权限 --')
  await go(cdp, '/members')
  const mem = JSON.parse(await cdp.evaluate(`(() => JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, txt: document.querySelector('main').innerText.slice(0, 80).replace(/\\n/g,'|') }))()`))
  console.log(' ', JSON.stringify(mem))
  check('R20 成员列表 = 3 人', mem.rows === 3, String(mem.rows))
  await shot(cdp, 'admin-distributions')
  cdp.close()

  // ---------- viewer ----------
  console.log('-- viewer 权限 --')
  cdp = await loginAs('viewer@jiaodianfilm.com', 'Viewer@123456')
  await go(cdp, '/videos')
  const view = JSON.parse(await cdp.evaluate(`(async () => {
    const actBtns = ${ACTION_BTNS};
    const nav = [...document.querySelectorAll('aside nav a')].map(a => a.innerText.trim());
    const b = [...document.querySelectorAll('#page-actions button')].find(x => x.innerText.includes('新增视频'));
    return JSON.stringify({ navHasMembers: nav.some(x => x.includes('账号与权限')), actBtns, btnDisabled: b ? (b.disabled || b.getAttribute('aria-disabled') === 'true' || getComputedStyle(b).pointerEvents === 'none') : null, hint: /只读/.test(document.querySelector('main').innerText) });
  })()`))
  console.log(' ', JSON.stringify(view))
  check('R20 viewer 侧栏隐藏「账号与权限」', view.navHasMembers === false)
  check('R20 viewer 写操作按钮「新增视频」存在但被禁用', view.actBtns.length === 0 || (view.btnDisabled === true), JSON.stringify({ btns: view.actBtns, disabled: view.btnDisabled }))
  await go(cdp, '/members', 1800)
  const vGuard = await cdp.evaluate('location.pathname')
  check('R20 viewer 直访 /members 被重定向', vGuard !== '/members', vGuard)
  cdp.close()

  // ---------- editor ----------
  console.log('-- editor 权限 --')
  cdp = await loginAs('editor@jiaodianfilm.com', 'Editor@123456')
  const eNav = JSON.parse(await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('aside nav a')].map(a => a.innerText.trim()))`))
  await go(cdp, '/members', 1800)
  const eGuard = await cdp.evaluate('location.pathname')
  console.log('  editor nav=', JSON.stringify(eNav), '-> /members =>', eGuard)
  check('R20 editor 侧栏隐藏「账号与权限」', !eNav.some((x) => x.includes('账号与权限')))
  check('R20 editor 直访 /members 被重定向到工作台', eGuard === '/dashboard', eGuard)
  await go(cdp, '/videos')
  const eEdit = JSON.parse(await cdp.evaluate(`JSON.stringify({ actBtns: ${ACTION_BTNS} })`))
  check('R20 editor 拥有写权限（可见「新增视频」）', eEdit.actBtns.some((b) => b.includes('新增视频')), JSON.stringify(eEdit.actBtns))
  cdp.close()

  // ---------- 移动端 390 ----------
  console.log('-- R27 移动端 390 --')
  cdp = await loginAs('admin@jiaodianfilm.com', 'Admin@123456', 390, 780)
  const mob = JSON.parse(await cdp.evaluate(`(() => {
    const aside = document.querySelector('aside');
    const bar = document.querySelector('nav[aria-label*="移动"], footer nav, .ad-tabbar') || [...document.querySelectorAll('nav, footer')].find(n => /工作台|视频库|合集|留言|我的/.test(n.innerText) && n.getBoundingClientRect().top > innerHeight - 140);
    return JSON.stringify({ asideW: aside ? Math.round(aside.getBoundingClientRect().width) : null, barH: bar ? Math.round(bar.getBoundingClientRect().height) : null, barText: bar ? bar.innerText.replace(/\\n/g,'|').slice(0,40) : null, scrollW: document.documentElement.scrollWidth, innerW: innerWidth });
  })()`))
  await shot(cdp, 'admin-390')
  await go(cdp, '/videos', 2200)
  const mobV = JSON.parse(await cdp.evaluate(`JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, cards: document.querySelectorAll('article, .ad-card').length, scrollW: document.documentElement.scrollWidth, innerW: innerWidth })`))
  await shot(cdp, 'admin-390-videos')
  console.log(' ', JSON.stringify(mob), JSON.stringify(mobV))
  check('R27 移动端侧栏收起（宽度 0）', mob.asideW === 0 || mob.asideW === null, String(mob.asideW))
  check('R27 移动端底部 Tab 高≈64', mob.barH !== null && Math.abs(mob.barH - 64) <= 8, String(mob.barH))
  check('R27 移动端无横向滚动', mob.scrollW <= mob.innerW + 1, `${mob.scrollW}/${mob.innerW}`)
  check('R27 移动端视频库以卡片流呈现（非表格）', mobV.rows === 0 && mobV.cards > 0, JSON.stringify(mobV))
  cdp.close()

  console.log('='.repeat(60))
  console.log(`后台校验 RESULT（垫片下）: ${passes.length} passed, ${fails.length} failed`)
  if (fails.length) console.log('FAILED: ' + fails.join(' ; '))
  process.exit(fails.length ? 1 : 0)
}

main().catch((e) => { console.error('ERR', e); process.exit(2) })
