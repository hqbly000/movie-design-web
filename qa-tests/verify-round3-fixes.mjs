/**
 * 第三轮验收修复 · CDP 验证
 *  1) PC 端首屏自动轮播：指针在首屏内移动（悬停暂停）后仍会自动续播
 *  2) 分享页：点击合集清单可切换主播放器（含 B 站 iframe 已接管时切换）
 *  3) 分享页：主播放器撑满内容列宽度（16:9 不再被钉死 342）
 * 用法：node qa-tests/verify-round3-fixes.mjs <cdpPort> <frontendBase> [apiBase]
 */
import fs from 'node:fs'

const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:4173'
const apiBase = process.argv[4] || 'http://127.0.0.1:8000'
const DEBUG = `http://127.0.0.1:${port}`
const SHOTS = 'docs/qa-shots'
process.env.NO_PROXY = '*'
process.env.no_proxy = '*'
fs.mkdirSync(SHOTS, { recursive: true })

let pass = 0
let fail = 0
function check(label, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${detail ? ` :: ${detail}` : ''}`)
  cond ? pass++ : fail++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class CDP {
  constructor(ws) {
    this.ws = ws
    this.seq = 0
    this.pending = new Map()
    this.errors = []
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        this.errors.push((m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160))
      }
      if (m.method === 'Runtime.exceptionThrown') {
        this.errors.push((m.params.exceptionDetails?.exception?.description || '').slice(0, 160))
      }
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
      }
    }
  }
  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = () => rej(new Error('ws connect failed'))
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
    if (r.exceptionDetails) throw new Error('eval ' + (r.exceptionDetails.exception?.description || ''))
    return r.result.value
  }
  async shot(name, fullPage = false) {
    const d = (await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage })).data
    fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(d, 'base64'))
  }
  close() {
    try {
      this.ws.close()
    } catch {
      /* ignore */
    }
  }
}

/* ---------------- 准备：真实后端造一个含多支视频的分享链接 ---------------- */
async function makeShareToken() {
  const auth = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lightisle.studio', password: 'Admin@123456' })
  }).then((r) => r.json())
  const token = auth?.data?.token
  if (!token) throw new Error('login failed')
  const list = await fetch(`${apiBase}/api/admin/videos?page=1&size=50`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.json())
  const videos = (list?.data?.items || []).filter((v) => v.status === 'published')
  if (videos.length < 3) throw new Error(`published videos < 3 (got ${videos.length})`)
  const ids = videos.slice(0, 3).map((v) => v.id)
  const dist = await fetch(`${apiBase}/api/admin/distributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      collection_name: 'R3 回归 · 修复验证合集',
      customer_name: 'QA',
      duration_type: '1h',
      video_ids: ids
    })
  }).then((r) => r.json())
  const share = dist?.data?.token
  if (!share) throw new Error('create distribution failed: ' + JSON.stringify(dist).slice(0, 200))
  return { share, titles: videos.slice(0, 3).map((v) => v.title) }
}

const { share: shareToken, titles } = await makeShareToken()
console.log(`分享链接 token = ${shareToken}，期望顺序 = ${JSON.stringify(titles)}`)

async function openPage(url, width = 1440, height = 900, mobile = false) {
  const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
  const c = await CDP.connect(t.webSocketDebuggerUrl)
  await c.send('Page.enable')
  await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile
  })
  await c.send('Page.navigate', { url })
  await sleep(2600)
  return c
}

/* ======================= 1. PC 首屏自动轮播 ======================= */
console.log('\n-- 1. PC 端首屏自动轮播 --')
let cdp = await openPage(`${base}/`, 1440, 900, false)

const heroProbe = `(() => {
  const slides = Array.from(document.querySelectorAll('#hero > div')).filter((d) => d.hasAttribute('aria-hidden'))
  const idx = slides.findIndex((d) => d.getAttribute('aria-hidden') === 'false')
  return JSON.stringify({ idx, total: slides.length })
})()`

const h0 = JSON.parse(await cdp.evaluate(heroProbe))
check('首屏三张且当前索引有效', h0.total === 3 && h0.idx >= 0, JSON.stringify(h0))

// 真实指针事件：进入首屏并持续移动（模拟 PC 用户操作鼠标）
for (const [x, y] of [[700, 400], [720, 420], [760, 380], [700, 450]]) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  await sleep(120)
}

// 之后不再动鼠标：悬停暂停应在 idleResume(2.6s) 后自动续播
const seen = new Set([h0.idx])
const t0 = Date.now()
while (Date.now() - t0 < 16000 && seen.size < 2) {
  const s = JSON.parse(await cdp.evaluate(heroProbe))
  seen.add(s.idx)
  if (seen.size >= 2) break
  await sleep(700)
}
check(
  '指针移动后仍会自动续播（PC 端不再永久暂停）',
  seen.size >= 2,
  `观察到索引序列 = ${JSON.stringify([...seen])}，耗时 ${Date.now() - t0}ms`
)

const heroMove = await cdp.evaluate(`(() => {
  const active = document.querySelector('#hero [aria-hidden="false"] img')
  return JSON.stringify({
    kenburns: active ? getComputedStyle(active).transform.slice(0, 30) : null
  })
})()`)
check('首屏 Ken Burns 仍在运行', /matrix/.test(JSON.parse(heroMove).kenburns || ''), heroMove)
await cdp.shot('hero-1440-desktop')
cdp.close()

/* ======================= 2 & 3. 分享页 ======================= */
console.log('\n-- 2/3. 分享页切换 + 播放器宽度 --')
cdp = await openPage(`${base}/share/${shareToken}`, 1440, 900, false)
await sleep(1200)

