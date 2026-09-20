import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';

// 极简 .env 加载（server/.env 存在时生效，不覆盖已有环境变量）
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

import db, { seedAdmin } from './db.js';
import { hashPassword, requireAdmin } from './auth.js';
import adminAuth from './api/admin/auth.js';
import adminVideos from './api/admin/videos.js';
import adminImages from './api/admin/images.js';
import adminUpload from './api/admin/upload.js';
import adminLinks from './api/admin/links.js';
import publicApi from './api/public.js';
import reviewRoute from './routes/review.js';

seedAdmin(hashPassword);

const app = express();
app.disable('x-powered-by');
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// ---- 静态资源 ----
const adminUiDir = path.join(__dirname, '..', 'admin-ui');
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', fallthrough: true }));
app.use('/admin', express.static(adminUiDir, { index: 'index.html', extensions: ['html'] }));
app.get('/', (req, res) => res.redirect('/admin'));

// ---- API ----
app.use('/api/admin', adminAuth); // login / logout / me 不需要鉴权
app.use('/api/admin/videos', requireAdmin, adminVideos);
app.use('/api/admin/images', requireAdmin, adminImages);
app.use('/api/admin/upload', requireAdmin, adminUpload);
app.use('/api/admin/links', requireAdmin, adminLinks);
app.use('/api/public', publicApi);
app.use('/p', reviewRoute);

// 404 与错误兜底
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});
app.use((err, req, res, next) => {
  console.error('[server]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: '服务器内部错误' });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`[server] 后台服务已启动: http://127.0.0.1:${port}/admin`);
});
