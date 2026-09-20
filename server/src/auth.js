import crypto from 'node:crypto';
import db from './db.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
export const SESSION_COOKIE = 'mdw_session';

function secret() {
  return process.env.SESSION_SECRET || 'dev-insecure-secret';
}

/** scrypt 生成密码哈希，格式：salt:hash（均 hex） */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** 校验密码（timing safe） */
export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

/**
 * 签发 Session Cookie 值：uid.过期时间戳.签名
 */
export function createSessionValue(userId) {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/** 校验 Session 值，有效返回 userId，否则 null */
export function verifySessionValue(value) {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts;
  const payload = `${uid}.${exp}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return Number(uid);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/'
  };
}

/** 登录用户名+密码，成功返回用户行 */
export function login(username, password) {
  const user = db
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .get(String(username || '').trim());
  if (!user) return null;
  if (!verifyPassword(String(password || ''), user.password_hash)) return null;
  return user;
}

/** requireAdmin 中间件：未登录返回 401 */
export function requireAdmin(req, res, next) {
  const uid = verifySessionValue(req.cookies?.[SESSION_COOKIE]);
  if (!uid) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  req.adminUserId = uid;
  next();
}