const layout = await cdp.evaluate(`(() => {
  const rows = Array.from(document.querySelectorAll('ul[aria-label="合集清单"] > li'))
  const player = document.querySelector('section .aspect-video')
  const sec = player ? player.closest('section') : null
  const cs = sec ? getComputedStyle(sec) : null
  const contentW = sec && cs
    ? Math.round(sec.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
    : 0
  const info = document.querySelector('section .font-latin.text-\\\\[13px\\\\]')
  const rowBtn = rows[0] ? rows[0].querySelector('button') : null
  return JSON.stringify({
    rows: rows.length,
    rowTexts: rows.map((li) => li.querySelector('span.block')?.textContent?.trim() || ''),
    playerW: player ? Math.round(player.getBoundingClientRect().width) : 0,
    playerH: player ? Math.round(player.getBoundingClientRect().height) : 0,
    contentW,
    rowW: rowBtn ? Math.round(rowBtn.getBoundingClientRect().width) : 0,
    seq: info ? info.textContent.trim() : null
  })
})()`)
const L = JSON.parse(layout)
check('分享页清单渲染出 3 行', L.rows === 3, JSON.stringify(L.rowTexts))
check(
  '播放器撑满内容区（与清单行等宽，无 342 死宽）',
  L.playerW > 0 && Math.abs(L.playerW - L.contentW) <= 1 && Math.abs(L.playerW - L.rowW) <= 1,
  `player=${L.playerW} content=${L.contentW} row=${L.rowW}`
)
check('播放器保持 16:9', Math.abs(L.playerH / L.playerW - 9 / 16) < 0.02, `${L.playerW}x${L.playerH}`)
check('首支序号为 01', L.seq === '01', String(L.seq))
await cdp.shot('share-desktop-player')

// 点击第二行 → 切换
await cdp.evaluate(`document.querySelectorAll('ul[aria-label="合集清单"] > li button')[1].click()`)
await sleep(900)
const after1 = await cdp.evaluate(`(() => {
  const info = document.querySelector('section .font-latin.text-\\\\[13px\\\\]')
  const title = info ? info.parentElement.querySelector('.font-serif')?.textContent?.trim() : null
  return JSON.stringify({ seq: info ? info.textContent.trim() : null, title })
})()`)
const A1 = JSON.parse(after1)
check('点击清单第 2 行即切换主播放器', A1.seq === '02', JSON.stringify(A1))
check('主播放器标题同步为第 2 支', A1.title === titles[1], `got=${A1.title} want=${titles[1]}`)

const highlighted = await cdp.evaluate(`(() => {
  const rows = Array.from(document.querySelectorAll('ul[aria-label="合集清单"] > li button'))
  const idx = rows.findIndex((b) => b.getAttribute('aria-current') === 'true')
  const s = idx >= 0 ? getComputedStyle(rows[idx]) : null
  return JSON.stringify({ idx, border: s ? s.borderTopColor : null, bg: s ? s.backgroundColor : null })
})()`)
const H = JSON.parse(highlighted)
check('当前项金描边高亮（R17，命中第 2 行）', H.idx === 1 && /196,\s*154,\s*74/.test(H.border || ''), JSON.stringify(H))

// 播放中切换：点中央播放键 → iframe 接管 → 再点第 3 行 → iframe src 应更新
await cdp.evaluate(`document.querySelector('section .aspect-video button[aria-label="播放"]')?.click()`)
await sleep(600)
const embed1 = await cdp.evaluate(`(() => {
  const f = document.querySelector('section .aspect-video iframe')
  return f ? f.getAttribute('src') : null
})()`)
check('点击播放键后 B 站 iframe 接管', !!embed1, String(embed1).slice(0, 70))

await cdp.evaluate(`document.querySelectorAll('ul[aria-label="合集清单"] > li button')[2].click()`)
await sleep(900)
const embed2 = await cdp.evaluate(`(() => {
  const info = document.querySelector('section .font-latin.text-\\\\[13px\\\\]')
  const f = document.querySelector('section .aspect-video iframe')
  const coverBack = !!document.querySelector('section .aspect-video img')
  return JSON.stringify({
    seq: info ? info.textContent.trim() : null,
    src: f ? f.getAttribute('src') : null,
    coverBack
  })
})()`)
const E2 = JSON.parse(embed2)
check('播放中点击清单第 3 行仍可切换', E2.seq === '03', JSON.stringify({ seq: E2.seq }))
check('切换后 iframe 换源（或退回封面态重建）', (E2.src && E2.src !== embed1) || E2.coverBack, JSON.stringify(E2))
await cdp.shot('share-desktop-switched')

// 移动端 390：撑满内容列 = 342
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await sleep(1200)
const mob = await cdp.evaluate(`(() => {
  const player = document.querySelector('section .aspect-video')
  return JSON.stringify({
    w: player ? Math.round(player.getBoundingClientRect().width) : 0,
    h: player ? Math.round(player.getBoundingClientRect().height) : 0,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  })
})()`)
const M = JSON.parse(mob)
check('移动端播放器 342×192（符合设计稿）', Math.abs(M.w - 342) <= 2 && Math.abs(M.h - 192) <= 2, JSON.stringify(M))
check('移动端无横向滚动', M.hScroll === false)
await cdp.shot('share-mobile-player')

// B 站播放器自身的脚本异常不计入本页
const errs = cdp.errors.filter(
  (e) => !/favicon|net::ERR|Failed to load resource|player\.bilibili\.com|bilibili/i.test(e)
)
check('分享页无自有 JS 异常', errs.length === 0, errs.slice(0, 2).join(' | '))
cdp.close()

console.log(`\n===== 第三轮修复验证: PASS ${pass} / FAIL ${fail} =====`)
process.exit(fail === 0 ? 0 : 1)
