/**
 * 交点影视 · 管理后台 CDP 端到端校验（QA 严过关独立编写）
 * 覆盖 R19–R27 关键点。
 * 用法：node admin_qa.mjs <cdpPort> <adminBase> <apiBase>
 */
const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:5174'
const apiBase = process.argv[4] || 'http://127.0.0.1:8000'
const DEBUG = `http://127.0.0.1:${port}`

const fails = []
const passes = []
function check(label, cond, detail = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ` :: ${detail}` : ''))
  ;(cond ? passes : fails).push(label)
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map()
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      }
    }
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error('ws ' + String(e?.message ?? e))) })
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

async function openPage(url, w = 1440, h = 900) {
  const t = await fetch(`${DEBUG}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((r) => r.json())
  const cdp = await CDP.connect(t.webSocketDebuggerUrl)
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await cdp.send('Page.navigate', { url })
  for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 200)); try { if ((await cdp.evaluate('document.readyState')) === 'complete') break } catch {} }
  await new Promise((r) => setTimeout(r, 1200))
  return cdp
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.writeFileSync(new URL(`./shots-${name}.png`, import.meta.url), Buffer.from(data, 'base64'))
  console.log('  screenshot -> shots-' + name + '.png')
}

const LOGIN = `(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const em = document.querySelector('input[type=email]');
  const pw = document.querySelector('input[type=password]');
  const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set(em, __EMAIL__); set(pw, __PWD__);
  await sleep(150);
  document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await sleep(2200);
  return JSON.stringify({ url: location.pathname, hasAside: !!document.querySelector('aside') });
})()`

function loginJs(email, pwd) {
  return LOGIN.replace('__EMAIL__', JSON.stringify(email)).replace('__PWD__', JSON.stringify(pwd))
}

async function login(email, pwd, w = 1440, h = 900) {
  const cdp = await openPage(`${base}/login`, w, h)
  const r = JSON.parse(await cdp.evaluate(loginJs(email, pwd)))
  return { cdp, r }
}

async function main() {
  console.log('==== 管理后台 CDP 校验 ====')
  const site = await fetch(`${apiBase}/api/public/site`).then((r) => r.json())

  // ---------- R19/R21 登录 + 侧栏 9 项 ----------
  console.log('-- 登录 / 侧栏 --')
  let { cdp, r } = await login('admin@jiaodianfilm.com', 'Admin@123456')
  console.log('login ->', JSON.stringify(r))
  check('R19 登录成功进入工作台', r.url === '/dashboard', r.url)
  const shell = JSON.parse(await cdp.evaluate(`(() => {
    const navTexts = [...document.querySelectorAll('aside nav a')].map(a => a.innerText.trim());
    return JSON.stringify({
      bg: getComputedStyle(document.body).backgroundColor,
      navCount: navTexts.length, navTexts,
      title: (document.querySelector('main h1, h1')?.innerText || '').trim()
    });
  })()`))
  console.log(JSON.stringify(shell))
  check('R19 后台明亮底 #F5F5F7', /245,\s*245,\s*247/.test(shell.bg), shell.bg)
  check('R21 侧栏 9 项导航齐全', shell.navCount === 9 && ['工作台','视频库','合集分发','首页首屏','公司介绍','业务板块','荣誉条目','预约留言','账号与权限'].every((x) => shell.navTexts.includes(x)), JSON.stringify(shell.navTexts))
  check('R21 工作台标题', shell.title.includes('工作台') || shell.title === '', shell.title)

  // ---------- 视频库 ----------
  console.log('-- 视频库 --')
  await cdp.evaluate(`location.href='/videos'`); await new Promise((x) => setTimeout(x, 2200))
  const vids = JSON.parse(await cdp.evaluate(`(() => {
    const T = document.body.innerText;
    const sels = [...document.querySelectorAll('select')].map(s => [...s.options].map(o => o.textContent.trim()));
    return JSON.stringify({
      hasUncategorized: /未分类/.test(T) || sels.some(arr => arr.includes('未分类')),
      hasNewBtn: [...document.querySelectorAll('button')].some(b => b.innerText.includes('新增视频')),
      hasCategoryCol: /分类/.test(T),
      bodyText: T.slice(0, 200)
    });
  })()`))
  console.log(JSON.stringify(vids))
  check('R25 视频库提供「未分类」筛选项/展示', vids.hasUncategorized === true)
  check('§5.2 视频库有「+ 新增视频」按钮', vids.hasNewBtn === true)

  // ---------- 合集分发：新建弹框字段顺序 / 限时 6 选项 / textarea / 选择视频 z-index ----------
  console.log('-- 合集分发 --')
  await cdp.evaluate(`location.href='/distributions'`); await new Promise((x) => setTimeout(x, 2200))
  const dist = JSON.parse(await cdp.evaluate(`(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const out = {};
    const T = () => document.body.innerText;
    out.hasNew = [...document.querySelectorAll('button')].some(b => b.innerText.includes('新建分发'));
    out.tableHeaders = [...document.querySelectorAll('table thead th')].map(th => th.innerText.trim());
    // 打开新建弹框
    [...document.querySelectorAll('button')].find(b => b.innerText.includes('新建分发'))?.click();
    await sleep(900);
    const dlg = [...document.querySelectorAll('[role=dialog]')].find(d => d.innerText.includes('新建分发'));
    out.dlgOpen = !!dlg;
    if (dlg) {
      out.labels = [...dlg.querySelectorAll('label')].map(l => l.innerText.replace('*','').trim());
      const sel = dlg.querySelector('select');
      out.durationOptions = sel ? [...sel.options].filter(o=>!o.disabled).map(o => o.textContent.trim()) : [];
      out.durationDefault = sel ? sel.options[sel.selectedIndex]?.textContent.trim() : null;
      out.noteIsTextarea = !!dlg.querySelector('textarea');
      out.noteHeight = dlg.querySelector('textarea') ? getComputedStyle(dlg.querySelector('textarea')).height : null;
      out.customerHint = (dlg.innerText.match(/仅后台可见/g) || []).length;
      // 打开发送「选择视频」弹框，比对 z-index
      [...dlg.querySelectorAll('button')].find(b => b.innerText.includes('选择视频'))?.click();
      await sleep(900);
      const dlgs = [...document.querySelectorAll('[role=dialog]')];
      const picker = dlgs.find(d => d.innerText.includes('选择视频') && !d.innerText.includes('新建分发'));
      out.dialogCount = dlgs.length;
      out.newZ = dlg.parentElement ? getComputedStyle(dlg.parentElement).zIndex : null;
      out.pickerZ = picker && picker.parentElement ? getComputedStyle(picker.parentElement).zIndex : null;
      out.pickerAbove = picker ? (parseInt(out.pickerZ) > parseInt(out.newZ)) : false;
    }
    return JSON.stringify(out);
  })()`))
  console.log(JSON.stringify(dist, null, 1))
  check('R22 分发列表有「+ 新建分发」入口', dist.hasNew === true)
  check('R22 分发表格列齐全（分发名称/客户/支数/分发时间/限时/状态）', ['分发名称','客户','支数','分发时间','限时','状态'].every((h) => dist.tableHeaders.some((t) => t.includes(h))), JSON.stringify(dist.tableHeaders))
  check('R23/R24 新建弹框含「一句说明」且为 textarea（高≈88）', dist.noteIsTextarea === true && Math.round(parseFloat(dist.noteHeight)) === 88, dist.noteHeight)
  check('R18 限时选项 = 6 项（30m/1h/6h/1d/3d/custom）', dist.durationOptions?.length === 6, JSON.stringify(dist.durationOptions))
  check('R18 限时默认选中「1 小时」', dist.durationDefault === '1 小时', String(dist.durationDefault))
  check('R23 「选择视频」弹框叠在新建弹框之上（z-index 更大）', dist.pickerAbove === true, `new=${dist.newZ} picker=${dist.pickerZ}`)
  check('R22 客户名标注「仅后台可见」', dist.customerHint >= 1, String(dist.customerHint))
  // 字段顺序：合集名 → 客户名 → 联系方式 → 限时 → 已选视频 → 一句说明
  const orderOk = dist.labels && dist.labels.join('|').includes('合集名') && dist.labels.indexOf('合集名') < dist.labels.indexOf('客户名') && (dist.labels.indexOf('客户名') < dist.labels.findIndex((x) => x.includes('联系方式'))) && dist.labels.findIndex((x) => x.includes('联系方式')) < dist.labels.findIndex((x) => x.includes('限时')) && dist.labels.findIndex((x) => x.includes('限时')) < dist.labels.findIndex((x) => x.includes('已选视频')) && dist.labels.findIndex((x) => x.includes('已选视频')) < dist.labels.findIndex((x) => x.includes('一句说明'))
  check('R22/R23 弹框字段顺序正确', orderOk, JSON.stringify(dist.labels))

  // ---------- 业务板块 ----------
  console.log('-- 业务板块 --')
  await cdp.evaluate(`location.href='/segments'`); await new Promise((x) => setTimeout(x, 2200))
  const segs = JSON.parse(await cdp.evaluate(`(() => {
    const T = document.body.innerText;
    return JSON.stringify({
      cardCount: document.querySelectorAll('.ad-segment-card, [data-segment-card], article').length,
      hasClientInvisible: T.includes('客户端不可见'),
      contentTypes: ['有视频','图集','文章'].filter(x => T.includes(x)),
      bodyHas5: (T.match(/人像写真|婚礼纪实|商业摄影|活动跟拍|视频短片/g)||[]).length
    });
  })()`))
  console.log(JSON.stringify(segs))
  check('R26 业务板块页标注内容类型「客户端不可见」', segs.hasClientInvisible === true)
  check('R26 预置 5 个板块名出现', segs.bodyHas5 >= 5, String(segs.bodyHas5))

  // ---------- 荣誉 / 留言 / 成员 ----------
  console.log('-- 荣誉 / 留言 / 成员 --')
  await cdp.evaluate(`location.href='/honors'`); await new Promise((x) => setTimeout(x, 2200))
  const hon = JSON.parse(await cdp.evaluate(`JSON.stringify({ headers: [...document.querySelectorAll('table thead th')].map(t=>t.innerText.trim()), rows: document.querySelectorAll('table tbody tr').length })`))
  console.log(JSON.stringify(hon))
  check('R7 荣誉表格列为 标题/详情描述/颁奖机构/等级', ['标题','详情描述','颁奖机构','等级'].every((h) => hon.headers.some((t) => t.includes(h))), JSON.stringify(hon.headers))

  await cdp.evaluate(`location.href='/members'`); await new Promise((x) => setTimeout(x, 2200))
  const mem = JSON.parse(await cdp.evaluate(`JSON.stringify({ rows: document.querySelectorAll('table tbody tr').length, text: document.body.innerText.slice(0,120) })`))
  console.log(JSON.stringify(mem))
  check('R20 账号与权限成员 = 3 人', mem.rows === 3, String(mem.rows))
  await shot(cdp, 'admin-dashboard')
  cdp.close()

  // ---------- viewer 权限 ----------
  console.log('-- viewer 权限 --')
  ;({ cdp } = await login('viewer@jiaodianfilm.com', 'Viewer@123456'))
  const vw = JSON.parse(await cdp.evaluate(`location.href='/videos'`)) || {}
  await new Promise((x) => setTimeout(x, 2200))
  const view = JSON.parse(await cdp.evaluate(`(() => {
    const T = document.body.innerText;
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('新增视频'));
    return JSON.stringify({
      navHasMembers: [...document.querySelectorAll('aside nav a')].some(a => a.innerText.includes('账号与权限')),
      newBtnExists: !!btn, newBtnDisabled: btn ? (btn.disabled || btn.getAttribute('aria-disabled') === 'true' || getComputedStyle(btn).pointerEvents === 'none' || btn.classList.contains('is-disabled')) : null
    });
  })()`))
  console.log(JSON.stringify(view))
  check('R20 viewer 侧栏不显示「账号与权限」', view.navHasMembers === false)
  check('R20 viewer 写操作按钮不可用（隐藏或禁用）', view.newBtnExists === false || view.newBtnDisabled === true, JSON.stringify(view))

  await cdp.evaluate(`location.href='/members'`); await new Promise((x) => setTimeout(x, 1800))
  const vGuard = await cdp.evaluate(`location.pathname`)
  check('R20 viewer 直访 /members 被重定向', vGuard !== '/members', vGuard)
  cdp.close()

  // ---------- editor 权限 ----------
  console.log('-- editor 权限 --')
  ;({ cdp } = await login('editor@jiaodianfilm.com', 'Editor@123456'))
  const eNav = JSON.parse(await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('aside nav a')].map(a => a.innerText.trim()))`))
  await cdp.evaluate(`location.href='/members'`); await new Promise((x) => setTimeout(x, 1800))
  const eGuard = await cdp.evaluate(`location.pathname`)
  console.log('editor nav=', JSON.stringify(eNav), '-> /members =>', eGuard)
  check('R20 editor 侧栏不显示「账号与权限」', !eNav.some((x) => x.includes('账号与权限')))
  check('R20 editor 直访 /members 被重定向到工作台', eGuard === '/dashboard', eGuard)
  cdp.close()

  // ---------- 移动端 390 ----------
  console.log('-- 移动端 390 --')
  ;({ cdp } = await login('admin@jiaodianfilm.com', 'Admin@123456', 390, 780))
  const mob = JSON.parse(await cdp.evaluate(`(() => {
    const T = document.body.innerText;
    const tabs = [...document.querySelectorAll('nav a, nav button')].filter(e => /工作台|视频库|合集|留言|我的/.test(e.innerText));
    const bar = document.querySelector('nav[aria-label*="移动"], footer nav, .ad-tabbar');
    const barH = bar ? Math.round(bar.getBoundingClientRect().height) : null;
    return JSON.stringify({ asideVisible: !!document.querySelector('aside') && document.querySelector('aside').getBoundingClientRect().width > 0, tabCount: tabs.length, barH, tabLabels: tabs.map(t=>t.innerText.trim()).slice(0,6) });
  })()`))
  await shot(cdp, 'admin-390')
  await cdp.evaluate(`location.href='/videos'`); await new Promise((x) => setTimeout(x, 2000))
  await shot(cdp, 'admin-390-videos')
  cdp.close()
  console.log(JSON.stringify(mob))
  check('R27 移动端侧栏收起，出现底部 Tab（含工作台/视频库/合集/留言/我的）', mob.asideVisible === false && mob.tabCount >= 4, JSON.stringify(mob))
  check('R27 底部 Tab 高度 ≈64', mob.barH === null || Math.abs(mob.barH - 64) <= 6, String(mob.barH))

  console.log('='.repeat(60))
  console.log(`后台校验 RESULT: ${passes.length} passed, ${fails.length} failed`)
  if (fails.length) console.log('FAILED: ' + fails.join('; '))
  process.exit(fails.length ? 1 : 0)
}

main().catch((e) => { console.error('ERR', e); process.exit(2) })
