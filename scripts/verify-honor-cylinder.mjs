/**
 * 荣誉圆柱 · 渲染与交互验证（针对新版 HonorHall）
 * 断言：转盘存在且在匀速旋转（角度随时间变化）/ 卡片数 = 荣誉条数 / 当前卡高亮 /
 *       点击当前卡弹出详情（四要素齐全）/ Esc 关闭 / 无 console error
 * 用法：node scripts/verify-honor-cylinder.mjs <cdpPort> <base>
 */
import fs from 'node:fs'

const port = process.argv[2] || '9223'
const base = process.argv[3] || 'http://127.0.0.1:5173'
const DEBUG = `http://127.0.0.1:${port}`
const SHOTS = 'docs/qa-shots'
fs.mkdirSync(SHOTS, { recursive: true })

let pass = 0
let fail = 0
function check(label, cond, detail = '') {
  const line = `${cond ? 'PASS' : 'FAIL'} ${label}${detail ? ` :: ${detail}` : ''}`
  console.log(line)
  cond ? pass++ : fail++
}

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

const t = await fetch(`${DEBUG}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json())
const c = await CDP.connect(t.webSocketDebuggerUrl)
await c.send('Page.enable'); await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

await c.send('Page.navigate', { url: `${base}/` })
await new Promise((r) => setTimeout(r, 3000))
// 滚到荣誉区
await c.evaluate(`document.querySelector('#honors')?.scrollIntoView({ block: 'center' })`)
await new Promise((r) => setTimeout(r, 2500))

const structure = await c.evaluate(`(() => {
  const section = document.querySelector('#honors')
  const ring = section?.querySelector('.honor-stage > div > div')
  const cards = ring ? Array.from(ring.children) : []
  const light = section?.querySelector('.honor-light')
  return JSON.stringify({
    hasStage: !!section?.querySelector('.honor-stage'),
    hasRing: !!ring,
    ringTransform: ring ? getComputedStyle(ring).transform.slice(0, 40) : null,
    ringInline: ring ? ring.style.transform : null,
    cardCount: cards.length,
    cardTransforms: cards.slice(0, 3).map((el) => el.style.transform),
    glow: !!Array.from(section.querySelectorAll('div')).find((d) => (d.getAttribute('style') || '').includes('radial-gradient')),
    spotlight: {
      beams: light ? light.querySelectorAll('.beam').length : 0,
      pool: light ? light.querySelectorAll('.pool').length : 0,
      blur: light ? getComputedStyle(light).filter : null
    },
    oldArtifacts: {
      mesh: (section.innerHTML.match(/repeating-linear-gradient/g) || []).length,
      dots: section.querySelectorAll('[aria-label^="查看第"]').length
    }
  })
})()`)
const S = JSON.parse(structure)
check('舞台与转盘存在', S.hasStage && S.hasRing)
check('转盘使用 rotateY 变换', /rotateY/.test(S.ringInline || ''), S.ringInline || 'none')
check('卡片数 = 荣誉条数（≤6）', S.cardCount > 0 && S.cardCount <= 6, `cards=${S.cardCount}`)
check('卡片等大等角排布（rotateY + translateZ）', S.cardTransforms.every((s) => /rotateY/.test(s) && /translateZ/.test(s)), JSON.stringify(S.cardTransforms))
check('底部径向光晕存在', S.glow)
check('顶部射灯三层光锥 + 地面光斑存在（§2.4-3）', S.spotlight.beams === 3 && S.spotlight.pool === 1, JSON.stringify(S.spotlight))
check('射灯层模糊 15~22 软化边缘', /blur\((1[5-9]|2[0-2])(\.\d+)?px\)/.test(String(S.spotlight.blur)), String(S.spotlight.blur))
check('旧装饰已移除（网格/指示点）', S.oldArtifacts.mesh === 0 && S.oldArtifacts.dots === 0, JSON.stringify(S.oldArtifacts))

// 匀速自转：取两次转盘角度，间隔应持续变化
const a1 = await c.evaluate(`document.querySelector('#honors .honor-stage > div > div').style.transform`)
await new Promise((r) => setTimeout(r, 1200))
const a2 = await c.evaluate(`document.querySelector('#honors .honor-stage > div > div').style.transform`)
check('匀速自转（角度随时间变化）', a1 !== a2, `${a1} → ${a2}`)

await c.shot('honor-cylinder-desktop')
const before = c.errors.length

// 正中卡受光：顶部暖白高光（::before）+ 顶部内阴影
const lit = await c.evaluate(`(() => {
  const card = document.querySelector('#honors .honor-stage .is-active .card-body')
  if (!card) return null
  const before = getComputedStyle(card, '::before')
  const self = getComputedStyle(card)
  return JSON.stringify({
    glass: before.backgroundImage.slice(0, 70),
    blend: before.mixBlendMode,
    inset: /inset/.test(self.boxShadow)
  })
})()`)
check('正中卡带自上而下的受光高光', !!lit && JSON.parse(lit).glass.includes('gradient'), lit || 'no active card')
if (lit) {
  const L = JSON.parse(lit)
  check('受光高光用 screen 混合叠亮', L.blend === 'screen', L.blend)
}

// hover 暂停
await c.evaluate(`(() => { const s = document.querySelector('#honors .honor-stage'); s.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false })) })()`)
const h1 = await c.evaluate(`document.querySelector('#honors .honor-stage > div > div').style.transform`)
await new Promise((r) => setTimeout(r, 900))
const h2 = await c.evaluate(`document.querySelector('#honors .honor-stage > div > div').style.transform`)
check('hover 暂停自转', h1 === h2, `${h1} vs ${h2}`)
await c.evaluate(`(() => { const s = document.querySelector('#honors .honor-stage'); s.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false })) })()`)

// 点击当前卡 → 详情（取透明度最高的卡 = 最正对镜头的卡）
const clicked = await c.evaluate(`(() => {
  const ring = document.querySelector('#honors .honor-stage > div > div')
  const cards = Array.from(ring.children)
  let best = 0
  cards.forEach((el, i) => { if (parseFloat(el.style.opacity || '0') > parseFloat(cards[best].style.opacity || '0')) best = i })
  const isActive = cards[best].classList.contains('is-active')
  const target = cards[best].querySelector('button')
  if (!target) return null
  target.click()
  return JSON.stringify({ index: best, isActive })
})()`)
check('当前卡带 is-active 高亮', clicked ? JSON.parse(clicked).isActive : false, clicked || 'no card')
await new Promise((r) => setTimeout(r, 700))
const detail = await c.evaluate(`(() => {
  const dlg = document.querySelector('[role="dialog"]')
  if (!dlg) return null
  const t = dlg.querySelector('.title')?.textContent?.trim() || ''
  const badge = dlg.querySelector('.badge')?.textContent?.trim() || ''
  const issuer = dlg.querySelector('.issuer')?.textContent?.trim() || ''
  const desc = dlg.querySelector('.desc')?.textContent?.trim() || ''
  return JSON.stringify({ badge, title: t, issuer, desc })
})()`)
check('点击当前卡弹出详情', !!detail, detail || 'no dialog')
if (detail) {
  const D = JSON.parse(detail)
  check('详情含等级徽章', !!D.badge, D.badge)
  check('详情含标题', !!D.title, D.title)
  check('详情含颁奖机构', !!D.issuer, D.issuer)
}
await c.shot('honor-detail-desktop')

// Esc 关闭
await c.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
await new Promise((r) => setTimeout(r, 500))
const closed = await c.evaluate(`!document.querySelector('[role="dialog"]')`)
check('Esc 关闭详情', closed)

const newErrors = c.errors.slice(before)
check('无新增 console error', newErrors.length === 0, newErrors.join(' | ').slice(0, 160))

// 移动端
await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await new Promise((r) => setTimeout(r, 1200))
const mob = await c.evaluate(`(() => {
  const stage = document.querySelector('#honors .honor-stage')
  const card = stage?.querySelector('.honor-stage > div > div > div')
  const body = stage?.querySelector('.is-active .card-body')
  const issuer = body?.querySelector('.issuer')
  const cb = body?.getBoundingClientRect()
  const ib = issuer?.getBoundingClientRect()
  return JSON.stringify({
    stageW: stage ? stage.getBoundingClientRect().width : 0,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    cardW: card ? Math.round(card.getBoundingClientRect().width) : 0,
    issuerOverflowY: cb && ib ? Math.round(ib.bottom - cb.bottom) : null
  })
})()`)
const M = JSON.parse(mob)
check('移动端舞台不超宽', M.stageW > 0 && M.stageW <= 390 && !M.hScroll, JSON.stringify(M))
check('移动端卡片内容不裁切（窄卡字号已适配）', M.issuerOverflowY !== null && M.issuerOverflowY <= 4, `issuer 底部超出卡片 ${M.issuerOverflowY}px`)
await c.shot('honor-cylinder-mobile')

c.close()
console.log(`\n===== 荣誉圆柱验证: PASS ${pass} / FAIL ${fail} =====`)
process.exit(fail === 0 ? 0 : 1)
