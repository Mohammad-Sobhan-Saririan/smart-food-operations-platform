import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { protect, can } from '../middleware/authMiddleware.js';

const router = express.Router();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' };
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return { mime: 'image/png', ext: '.png' };
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: '.webp' };
  return null;
}

router.post('/', protect, can('admin', 'barista'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const type = detectImageType(req.file.buffer);
  if (!type || req.file.mimetype !== type.mime) {
    return res.status(415).json({ message: 'Only valid JPEG, PNG, or WebP images are accepted.' });
  }
  const imagesDir = path.resolve(process.cwd(), 'images');
  await fs.mkdir(imagesDir, { recursive: true });
  const filename = `product-${crypto.randomUUID()}${type.ext}`;
  await fs.writeFile(path.join(imagesDir, filename), req.file.buffer, { flag: 'wx' });
  res.status(201).json({ message: 'Image uploaded successfully', imageUrl: `/images/${filename}` });
});

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: `Image exceeds the ${MAX_IMAGE_BYTES / 1024 / 1024} MB limit.` });
  }
  return next(error);
});

export { detectImageType, MAX_IMAGE_BYTES };
export default router;
