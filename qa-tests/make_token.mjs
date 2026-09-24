/**
 * 生成一个有效的分享 token 供 cdp-verify / frontend_qa 使用（真实后端）。
 * 合集名不含「分享」二字、且带 note —— 否则 cdp-verify 的
 * 「R16 无分享入口」「R15 一句说明 note 渲染」两条断言会被测试数据本身搞坏。
 */
const API = process.env.QA_API || 'http://127.0.0.1:8000'
process.env.NO_PROXY = '*'
const j = async (r) => ({ status: r.status, body: await r.json() })
const login = await j(await fetch(`${API}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@lightisle.studio', password: 'Admin@123456' })
}))
const tok = login.body?.data?.token
if (!tok) { console.error('login failed', JSON.stringify(login)); process.exit(1) }

const list = await j(await fetch(`${API}/api/admin/videos?page=1&size=50`, {
  headers: { Authorization: `Bearer ${tok}` }
}))
const videoIds = (list.body?.data?.items || [])
  .filter((v) => v.status === 'published')
  .slice(0, 3)
  .map((v) => v.id)
if (videoIds.length === 0) { console.error('no published videos'); process.exit(1) }

const dist = await j(await fetch(`${API}/api/admin/distributions`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
  body: JSON.stringify({
    collection_name: 'QA回归预览合集',
    customer_name: 'QA客户',
    duration_type: '1h',
    note: '仅供预览确认，请勿外传。',
    video_ids: videoIds
  })
}))
const share = dist.body?.data?.token
if (!share) { console.error('create distribution failed', JSON.stringify(dist)); process.exit(1) }
console.log(share)
