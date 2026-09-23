/** 生成一个有效的分享 token 供 cdp-verify / frontend_qa 使用（真实后端） */
const API = process.env.QA_API || 'http://127.0.0.1:8000'
process.env.NO_PROXY = '*'
const j = async (r) => ({ status: r.status, body: await r.json() })
const login = await j(await fetch(`${API}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@lightisle.studio', password: 'Admin@123456' })
}))
const tok = login.body?.data?.token
if (!tok) { console.error('login failed', JSON.stringify(login)); process.exit(1) }
const dist = await j(await fetch(`${API}/api/admin/distributions`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
  body: JSON.stringify({ collection_name: 'QA回归分享合集', customer_name: 'QA客户', duration_type: '1h', video_ids: [1] })
}))
const share = dist.body?.data?.token
if (!share) { console.error('create distribution failed', JSON.stringify(dist)); process.exit(1) }
console.log(share)
