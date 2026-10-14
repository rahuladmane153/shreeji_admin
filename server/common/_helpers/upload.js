const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const keys = require('../keys/keys');
const { AppError } = require('./response');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Multer instance that stores files under UPLOAD_DIR/<subfolder>/.
 * The request must carry req.uploadSubdir (set by the controller) or it
 * falls back to "misc".
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sub = req.uploadSubdir || 'misc';
    cb(null, ensureDir(path.join(keys.UPLOAD_DIR, sub)));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: keys.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    return cb(new AppError(415, 'Unsupported file type. Upload a JPG, PNG, WEBP or PDF'));
  },
});

// Path stored in DB is relative to UPLOAD_DIR so it survives folder moves
const toRelativePath = (absPath) => path.relative(keys.UPLOAD_DIR, absPath).split(path.sep).join('/');

const sha256File = (absPath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absPath);
    stream.on('error', reject);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

module.exports = { upload, toRelativePath, sha256File };
