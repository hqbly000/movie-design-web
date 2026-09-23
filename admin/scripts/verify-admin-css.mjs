/**
 * 管理后台 CSS 完整性审计：
 * 扫描 src 中用到的所有 ad-* 组件类，逐一核对构建产物 CSS 是否真的包含对应规则。
 * 防止"类名被 Tailwind 内容扫描误清除"这类静默样式丢失（2026-09-23 按钮失去颜色的事故）。
 *
 * 用法：node scripts/verify-admin-css.mjs [distDir]
 * 退出码：0 = 全部存在；1 = 有缺失
 */
import fs from 'node:fs'
import path from 'node:path'

const distDir = process.argv[2] || 'dist'
const SRC = 'src'

/** Vue 过渡名 / 动画名，不是类名，跳过 */
const TRANSITION_NAMES = new Set(['ad-fade', 'ad-toast', 'ad-pop-in', 'ad-slide-up'])

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(vue|ts|js)$/.test(name)) out.push(p)
  }
  return out
}

// 1) 收集 src 中用到的 ad-* 类（排除 CSS 变量 --ad-*、过渡/动画名、注释里的文字）
const used = new Map() // class -> [file:line]
for (const file of walk(SRC)) {
  const raw = fs.readFileSync(file, 'utf8')
  // 去掉注释：HTML 注释 / 块注释 / 行注释（避免说明文字里的 ad-btn-${variant} 之类误报）
  const code = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')
  const lines = code.split('\n')
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/(?<![\w-])ad-[a-z][a-z0-9-]*/g)) {
      const token = m[0]
      if (token.endsWith('-')) continue // 拼接残留（ad-btn-）
      if (line[m.index - 1] === '-') continue // 复合词中段
      if (line.slice(0, m.index).trimEnd().endsWith('--')) continue // CSS 变量
      if (TRANSITION_NAMES.has(token)) continue
      const list = used.get(token) ?? []
      list.push(`${path.basename(file)}:${i + 1}`)
      used.set(token, list)
    }
  })
}

// 2) 收集产物 CSS 中定义的 ad-* 类（去掉 scoped 属性后缀）
const cssFiles = []
function walkDist(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walkDist(p, out)
    else if (name.endsWith('.css')) out.push(p)
  }
  return out
}
let css = ''
for (const f of walkDist(distDir)) css += fs.readFileSync(f, 'utf8')
const defined = new Set([...css.matchAll(/\.((?:ad-)[a-z0-9-]+)/g)].map((m) => m[1]))

// 3) 比对
const missing = [...used.keys()].filter((c) => !defined.has(c))
console.log(`src 中使用的 ad-* 类：${used.size} 个`)
console.log(`产物 CSS 中定义的 ad-* 类：${defined.size} 个`)
if (missing.length === 0) {
  console.log('\n✅ 全部存在，无静默丢失')
} else {
  console.log('\n❌ 以下类被使用但产物 CSS 中不存在：')
  for (const c of missing) {
    console.log(`  .${c}  ←  ${used.get(c).slice(0, 3).join(', ')}${used.get(c).length > 3 ? ` 等 ${used.get(c).length} 处` : ''}`)
  }
}
process.exit(missing.length === 0 ? 0 : 1)
