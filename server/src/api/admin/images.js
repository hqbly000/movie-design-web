import { Router } from 'express';
import db from '../../db.js';

const router = Router();

export const IMAGE_SECTIONS = ['hero', 'showcase_poster'];
const URL_WHITELIST_RE = /^https?:\/\//i;

function cleanSrc(src) {
  const value = String(src || '').trim();
  if (!value) return null;
  if (!URL_WHITELIST_RE.test(value) && !value.startsWith('/uploads/')) return null;
  return value;
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM images ORDER BY section ASC, sort ASC, id ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { section, src, alt, sort } = req.body || {};
  const clean = cleanSrc(src);
  if (!clean) {
    return res.status(400).json({ error: '图片地址必须是 http(s) 外链或 /uploads/ 上传文件' });
  }
  const sec = IMAGE_SECTIONS.includes(section) ? section : 'showcase_poster';
  const info = db
    .prepare('INSERT INTO images (section, src, alt, sort) VALUES (?, ?, ?, ?)')
    .run(sec, clean, String(alt || '').trim(), Number.isFinite(Number(sort)) ? Number(sort) : 0);
  res.json(db.prepare('SELECT * FROM images WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '图片不存在' });
  const { section, src, alt, sort, visible } = req.body || {};

  if (src !== undefined) {
    const clean = cleanSrc(src);
    if (!clean) return res.status(400).json({ error: '图片地址必须是 http(s) 外链或 /uploads/ 上传文件' });
  }

  db.prepare('UPDATE images SET section = ?, src = ?, alt = ?, sort = ?, visible = ? WHERE id = ?').run(
    section !== undefined && IMAGE_SECTIONS.includes(section) ? section : row.section,
    src !== undefined ? cleanSrc(src) : row.src,
    alt !== undefined ? String(alt).trim() : row.alt,
    sort !== undefined && Number.isFinite(Number(sort)) ? Number(sort) : row.sort,
    visible !== undefined ? (visible ? 1 : 0) : row.visible,
    row.id
  );
  res.json(db.prepare('SELECT * FROM images WHERE id = ?').get(row.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: '图片不存在' });
  res.json({ ok: true });
});

export default router;
