import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, '..', '..', '..', 'uploads');
fs.mkdirSync(uploadsRoot, { recursive: true });

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const month = new Date().toISOString().slice(0, 7).replace('-', '');
    const dir = path.join(uploadsRoot, month);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = MIME_EXT[file.mimetype] || path.extname(file.originalname).slice(1) || 'bin';
    cb(null, `${crypto.randomBytes(8).toString('hex')}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (MIME_EXT[file.mimetype]) return cb(null, true);
    cb(new Error('只支持上传图片（jpg/png/webp/gif/avif）'));
  }
});

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '未收到文件' });
    const relative = path.relative(uploadsRoot, req.file.path).split(path.sep).join('/');
    res.json({ ok: true, url: `/uploads/${relative}` });
  });
});

export default router;
