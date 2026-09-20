import { Router } from 'express';
import db from '../db.js';
import { embedUrl } from '../bilibili.js';
import { renderReviewPage, renderExpiredPage } from '../templates/review.js';

const router = Router();

/**
 * 限时审片页：/p/:token
 * 无效 / 禁用 / 过期 → 失效页；有效 → 内容页并记录访问。
 */
router.get('/:token', (req, res) => {
  const link = db
    .prepare('SELECT * FROM review_links WHERE token = ?')
    .get(String(req.params.token || ''));
  if (!link || link.disabled || new Date(link.expires_at).getTime() < Date.now()) {
    res.set('Cache-Control', 'no-store');
    return res.status(404).type('html').send(renderExpiredPage());
  }

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
    .all(link.id);

  db.prepare(
    `UPDATE review_links SET
       visits = visits + 1,
       first_visit_at = COALESCE(first_visit_at, datetime('now', 'localtime'))
     WHERE id = ?`
  ).run(link.id);

  res.set('Cache-Control', 'no-store');
  res.type('html').send(
    renderReviewPage({
      link,
      items,
      embedBase: 'https://player.bilibili.com/player.html?bvid='
    })
  );
});

export default router;
