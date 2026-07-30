import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';
import { db } from '../db/store';

export const uploadRouter = Router();

const PROFILE_DIR = path.join(process.cwd(), 'data', 'profiles');
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PROFILE_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 256 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.dat') || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Solo archivos .dat son aceptados'));
    }
  },
});

uploadRouter.post('/profile', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'NO_FILE', message: 'Archivo requerido' });

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());

    let points: { x: number; y: number }[] = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/).map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        points.push({ x: parts[0], y: parts[1] });
      }
    }

    if (points.length < 5) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'INVALID_PROFILE', message: 'El archivo debe contener al menos 5 coordenadas (x, y)' });
    }

    const name = path.basename(req.file.originalname, '.dat');
    db.saveCustomProfile((req as any).orgId, name, points);

    logger.info({ name, points: points.length }, 'Perfil personalizado subido');
    res.json({ status: 'ok', name, points: points.length });
  } catch (err) {
    logger.error({ err }, 'Error al subir perfil');
    res.status(500).json({ error: 'UPLOAD_FAILED' });
  }
});

uploadRouter.get('/profiles', requireAuth, (req, res) => {
  const profiles = db.listCustomProfiles((req as any).orgId);
  res.json({ profiles });
});
