import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { logger } from './logger';

const DB_PATH = path.join(process.cwd(), 'data', 'optimairwing.db');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function createBackup(): string | null {
  try {
    ensureBackupDir();
    if (!fs.existsSync(DB_PATH)) return null;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `optimairwing-${timestamp}.db`);
    fs.copyFileSync(DB_PATH, backupPath);
    logger.info({ backupPath }, 'Backup de DB creado');
    return backupPath;
  } catch (err) {
    logger.error({ err }, 'Error al crear backup');
    return null;
  }
}

export function listBackups(): { name: string; size: number; date: Date }[] {
  ensureBackupDir();
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db'))
      .map(name => {
        const stat = fs.statSync(path.join(BACKUP_DIR, name));
        return { name, size: stat.size, date: stat.mtime };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    return [];
  }
}

export function restoreBackup(name: string): boolean {
  try {
    const src = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(src)) return false;
    fs.copyFileSync(src, DB_PATH);
    logger.info({ backup: name }, 'Backup restaurado');
    return true;
  } catch (err) {
    logger.error({ err, backup: name }, 'Error al restaurar backup');
    return false;
  }
}

export function startBackupCron() {
  const cronExpr = process.env.BACKUP_CRON || '0 */6 * * *';
  cron.schedule(cronExpr, () => {
    createBackup();
  });
  logger.info({ cron: cronExpr }, 'Backup automático iniciado');
}

export function pruneOldBackups(maxAgeDays = 30) {
  ensureBackupDir();
  const now = Date.now();
  fs.readdirSync(BACKUP_DIR).forEach(f => {
    const fp = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fp);
    if (now - stat.mtime.getTime() > maxAgeDays * 86400000) {
      fs.unlinkSync(fp);
      logger.info({ file: f }, 'Backup antiguo eliminado');
    }
  });
}
