import { Router } from 'express';
import db from '../../db.js';
import {
  login,
  createSessionValue,
  verifySessionValue,
  sessionCookieOptions,
  SESSION_COOKIE
} from '../../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = login(username, password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.cookie(SESSION_COOKIE, createSessionValue(user.id), sessionCookieOptions());
  res.json({ ok: true, username: user.username });
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const uid = verifySessionValue(req.cookies?.[SESSION_COOKIE]);
  if (!uid) return res.status(401).json({ error: '未登录' });
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(uid);
  if (!user) return res.status(401).json({ error: '未登录' });
  res.json({ ok: true, username: user.username });
});

export default router;
