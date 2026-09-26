/**
 * 焦点影视官网 · CDP 端到端渲染校验。
 * 在真实 Chromium 中导航、滚动、点击（含打开全屏作品页），断言关键内容与 R1–R28 要点。
 * 用法：node cdp_verify.mjs <cdpPort> <frontendBase> <apiBase>
 */
const port = process.argv[2] || '9223'
const frontend = process.argv[3] || 'http://127.0.0.1:5173'
const apiBase = process.argv[4] || 'http://127.0.0.1:8000'
const VALID_TOKEN = process.argv[5] || ''
const EXPIRED_TOKEN = process.argv[6] || ''
const DEBUG = `http://127.0.0.1:${port}`

const fails = []
const passes = []

function check(label, cond, detail = '') {
  const line = (cond ? 'PASS ' : 'FAIL ') + label + (detail ? ` :: ${detail}` : '')
  console.log(line)
  ;(cond ? passes : fails).push(label)
}

async function newTarget(url) {
  const res = await fetch(`${DEBUG}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`create target failed: ${res.status}`)
  return res.json()
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
    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = (e) => reject(new Error('ws error ' + String(e?.message ?? e)))
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
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    })
    if (r.exceptionDetails) {
      throw new Error(
        'evaluate exception: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)
      )
    }
    return r.result.value
  }
  close() {
    try {
      this.ws.close()
    } catch {
      /* ignore */
    }
  }
}

async function openPage(url) {
  const target = await newTarget('about:blank')
  const cdp = await CDP.connect(target.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  })
  await cdp.send('Page.navigate', { url })
  // 等待 readyState 完成
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 250))
    try {
      const ready = await cdp.evaluate('document.readyState')
      if (ready === 'complete') break
    } catch {
      /* 页面切换中 */
    }
  }
  return cdp
}

// ============================================================ 首页
const HOME_JS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1800);
  const T = () => document.body.innerText;
  const out = {};
  out.title = document.title;
  out.heroImgs = document.querySelectorAll('#hero img').length;
  out.slogans = [...document.querySelectorAll('#hero h1')].map((e) => e.innerText.trim());
  out.heroHasCTA = T().includes('探索作品');
  out.heroScrollHint = (document.querySelector('#hero')?.innerText || '').includes('SCROLL');
  out.sections = [...document.querySelectorAll('section[id]')].map((s) => s.id);
  out.segmentNames = [...document.querySelectorAll('#segments button')].map((b) => b.getAttribute('aria-label'));
  out.viewAllButtons = [...document.querySelectorAll('#segments button')].filter((b) => b.innerText.includes('查看作品')).length;
  out.ivoryBtn = document.querySelectorAll('#segments .ly-btn-ivory').length;
  out.ghostBtn = document.querySelectorAll('#segments .ly-btn-ghost-ivory').length;
  // 荣誉展示 · 全息圆柱（2026-09-23 新方案：等大卡围成圆柱匀速自转，底部光晕，hover 暂停，点击放大）
  out.honorCards = [...document.querySelectorAll('#honors .honor-stage > div > div > div')];
  out.honorCardCount = out.honorCards.length;
  out.honorCardTransforms = out.honorCards.map((el) => el.style.transform);
  out.honorCardTitles = out.honorCards.map((el) => el.querySelector('h3')?.innerText.trim() || '');
  out.honorActiveCount = out.honorCards.filter((el) => el.classList.contains('is-active')).length;
  out.honorActiveTitle = document.querySelector('#honors .is-active h3')?.innerText.trim() || '';
  out.honorActiveLevel = document.querySelector('#honors .is-active .badge')?.innerText.trim() || '';
  out.honorActiveIssuer = document.querySelector('#honors .is-active .issuer')?.innerText.trim() || '';
  out.honorHasGlow = [...document.querySelectorAll('#honors div')].some((d) => (d.getAttribute('style') || '').includes('radial-gradient'));
  out.honorOldMesh = (document.querySelector('#honors')?.innerHTML.match(/repeating-linear-gradient/g) || []).length;
  out.honorOldSpotlight = (document.querySelector('#honors')?.innerHTML.match(/clip-path/g) || []).length;
  out.honorDots = document.querySelectorAll('#honors [aria-label^="查看第"]').length;
  out.honorHasArrows = !!document.querySelector('#honors [aria-label="上一支"]');
  out.footerText = (document.querySelector('footer')?.innerText) || '';
  out.icp = (T().match(/苏ICP备[^\\s]*/) || [''])[0];
  out.police = (T().match(/苏公网安备[0-9号]+/) || [''])[0];
  out.copyright = (T().match(/Copyright 2026[^\\n]*/) || [''])[0];
  out.contactText = (document.querySelector('#contact')?.innerText) || '';
  out.brandNo4k = !/4K|HDR/.test(T());
  out.hasGradientBtn = !!document.querySelector('#segments .ly-btn[class*="gradient"]');

  // R5 年份：滚入视口触发计数
  document.getElementById('about').scrollIntoView();
  await sleep(1800);
  const yEl = document.querySelector('#about .text-accent-orange');
  out.year = yEl ? yEl.innerText.trim() : null;
  out.yearFontSize = yEl ? getComputedStyle(yEl).fontSize : null;
  out.yearLineHeight = yEl ? getComputedStyle(yEl).lineHeight : null;
  const ghost = document.querySelector('#about span[style*="text-stroke"]');
  out.ghostExists = !!ghost;
  out.ghostFontSize = ghost ? getComputedStyle(ghost).fontSize : null;
  out.ghostStroke = ghost ? getComputedStyle(ghost).webkitTextStrokeWidth : null;
  out.sinceText = (T().match(/SINCE \\d{4}/) || [''])[0];

  // R9/R10 全屏视频作品页
  const col = document.querySelector('#segments button[aria-label*="人像写真"]');
  out.segColFound = !!col;
  const beforeY = window.scrollY;
  col.click();
  await sleep(1600);
  const dlg = document.querySelector('[role="dialog"][aria-label*="视频作品"]');
  out.overlayOpen = !!dlg;
  if (dlg) {
    const dt = dlg.innerText;
    out.overlayKicker = (dt.split('\\n')[0] || '').trim();
    out.overlayHeading = dlg.querySelector('h2')?.innerText.trim() || '';
    out.overlaySubline = (dt.match(/共\\s*\\d+\\s*支短片[^\\n]*/) || [''])[0].trim();
    out.overlayHasBilibiliBadge = dt.includes('BILIBILI 嵌入播放');
    out.overlayHas4K = /4K|HDR/.test(dt);
    out.overlayThumbs = dlg.querySelectorAll('[aria-label^="播放第"]').length;
    out.overlayArrows = !!dlg.querySelector('[aria-label="下一支"]');
    out.overlaySeq = ((dlg.querySelector('footer')?.innerText || '').match(/\\d{2}\\s*\\/\\s*\\d{2}/) || [''])[0].replace(/\\s/g, '');
    out.overlaySubInfo = (dt.split('\\n').map((l) => l.trim()).find((l) => /^\\d{4} · /.test(l)) || '');
    out.overlayVideoSubNoDuration = !dt.includes('时长');
    out.playBtn = !!dlg.querySelector('[aria-label="播放"]');
    out.iframeBefore = document.querySelectorAll('iframe').length;
    dlg.querySelector('[aria-label="播放"]')?.click();
    await sleep(1200);
    out.iframeAfter = document.querySelectorAll('iframe').length;
    out.iframeSrc = document.querySelector('iframe')?.getAttribute('src') || null;
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(900);
  out.overlayClosed = !document.querySelector('[role="dialog"][aria-label*="视频作品"]');
  out.scrollBefore = beforeY;
  out.scrollAfter = window.scrollY;
  out.scrollPreserved = Math.abs(window.scrollY - beforeY) < 8;
  return JSON.stringify(out);
})()`

// ============================================================ 预约表单（R11 / §7.4）
const FORM_JS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  const setVal = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const errs = () => [...document.querySelectorAll('#contact p.text-red-400')].map((e) => e.innerText.trim());
  document.getElementById('contact').scrollIntoView();
  await sleep(900);
  const form = document.querySelector('#contact form');
  out.formExists = !!form;
  const nameEl = document.getElementById('lead-name');
  const phoneEl = document.getElementById('lead-phone');
  const noteEl = document.getElementById('lead-note');
  out.requiredMark = (document.querySelector('label[for="lead-name"]')?.innerText || '').includes('*');
  out.placeholders = [nameEl?.getAttribute('placeholder'), phoneEl?.getAttribute('placeholder'), noteEl?.getAttribute('placeholder')];

  // ① 空提交 → 必填校验
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await sleep(500);
  out.emptyErrors = errs();

  // ② 非法电话
  setVal(nameEl, '前端联调');
  setVal(phoneEl, '123');
  await sleep(200);
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await sleep(500);
  out.badPhoneErrors = errs();

  // ③ 合法提交
  setVal(nameEl, '前端联调（可删除）');
  setVal(phoneEl, '13900001111');
  setVal(noteEl, '官网表单联调自测，可删除。');
  await sleep(200);
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await sleep(2500);
  const ct = document.getElementById('contact')?.innerText || '';
  out.successShown = ct.includes('已收到，我们会尽快联系您');
  out.resetLink = ct.includes('再填一份');
  out.formGoneAfterSuccess = !document.querySelector('#contact form');
  return JSON.stringify(out);
})()`

// ============================================================ 分享页
function shareJs() {
  return `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2200);
  const T = () => document.body.innerText;
  const out = {};
  out.title = document.title;
  out.pageText = T();
  out.expired = T().includes('链接已失效');
  out.collectionName = document.querySelector('h1')?.innerText.trim() || '';
  out.note = (T().match(/[^\\n]*请勿外传[^\\n]*/) || [''])[0].trim();
  out.infoLine = (T().match(/共\\s*\\d+\\s*支短片[^\\n]*/) || [''])[0].trim();
  out.listTitle = (T().match(/本合集包含[^\\n]*/) || [''])[0].trim();
  out.generated = (T().match(/生成于 \\d{4}\\.\\d{2}\\.\\d{2}/) || [''])[0];
  out.titles = [...document.querySelectorAll('li')].map((li) => (li.innerText || '').split('\\n')[0].trim());
  out.hasBilibiliBadge = T().includes('BILIBILI 嵌入播放');
  out.hasDuration =
    T().includes('时长') ||
    !!document.querySelector('[aria-label="音量"], [aria-label="全屏"], [aria-label="暂停"]');
  out.hasPlayStat = T().includes('播放量') || T().includes('点赞');
  out.hasExternalBili = T().includes('bilibili.com') || T().includes('去 B 站');
  out.hasShareEntry = T().includes('分享');
  out.hasRelatedWorks = T().includes('相关作品');
  out.customerLeak = T().includes('王女士') || T().includes('13800008821');
  out.filing = T().includes('苏ICP备2026000000号-1') && T().includes('苏公网安备32040002000000号');
  const cur = document.querySelector('li button[aria-current="true"], li[aria-current="true"]');
  out.currentRowExists = !!cur;
  out.currentRowBorder = cur ? getComputedStyle(cur).borderColor : null;
  out.currentRowBg = cur ? getComputedStyle(cur).backgroundColor : null;
  out.rows = [...document.querySelectorAll('li')].length;
  out.leftBarPresent = !!document.querySelector('[aria-current="true"] [class*="border-l"]');
  out.playBtn = !!document.querySelector('[aria-label="播放"]');
  return JSON.stringify(out);
})()`
}

function expiredJs() {
  return `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2200);
  const T = () => document.body.innerText;
  return JSON.stringify({
    expired: T().includes('链接已失效'),
    desc: T().includes('该预览链接已到期或被关闭，请联系摄影师重新获取'),
    brand: T().includes('焦点影视'),
    noSelfService: !T().includes('重新申请'),
    title: document.title
  });
})()`
}

async function apiShare(token) {
  const res = await fetch(`${apiBase}/api/share/${encodeURIComponent(token)}`)
  return res.json()
}

// ============================================================ 主流程
async function main() {
  // 先取后端真实数据，作为断言的基准（避免写死文案）
  const siteData = await fetch(`${apiBase}/api/public/site`).then((r) => r.json())
  const segments = siteData.data.segments
  const portraitSeg = segments.find((s) => s.name === '人像写真') ?? segments[0]
  const portraitVideos = await fetch(
    `${apiBase}/api/public/segments/${portraitSeg.id}/videos`
  ).then((r) => r.json())
  const portraitCount = portraitVideos.data.videos.length
  console.log(`API 基准：segments=${segments.length} honors=${siteData.data.honors.length} 人像写真作品=${portraitCount}`)

  // ---------- 首页（桌面 1440） ----------
  console.log('='.repeat(72))
  const home = await openPage(`${frontend}/`)
  const h = JSON.parse(await home.evaluate(HOME_JS))
  home.close()
  console.log('HOME', JSON.stringify(h, null, 1))

  check('首页 SPA 渲染成功（标题正确）', /焦点影视/.test(h.title), h.title)
  check('R2/R3 首屏轮播图数量 = hero_slides 条数（API）', h.heroImgs === siteData.data.hero_slides.length, `imgs=${h.heroImgs} api=${siteData.data.hero_slides.length}`)
  check('R3 三组标语均在 DOM（各图各带标语）', new Set(h.slogans.filter(Boolean)).size >= 3, JSON.stringify(h.slogans))
  check('R4 首屏无任何 CTA 按钮', h.heroHasCTA === false)
  check('SCROLL 提示渲染', h.heroScrollHint === true)
  check('R1/R5-R12 七大区块锚点齐全', ['hero', 'about', 'honors', 'segments', 'contact'].every((s) => h.sections.includes(s)), JSON.stringify(h.sections))
  check('R5 展示年限 = 当年-2017 = 9（滚入视口计数完成）', h.year === '9', `year=${h.year}`)
  check('R5 双层叠印：描边幽灵数字存在且字号 = 前景×1.45', h.ghostExists === true && h.yearFontSize === '208px' && h.ghostFontSize === '302px' && h.ghostStroke === '2px', `fg=${h.yearFontSize} ghost=${h.ghostFontSize} stroke=${h.ghostStroke}`)
  check('R5 行高 = 字号（不被裁切）', h.yearLineHeight === '208px', `${h.yearLineHeight}`)
  check('R5 SINCE 2017 信息列', h.sinceText === 'SINCE 2017', h.sinceText)

  // R6/R7 荣誉展示 · 全息圆柱（2026-09-23 新方案，替代原主展板/转向板/窄板陈列）
  const honors = siteData.data.honors
  check('R6 全息卡数量 = 荣誉条数（≤6）', h.honorCardCount === honors.length && h.honorCardCount <= 6, `cards=${h.honorCardCount} honors=${honors.length}`)
  check('R6 等大等角围成圆柱（每卡 rotateY + translateZ）', h.honorCardTransforms.length === honors.length && h.honorCardTransforms.every((s) => /rotateY/.test(s) && /translateZ/.test(s)), JSON.stringify(h.honorCardTransforms.slice(0, 2)))
  check('R6 卡片标题均来自 API', h.honorCardTitles.every((t) => honors.some((x) => x.title === t)), JSON.stringify(h.honorCardTitles))
  check('R6 当前卡高亮唯一（is-active）', h.honorActiveCount === 1, `active=${h.honorActiveCount}`)
  check('R6 当前卡字段来自 API（标题/等级/机构）', !!h.honorActiveTitle && honors.some((x) => x.title === h.honorActiveTitle && x.level === h.honorActiveLevel && x.issuer === h.honorActiveIssuer), `${h.honorActiveTitle} | ${h.honorActiveLevel} | ${h.honorActiveIssuer}`)
  check('R6 底部径向光晕存在（地面反射）', h.honorHasGlow === true)
  check('R6 旧装饰已移除（网格/射灯/指示点）且无左右箭头', h.honorOldMesh === 0 && h.honorOldSpotlight === 0 && h.honorDots === 0 && h.honorHasArrows === false, `mesh=${h.honorOldMesh} spot=${h.honorOldSpotlight} dots=${h.honorDots}`)
  check('R8 业务板块数量 = segments 条数（API）且均为五列', h.segmentNames.filter((x) => x && x.includes('查看')).length === segments.length && segments.length === 5, JSON.stringify(h.segmentNames))
  check('R8 首列展开态象牙白实心 + 其余 4 列描边', h.ivoryBtn === 1 && h.ghostBtn === segments.length - 1, `ivory=${h.ivoryBtn} ghost=${h.ghostBtn}`)
  check('R9 板块可点击进入作品页', h.segColFound === true)
  check('R9/R10 全屏视频作品页打开', h.overlayOpen === true)
  check('R9 作品页顶栏 kicker「板块·英文名」', /PORTRAIT/.test(h.overlayKicker || ''), h.overlayKicker)
  check('R9 作品页标题「视频作品」', h.overlayHeading === '视频作品', h.overlayHeading)
  check('R9 副行「共 N 支短片 · 支持 B 站嵌入播放」', new RegExp(`共\\s*${portraitCount}\\s*支短片`).test(h.overlaySubline || ''), `${h.overlaySubline} (api=${portraitCount})`)
  check('R10 右上仅「BILIBILI 嵌入播放」标识', h.overlayHasBilibiliBadge === true)
  check('R10 无 4K / HDR 画质标识', h.overlayHas4K === false)
  check('R10 画面副行为「年份 · 类型」且不含时长', /^\d{4} · .+/.test(h.overlaySubInfo || '') && !/:/.test(h.overlaySubInfo || '') && h.overlayVideoSubNoDuration === true, h.overlaySubInfo)
  check('R9 底栏缩略图条 + 前后箭头 + 序号', h.overlayThumbs === portraitCount && h.overlayArrows === true && h.overlaySeq === `01/${String(portraitCount).padStart(2, '0')}`, `thumbs=${h.overlayThumbs} seq=${h.overlaySeq}`)
  check('R9 未播放显示自研控件（封面态）', h.playBtn === true && h.iframeBefore === 0)
  check('R9 点击播放后挂载 B 站 iframe', h.iframeAfter === 1 && /player\.bilibili\.com\/player\.html\?bvid=BV/.test(h.iframeSrc || ''), h.iframeSrc)
  check('§7.3 Esc 关闭作品页', h.overlayClosed === true)
  check('§7.3 关闭后滚动位置不跳变', h.scrollPreserved === true, `before=${h.scrollBefore} after=${h.scrollAfter}`)
  const st = siteData.data.site_settings
  const expectContact = [st.phone, st.email, st.address, st.work_hours].filter(Boolean)
  check('R11 联系区四项信息取自 site_settings（电话/邮箱/地址/工时）', expectContact.length === 4 && expectContact.every((v) => (h.contactText || '').includes(v)), expectContact.filter((v) => !(h.contactText || '').includes(v)).join(' ; ') || 'all present')
  check('R12 页脚备案 ICP + 公安（取自 site_settings）', (h.footerText || '').includes(st.icp_no) && (h.footerText || '').includes(st.police_no), `${h.icp} | ${h.police}`)
  check('R12 版权行', (h.copyright || '').includes(st.copyright), `${h.copyright} | api=${st.copyright}`)
  check('R13 按钮无渐变类', h.hasGradientBtn === false)

  // ---------- 预约表单（R11 / §7.3 / §7.4） ----------
  console.log('='.repeat(72))
  const fCdp = await openPage(`${frontend}/`)
  const f = JSON.parse(await fCdp.evaluate(FORM_JS))
  fCdp.close()
  console.log('FORM', JSON.stringify(f, null, 1))
  check('R11 预约表单渲染（姓名/电话/需求 三字段 + 必填星号）', f.formExists === true && f.requiredMark === true && f.placeholders?.length === 3, JSON.stringify(f.placeholders))
  check('§7.4 空提交触发必填校验', f.emptyErrors.some((x) => x.includes('姓名')) && f.emptyErrors.some((x) => x.includes('联系电话')), JSON.stringify(f.emptyErrors))
  check('§7.4 非法电话提示「请填写正确的 11 位手机号或含区号固话」', f.badPhoneErrors.some((x) => x.includes('正确的') && x.includes('11 位手机号') && x.includes('固话')), JSON.stringify(f.badPhoneErrors))
  check('R11 合法提交返回成功态「已收到，我们会尽快联系您」+「再填一份」', f.successShown === true && f.resetLink === true && f.formGoneAfterSuccess === true)

  // API 契约：参数缺失 / 非法电话 → code 1001，且不落库
  const postLead = async (body) => {
    const res = await fetch(`${apiBase}/api/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return { status: res.status, body: await res.json() }
  }
  const bad1 = await postLead({ name: '校验测试', phone: '' })
  const bad2 = await postLead({ name: '', phone: '13900001111' })
  const bad3 = await postLead({ name: '校验测试', phone: '123' })
  check('§3.2 leads 缺电话 → code 1001（HTTP 200）', bad1.body.code === 1001 && bad1.status === 200, `http=${bad1.status} code=${bad1.body.code}`)
  check('§3.2 leads 缺姓名 → code 1001（HTTP 200）', bad2.body.code === 1001 && bad2.status === 200, `http=${bad2.status} code=${bad2.body.code}`)
  check('§3.2 leads 非法电话 → code 1001（HTTP 200）', bad3.body.code === 1001 && bad3.status === 200, `http=${bad3.status} code=${bad3.body.code}`)

  // ---------- 分享页（有效 token，与 API 交叉比对） ----------
  console.log('='.repeat(72))
  let okToken = VALID_TOKEN
  if (!okToken || (await apiShare(okToken)).code !== 0) {
    for (const cand of [
      VALID_TOKEN,
      'aC7VylMPixEYy5wm080HYQ',
      'pgHGmb2jXQ9rwXsWDks5NA'
    ].filter(Boolean)) {
      const r = await apiShare(cand)
      if (r.code === 0) {
        okToken = cand
        break
      }
    }
  }
  if (!okToken) {
    throw new Error('找不到有效的分享 token，无法验证正常分支')
  }
  console.log('使用有效 token:', okToken)
  const apiData = (await apiShare(okToken)).data
  const sCdp = await openPage(`${frontend}/share/${okToken}`)
  const s = JSON.parse(await sCdp.evaluate(shareJs()))
  sCdp.close()
  console.log('SHARE(valid)', JSON.stringify(s, null, 1))
  console.log('API share data:', JSON.stringify({ name: apiData.collection_name, videos: apiData.videos.map((v) => v.title) }))

  check('R15 分享页正常态（非失效页）', s.expired === false)
  check('R15 合集名与 API 一致（后端真实数据）', s.collectionName === apiData.collection_name, `dom=${s.collectionName} api=${apiData.collection_name}`)
  check('R15 一句说明 note 渲染（与 API 一致）', (s.pageText || '').includes(apiData.note), apiData.note)
  check('R15 说明行「共 N 支短片」', new RegExp(`共\\s*${apiData.videos.length}\\s*支短片`).test(s.infoLine || ''), s.infoLine)
  check('R15 清单标题「本合集包含 · N 支」', new RegExp(`本合集包含\\s*·\\s*${apiData.videos.length}\\s*支`).test(s.listTitle || ''), s.listTitle)
  check('R15 清单条数与 API 一致', s.rows === apiData.videos.length, `rows=${s.rows} api=${apiData.videos.length}`)
  check('R15 清单顺序与 API 勾选顺序一致', apiData.videos.every((v) => s.titles.includes(v.title)) && s.titles[0] === apiData.videos[0].title, JSON.stringify(s.titles))
  check('R15 生成于 YYYY.MM.DD', /生成于 \d{4}\.\d{2}\.\d{2}/.test(s.generated || ''), s.generated)
  check('R10 主播放器右上 BILIBILI 嵌入播放标识', s.hasBilibiliBadge === true)
  check('R9 分享页主播放器显示播放键', s.playBtn === true)
  check('R17 当前项金色描边高亮', s.currentRowExists === true && /196,\s*154,\s*74/.test(s.currentRowBorder || ''), s.currentRowBorder)
  check('R17 当前项极淡暖底', /rgba\(196,\s*154,\s*74/.test(s.currentRowBg || ''), s.currentRowBg)
  check('R17 无左侧竖条', s.leftBarPresent === false)
  check('R16 无时长显示', s.hasDuration === false)
  check('R16 无播放量/点赞数据', s.hasPlayStat === false)
  check('R16 无外跳 B 站按钮', s.hasExternalBili === false)
  check('R16 无分享入口', s.hasShareEntry === false)
  check('R16 无相关作品/作品参数区', s.hasRelatedWorks === false)
  check('R12 分享页页脚备案两行', (s.pageText || '').includes(siteData.data.site_settings.icp_no) && (s.pageText || '').includes(siteData.data.site_settings.police_no))
  check('安全 不泄露客户名/联系方式', s.customerLeak === false && !/1[3-9]\d{9}/.test(s.pageText || ''), s.customerLeak ? '命中客户字段' : 'no leak')

  // ---------- 分享页（失效 token / 真实过期 token） ----------
  console.log('='.repeat(72))
  for (const [label, token] of [
    ['失效 token', 'bogus-token-xyz'],
    ['真实过期 token', EXPIRED_TOKEN || 'pgHGmb2jXQ9rwXsWDks5NA']
  ]) {
    const api = await apiShare(token)
    const eCdp = await openPage(`${frontend}/share/${token}`)
    const e = JSON.parse(await eCdp.evaluate(expiredJs()))
    eCdp.close()
    console.log(`EXPIRED(${label})`, JSON.stringify(e), '| api.code=', api.code)
    check(`R18 ${label}：API 返回 4001`, api.code === 4001, String(api.code))
    check(`R18 ${label}：渲染失效页`, e.expired === true && e.desc === true)
    check(`R18 ${label}：保留品牌 logo`, e.brand === true)
    check(`R18 ${label}：不提供自助重新申请入口`, e.noSelfService === true)
  }

  // ---------- 移动端首页（390） ----------
  console.log('='.repeat(72))
  const mCdp = await openPage(`${frontend}/`)
  await mCdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 780,
    deviceScaleFactor: 2,
    mobile: true
  })
  await mCdp.send('Page.navigate', { url: `${frontend}/` })
  await new Promise((r) => setTimeout(r, 2500))
  const m = JSON.parse(
    await mCdp.evaluate(`(() => {
      const T = document.body.innerText;
      return JSON.stringify({
        burger: !!document.querySelector('[aria-label="打开菜单"]'),
        navHidden: !document.querySelector('nav[aria-label="主导航"]')?.getClientRects().length,
        bandCount: [...document.querySelectorAll('#segments button')].filter((b) => b.getBoundingClientRect().height === 96).length,
        viewAllText: T.includes('查看作品'),
        heroFullscreen: Math.round(document.getElementById('hero').getBoundingClientRect().height)
      });
    })()`)
  )
  mCdp.close()
  console.log('HOME(mobile 390)', JSON.stringify(m))
  check('R14 移动端汉堡菜单按钮存在', m.burger === true)
  check('R14 移动端桌面导航隐藏', m.navHidden === true)
  check('R14 业务板块转为纵向图带（96 高，数量 = segments）', m.bandCount === segments.length, `bands=${m.bandCount}`)
  check('R14 移动端无桌面「查看作品」按钮', m.viewAllText === false)
  check('R14 首屏仍全屏', m.heroFullscreen >= 700, `${m.heroFullscreen}px`)

  console.log('='.repeat(72))
  console.log(`RESULT: ${passes.length} passed, ${fails.length} failed`)
  if (fails.length) {
    console.log('FAILED: ' + fails.join('; '))
    process.exit(1)
  }
  console.log('RESULT: ALL CHECKS PASSED')
}

main().catch((err) => {
  console.error('CDP VERIFY ERROR:', err)
  process.exit(2)
})
