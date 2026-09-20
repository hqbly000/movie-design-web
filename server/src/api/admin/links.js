import crypto from 'node:crypto';
import { Router } from 'express';
import db from '../../db.js';

const router = Router();

const DURATIONS = [
  { hours: 1, label: '1 小时' },
  { hours: 6, label: '6 小时' },
  { hours: 24, label: '24 小时' },
  { hours: 72, label: '3 天' }
];

function linkWithItems(id) {
  const link = db.prepare('SELECT * FROM review_links WHERE id = ?').get(id);
  if (!link) return null;
  const items = db
    .prepare(
      `SELECT i.sort, i.video_id, i.image_id,
              v.title AS video_title, v.bvid AS video_bvid, v.cover AS video_cover,
              img.src AS image_src, img.alt AS image_alt
       FROM review_link_items i
       LEFT JOIN videos v ON v.id = i.video_id
       LEFT JOIN images img ON img.id = i.image_id
       WHERE i.link_id = ?
       ORDER BY i.sort ASC, i.id ASC`
    )
    .all(id);
  return { ...link, items };
}

/** 全量列表（含剩余状态），并附带当前视频/图片供新建时勾选 */
router.get('/', (req, res) => {
  const links = db
    .prepare('SELECT * FROM review_links ORDER BY created_at DESC, id DESC')
    .all()
    .map((link) => ({ ...link, fullUrl: buildLinkUrl(req, link.token) }));
  res.json(links);
});

export function buildLinkUrl(req, token) {
  const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/+$/, '')}/p/${token}`;
}

router.get('/meta', (req, res) => {
  res.json({
    durations: DURATIONS,
    videos: db.prepare('SELECT id, title, bvid, cover FROM videos WHERE visible = 1 ORDER BY sort ASC, id ASC').all(),
    images: db.prepare('SELECT id, src, alt FROM images WHERE visible = 1 ORDER BY sort ASC, id ASC').all()
  });
});

router.post('/', (req, res) => {
  const { title, note, hours, videoIds, imageIds } = req.body || {};

  const duration = Number.isFinite(Number(hours)) ? Number(hours) : 1;
  if (duration <= 0 || duration > 24 * 30) {
    return res.status(400).json({ error: '有效时长必须在 1 小时 ~ 30 天之间' });
  }
  const videos = (Array.isArray(videoIds) ? videoIds : []).map(Number).filter(Number.isInteger);
  const images = (Array.isArray(imageIds) ? imageIds : []).map(Number).filter(Number.isInteger);
  if (!videos.length && !images.length) {
    return res.status(400).json({ error: '至少选择一个视频或图片' });
  }

  const token = crypto.randomBytes(16).toString('base64url');
  const expiresAt = new Date(Date.now() + duration * 3600 * 1000).toISOString();

  let linkId;
  db.exec('BEGIN');
  try {
    const info = db
      .prepare('INSERT INTO review_links (token, title, note, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, String(title || '').trim() || '客户审片', String(note || '').trim(), expiresAt);
    linkId = Number(info.lastInsertRowid);
    const insert = db.prepare(
      'INSERT INTO review_link_items (link_id, video_id, image_id, sort) VALUES (?, ?, ?, ?)'
    );
    let sort = 0;
    for (const vid of videos) {
      if (db.prepare('SELECT id FROM videos WHERE id = ?').get(vid)) {
        insert.run(linkId, vid, null, sort++);
      }
    }
    for (const iid of images) {
      if (db.prepare('SELECT id FROM images WHERE id = ?').get(iid)) {
        insert.run(linkId, null, iid, sort++);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  const link = linkWithItems(linkId);
  link.fullUrl = buildLinkUrl(req, link.token);
  res.json(link);
});

/** 禁用 / 启用 / 续期 */
router.patch('/:id', (req, res) => {
  const link = db.prepare('SELECT * FROM review_links WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).json({ error: '链接不存在' });
  const { disabled, extendHours } = req.body || {};

  let expiresAt = link.expires_at;
  const wasDisabled = !!link.disabled;

  if (extendHours !== undefined) {
    const hours = Number(extendHours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 30) {
      return res.status(400).json({ error: '续期时长不合法' });
    }
    // 已过期/禁用的链接从当前时间起算；未过期的从原到期时间顺延
    const expired = new Date(link.expires_at).getTime() < Date.now();
    const base = expired || wasDisabled ? Date.now() : new Date(link.expires_at).getTime();
    expiresAt = new Date(base + hours * 3600 * 1000).toISOString();
  }

  db.prepare('UPDATE review_links SET disabled = ?, expires_at = ? WHERE id = ?').run(
    disabled !== undefined ? (disabled ? 1 : 0) : link.disabled,
    expiresAt,
    link.id
  );
  res.json(linkWithItems(link.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM review_links WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: '链接不存在' });
  res.json({ ok: true });
});

export default router;
