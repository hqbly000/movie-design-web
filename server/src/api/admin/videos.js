import { Router } from 'express';
import db from '../../db.js';
import { parseBvid } from '../../bilibili.js';

const router = Router();

const URL_WHITELIST_RE = /^https?:\/\//i;

function cleanCover(cover) {
  const value = String(cover || '').trim();
  if (!value) return '';
  if (!URL_WHITELIST_RE.test(value) && !value.startsWith('/uploads/')) {
    return ''; // 只允许 http(s) 外链或本服务上传的文件
  }
  return value;
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM videos ORDER BY sort ASC, id ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { title, bilibiliUrl, cover, sort } = req.body || {};
  const bvid = parseBvid(bilibiliUrl);
  if (!bvid) {
    return res.status(400).json({ error: '无法从链接中解析出 B 站视频（BV 号）' });
  }
  const info = db
    .prepare('INSERT INTO videos (title, bilibili_url, bvid, cover, sort) VALUES (?, ?, ?, ?, ?)')
    .run(
      String(title || '').trim() || `B 站视频 ${bvid}`,
      String(bilibiliUrl || '').trim(),
      bvid,
      cleanCover(cover),
      Number.isFinite(Number(sort)) ? Number(sort) : 0
    );
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '视频不存在' });
  const { title, bilibiliUrl, cover } = req.body || {};
  const sort = req.body?.sort;
  const visible = req.body?.visible;

  let bvid = row.bvid;
  let url = row.bilibili_url;
  if (bilibiliUrl !== undefined) {
    const parsed = parseBvid(bilibiliUrl);
    if (!parsed) return res.status(400).json({ error: '无法从链接中解析出 B 站视频（BV 号）' });
    bvid = parsed;
    url = String(bilibiliUrl).trim();
  }

  db.prepare(
    `UPDATE videos SET
       title = ?, bilibili_url = ?, bvid = ?, cover = ?,
       sort = ?, visible = ?
     WHERE id = ?`
  ).run(
    title !== undefined ? String(title).trim() || row.title : row.title,
    url,
    bvid,
    cover !== undefined ? cleanCover(cover) : row.cover,
    sort !== undefined && Number.isFinite(Number(sort)) ? Number(sort) : row.sort,
    visible !== undefined ? (visible ? 1 : 0) : row.visible,
    row.id
  );
  res.json(db.prepare('SELECT * FROM videos WHERE id = ?').get(row.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: '视频不存在' });
  res.json({ ok: true });
});

export default router;
