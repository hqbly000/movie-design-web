import { Router } from 'express';
import db from '../db.js';

const router = Router();

/**
 * 官网运行时公开内容接口（只读，无需鉴权）。
 * 返回可见的视频（最多 3 个）与首页图片（hero）。
 */
router.get('/home', (req, res) => {
  const videos = db
    .prepare('SELECT id, title, bvid, cover FROM videos WHERE visible = 1 ORDER BY sort ASC, id ASC LIMIT 3')
    .all();
  const heroImage = db
    .prepare("SELECT src, alt FROM images WHERE section = 'hero' AND visible = 1 ORDER BY sort ASC, id ASC LIMIT 1")
    .get();
  res.json({ videos, heroImage: heroImage || null });
});

export default router;
