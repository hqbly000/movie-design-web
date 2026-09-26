/**
 * 交点影视 · 官网补充对抗性 CDP 校验（QA 严过关独立编写）
 * 覆盖既有 cdp-verify.mjs 未覆盖 / 仅弱覆盖的点。
 * 用法：node frontend_qa.mjs <cdpPort> <frontendBase> <apiBase> <validToken>
 */
const port = process.argv[2] || '9223'
const frontend = process.argv[3] || 'http://127.0.0.1:5173'
const apiBase = process.argv[4] || 'http://127.0.0.1:8000'
const VALID_TOKEN = process.argv[5] || ''
const DEBUG = `http://127.0.0.1:${port}`

const fails = []
const passes = []
function check(label, cond, detail = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ` :: ${detail}` : ''))
  ;(cond ? passes : fails).push(label)
}

class CDP {
  constructor(ws) {
    this.ws = ws
    this.seq = 0
    this.pending = new Map()
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
      }
    }
  }
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl)
    await new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = (e) => rej(new Error('ws error ' + String(e?.message ?? e)))
    })
    return new CDP(ws)
  }
  send(method, params = {}) {
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails)
      throw new Error('evaluate exception: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
  close() {
    try { this.ws.close() } catch {}
  }
}

async function openPage(url, w = 1440, h = 900) {
  const t = await fetch(`${DEBUG}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((r) => r.json())
  const cdp = await CDP.connect(t.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 })
  await cdp.send('Page.navigate', { url })
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 200))
    try { if ((await cdp.evaluate('document.readyState')) === 'complete') break } catch {}
  }
  await new Promise((r) => setTimeout(r, 1500))
  return cdp
}

async function api(path, token, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(apiBase + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return r.json()
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.writeFileSync(new URL(`./shots-${name}.png`, import.meta.url), Buffer.from(data, 'base64'))
  console.log('  screenshot -> shots-' + name + '.png')
}

const HOME_DYN = `(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const out = {};
  // ---- Header 透明 → 毛玻璃 ----
  const header = document.querySelector('header');
  out.headerAtTop = header ? getComputedStyle(header).backgroundColor + ' | bf=' + getComputedStyle(header).backdropFilter : null;
  window.scrollTo(0, 2000);
  await sleep(700);
  out.headerScrolled = header ? getComputedStyle(header).backgroundColor + ' | bf=' + getComputedStyle(header).backdropFilter : null;
  window.scrollTo(0, 0);
  await sleep(600);
  // ---- 轮播：三图三标语，切换后文案变化 ----
  const slogans = () => [...document.querySelectorAll('#hero h1')].map(e => e.innerText.trim()).filter(Boolean);
  const imgCount = document.querySelectorAll('#hero img').length;
  const before = slogans();
  const activeSlogan = () => document.querySelector('#hero [aria-hidden="false"] h1')?.innerText.trim();
  const beforeActive = activeSlogan();
  await sleep(7000);
  const afterActive = activeSlogan();
  out.imgCount = imgCount;
  out.slogans = before;
  out.beforeActive = beforeActive;
  out.afterActive = afterActive;
  out.sloganChanged = beforeActive !== afterActive;
  // ---- Ken Burns：激活图 transform 是否在放大 ----
  const activeImg = [...document.querySelectorAll('#hero img')].find(i => i.getBoundingClientRect().width > 0);
  out.kbAnimation = activeImg ? getComputedStyle(activeImg).animationName : null;
  out.kbTransform = activeImg ? getComputedStyle(activeImg).transform : null;
  // ---- 按钮 computed style（禁渐变/外发光/内高光/箭头）----
  const btns = [...document.querySelectorAll('button, a.ly-btn, .ly-btn')];
  out.btnIssues = btns.map(b => {
    const s = getComputedStyle(b);
    return { text: (b.innerText || '').trim().slice(0, 14), bgImage: s.backgroundImage, boxShadow: s.boxShadow, textShadow: s.textShadow, arrow: /→|›|»/.test(b.innerText || '') };
  }).filter(x => (x.bgImage && x.bgImage.includes('gradient')) || (x.boxShadow && x.boxShadow !== 'none') || (x.textShadow && x.textShadow !== 'none') || x.arrow);
  out.btnTotal = btns.length;
  // ---- §0.2 禁止项 DOM 扫描 ----
  const T = document.body.innerText;
  out.hasWorksGallery = T.includes('作品图集');
  out.has4K = /4K|HDR/.test(T);
  // ---- 年份 ----
  document.getElementById('about').scrollIntoView();
  await sleep(1800);
  const yEl = document.querySelector('#about .year-number');
  out.year = yEl ? yEl.textContent.trim() : null;
  return JSON.stringify(out);
})()`

const ROTATE_JS = `(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // 展厅自动旋转由 IntersectionObserver 进入视口后启动，必须先滚入
  document.getElementById('honors').scrollIntoView();
  await sleep(1200);
  // 现行方案为等大圆柱（rAF 驱动 rotateY）；旧的 .variant-main 展板方案已废弃
  const t = () => document.querySelector('#honors .honor-stage > div > div')?.style.transform || '';
  const title = () => document.querySelector('#honors .honor-stage .is-active .title')?.innerText.trim() || '';
  const arrows = !!document.querySelector('#honors [aria-label="上一支"]') || !!document.querySelector('#honors [aria-label="下一支"]');
  const a = t(); const ta = title();
  await sleep(6000);
  const b = t(); const tb = title();
  await sleep(6000);
  const c = t(); const tc = title();
  return JSON.stringify({ a, b, c, ta, tb, tc, rotated: (a !== b) || (b !== c) || (ta !== tb) || (tb !== tc), arrows });
})()`

const OFFLINE_JS = `(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  await sleep(2500);
  const T = document.body.innerText;
  return JSON.stringify({
    len: T.trim().length,
    hasHeader: !!document.querySelector('header'),
    hasHero: !!document.getElementById('hero'),
    hasSections: ['hero','about','honors','segments','contact'].filter(id => document.getElementById(id)).length,
    blank: T.trim().length < 20
  });
})()`

async function main() {
  console.log('==== 官网补充对抗性校验 ====')
  const site = await api('/api/public/site')
  const origFounded = site.data.company_profile.founded_year
  const curYear = new Date().getFullYear()

  // ---------- 首页 1440：Header/轮播/KenBurns/按钮/年份 ----------
  console.log('-- 首页 1440 --')
  let cdp = await openPage(`${frontend}/`)
  const h = JSON.parse(await cdp.evaluate(HOME_DYN))
  await shot(cdp, 'home-1440')
  cdp.close()
  console.log(JSON.stringify(h, null, 1))

  check('R1 Header 顶部透明底', /rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(h.headerAtTop || ''), h.headerAtTop)
  check('R1 滚动后 Header 变毛玻璃（backdrop-filter blur）', /blur/.test(h.headerScrolled || ''), h.headerScrolled)
  check('R3 首屏图数量 = 3', h.imgCount === 3, String(h.imgCount))
  check('R3 三张图各带标语（互不相同）', new Set(h.slogans).size === 3, JSON.stringify(h.slogans))
  check('R3 自动轮播：切换后当前标语变化（6s）', h.sloganChanged === true, `${h.beforeActive} -> ${h.afterActive}`)
  check('R2 Ken Burns 动画生效（animation=kenburns 或 scale)1）', /kenburns/.test(h.kbAnimation || '') || /matrix\(1\.0?[1-9]/.test(h.kbTransform || ''), `${h.kbAnimation} | ${h.kbTransform}`)
  check('R13 全站按钮无渐变填充/外发光/内高光/装饰箭头', h.btnIssues.length === 0, `checked=${h.btnTotal} issues=${JSON.stringify(h.btnIssues)}`)
  check('§0.2 页面无「作品图集」', h.hasWorksGallery === false)
  check('R10 页面正文无 4K/HDR', h.has4K === false)
  check(`R5 展示年限 = 当年-2017 = ${curYear - 2017}`, h.year === String(curYear - 2017), `year=${h.year}`)

  // ---------- R6 展厅自动旋转 ----------
  console.log('-- 展厅自动旋转 --')
  cdp = await openPage(`${frontend}/`)
  const r = JSON.parse(await cdp.evaluate(ROTATE_JS))
  cdp.close()
  console.log(JSON.stringify(r))
  check('R6 荣誉展厅自动旋转（主展板内容随时间变化）', r.rotated === true, `${r.a} -> ${r.b} -> ${r.c}`)
  check('R6 展厅无左右切换箭头', r.arrows === false)

  // ---------- R5 年限动态（改 founded_year 后应跟着变） ----------
  console.log('-- R5 年限动态性 --')
  const adminTok = (await api('/api/auth/login', null, 'POST', { email: 'admin@jiaodianfilm.com', password: 'Admin@123456' })).data.token
  await api('/api/admin/company-profile', adminTok, 'PUT', { section_title: '公司介绍', company_name: site.data.company_profile.company_name, founded_year: 2015, intro_text: site.data.company_profile.intro_text })
  cdp = await openPage(`${frontend}/`)
  await cdp.evaluate(`document.getElementById('about').scrollIntoView()`)
  await new Promise((r) => setTimeout(r, 1800))
  const y2015 = await cdp.evaluate(`document.querySelector('#about .year-number')?.textContent.trim()`)
  const since = await cdp.evaluate(`(document.body.innerText.match(/SINCE \\d{4}/)||[''])[0]`)
  cdp.close()
  console.log(`founded_year=2015 -> year=${y2015} ${since}`)
  check(`R5 改 founded_year=2015 后年限变为 ${curYear - 2015}（证明动态计算）`, y2015 === String(curYear - 2015), `got=${y2015}`)
  check('R5 SINCE 年份跟随 founded_year', since === 'SINCE 2015', since)
  // 还原
  await api('/api/admin/company-profile', adminTok, 'PUT', { section_title: '公司介绍', company_name: site.data.company_profile.company_name, founded_year: origFounded, intro_text: site.data.company_profile.intro_text })
  const restored = (await api('/api/admin/company-profile', adminTok)).data.founded_year
  check(`R5 还原 founded_year=${origFounded}`, restored === origFounded, String(restored))

  // ---------- 移动端 390 无横向滚动 ----------
  console.log('-- 移动端 390 --')
  cdp = await openPage(`${frontend}/`, 390, 780)
  const m = JSON.parse(await cdp.evaluate(`(() => {
    return JSON.stringify({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      bodyScrollW: document.body.scrollWidth, burger: !!document.querySelector('[aria-label="打开菜单"]'),
      heroH: Math.round(document.getElementById('hero')?.getBoundingClientRect().height || 0) });
  })()`))
  await shot(cdp, 'home-390')
  cdp.close()
  console.log(JSON.stringify(m))
  check('R14 移动端无横向滚动条（scrollWidth <= clientWidth）', m.scrollW <= m.clientW + 1 && m.bodyScrollW <= m.clientW + 1, `${m.scrollW} <= ${m.clientW}`)

  // ---------- 断网兜底（阻断后端 API） ----------
  console.log('-- 断网兜底 --')
  cdp = await openPage(`${frontend}/`)
  await cdp.send('Network.setBlockedURLs', { urls: ['*127.0.0.1:8000*'] })
  await cdp.send('Page.navigate', { url: `${frontend}/` })
  await new Promise((r) => setTimeout(r, 3000))
  const off = JSON.parse(await cdp.evaluate(OFFLINE_JS))
  await shot(cdp, 'home-offline')
  cdp.close()
  console.log(JSON.stringify(off))
  check('兜底 后端不可用时首页不白屏（仍渲染 Header + 主要区块）', off.blank === false && off.hasHeader === true && off.hasSections >= 3, JSON.stringify(off))

  // 分享页断网
  if (VALID_TOKEN) {
    cdp = await openPage(`${frontend}/share/${VALID_TOKEN}`)
    await cdp.send('Network.setBlockedURLs', { urls: ['*127.0.0.1:8000*'] })
    await cdp.send('Page.navigate', { url: `${frontend}/share/${VALID_TOKEN}` })
    await new Promise((r) => setTimeout(r, 3000))
    const sOff = JSON.parse(await cdp.evaluate(`JSON.stringify({ t: document.body.innerText, blank: document.body.innerText.trim().length < 20 })`))
    await shot(cdp, 'share-offline')
    cdp.close()
    check('兜底 分享页后端不可用时有可读降级（非白屏）', sOff.blank === false, sOff.t.slice(0, 60).replace(/\n/g, ' '))
  }

  console.log('='.repeat(60))
  console.log(`补充校验 RESULT: ${passes.length} passed, ${fails.length} failed`)
  if (fails.length) console.log('FAILED: ' + fails.join('; '))
  process.exit(fails.length ? 1 : 0)
}

main().catch((e) => { console.error('ERR', e); process.exit(2) })
