#!/usr/bin/env node
/**
 * 静态产物部署完整性核对（admin / frontend 通用）
 *
 * 背景：Vite 产物是 index.html + assets/ 下一组**互相引用**的 chunk。
 * 只要有一个 chunk 没上传成功，入口虽能加载、登录页也能显示，但路由懒加载
 * 会在 `Failed to fetch dynamically imported module` 处静默失败 ——
 * 表现为「点登录没反应 / 登录成功后不跳转 / 切页面白屏」。
 *
 * 本脚本从 index.html 出发，把整张 chunk 依赖图爬完，逐个 HEAD 探测，
 * 报告缺失文件。部署后跑一次即可确认线上产物是否完整。
 *
 * 用法：
 *   node scripts/verify-static-integrity.mjs http://124.223.29.189:19010          # 管理后台
 *   node scripts/verify-static-integrity.mjs http://124.223.29.189                # 官网
 *   node scripts/verify-static-integrity.mjs http://127.0.0.1:4174 --quiet
 *
 * 退出码：0 全部存在；1 有缺失（缺失清单同时打印）
 */
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const QUIET = process.argv.includes('--quiet')
const origin = (args[0] || '').replace(/\/$/, '')
if (!origin) {
  console.error('用法：node scripts/verify-static-integrity.mjs <origin> [--quiet]')
  process.exit(2)
}

const ASSET_RE = /["'`]([^"'`\s]+\.(?:js|css))["'`]/g

/** 从 JS/CSS 文本里抽出同源的 chunk 引用（跳过 http/data/绝对外链） */
function extractRefs(text, fromUrl) {
  const out = new Set()
  for (const m of text.matchAll(ASSET_RE)) {
    const raw = m[1]
    if (/^(https?:|data:|blob:|\/\/)/.test(raw)) continue
    // Vite 的 mapDeps 里是 "assets/X-xxxx.js"（不带前导 ./），按「相对站点根」解析；
    // 带 ./ 或 ../ 的才是相对当前模块
    const abs = raw.startsWith('.')
      ? new URL(raw, fromUrl).href
      : new URL(raw.replace(/^\//, '/'), origin + '/').href
    if (abs.startsWith(origin)) out.add(abs)
  }
  return out
}

const status = new Map() // url -> number | 'ERR'
const textCache = new Map()

async function probe(url) {
  if (status.has(url)) return status.get(url)
  let code
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow' })
    code = r.status
    if (r.ok && /\.(js|css)$/.test(new URL(url).pathname)) textCache.set(url, await r.text())
  } catch (e) {
    code = 'ERR:' + (e.cause?.code || e.message)
  }
  status.set(url, code)
  return code
}

const indexUrl = `${origin}/`
const indexRes = await fetch(indexUrl)
const indexHtml = await indexRes.text()

const entry = [...extractRefs(indexHtml, indexUrl)].filter((u) => u.startsWith(`${origin}/`))
const queue = [...entry]
const visited = new Set()
const referencedBy = new Map()

while (queue.length) {
  const url = queue.shift()
  if (visited.has(url)) continue
  visited.add(url)
  const code = await probe(url)
  if (code !== 200) continue
  let text = textCache.get(url)
  if (text == null) {
    const r = await fetch(url)
    text = await r.text()
  }
  for (const ref of extractRefs(text, url)) {
    if (!visited.has(ref)) {
      if (!referencedBy.has(ref)) referencedBy.set(ref, url)
      queue.push(ref)
    }
  }
}

const all = [...status.keys()].sort()
const missing = all.filter((u) => status.get(u) !== 200)

if (!QUIET) {
  console.log(`站点：${origin}`)
  console.log(`index.html：HTTP ${indexRes.status}，入口资源 ${entry.length} 个`)
  console.log(`依赖图规模：${all.length} 个资源\n`)
  for (const u of all) {
    const c = status.get(u)
    console.log(`${String(c).padEnd(4)} ${u.replace(origin, '')}`)
  }
  console.log('')
}

if (missing.length) {
  console.log(`❌ 缺失 ${missing.length} / ${all.length} 个资源：\n`)
  for (const u of missing) {
    const by = referencedBy.get(u)
    console.log(`   ${u.replace(origin, '')}`)
    if (by) console.log(`      ← 被引用于 ${by.replace(origin, '')}`)
  }
  console.log('\n原因：服务器上的 dist 不完整（上传中断 / 只传了部分文件）。')
  console.log('处理：本地重新 `npm run build`，把整个 dist 整体覆盖上传（先清空 assets/ 再传）。')
  process.exit(1)
}

console.log(`✅ 产物完整：${all.length} / ${all.length} 个资源全部命中`)
process.exit(0)
