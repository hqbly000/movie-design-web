// QA 静态预览 + API 反向代理（仅用于 QA 验证生产产物，不改动任何业务代码）
// 用法：node preview_proxy.mjs <staticDir> <port> <apiTarget>
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const staticDir = process.argv[2]
const port = Number(process.argv[3] || 4174)
const apiTarget = process.argv[4] || 'http://127.0.0.1:8000'
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8'
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) {
    const chunks = []
    for await (const ch of req) chunks.push(ch)
    const body = Buffer.concat(chunks)
    try {
      const r = await fetch(apiTarget + url.pathname + url.search, {
        method: req.method,
        headers: { ...req.headers, host: new URL(apiTarget).host },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : body
      })
      const buf = Buffer.from(await r.arrayBuffer())
      const h = {}
      r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) h[k] = v })
      res.writeHead(r.status, h); res.end(buf)
    } catch (e) { res.writeHead(502); res.end('proxy error ' + e.message) }
    return
  }
  let file = path.join(staticDir, decodeURIComponent(url.pathname))
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(staticDir, 'index.html')
  const ext = path.extname(file)
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
server.listen(port, '127.0.0.1', () => console.log(`QA preview on http://127.0.0.1:${port} -> ${staticDir} (api -> ${apiTarget})`))
