import { Router } from 'express';
import { db } from '../db/store';
import { createBackup, listBackups, restoreBackup } from '../lib/backup';
import { hashPassword } from '../middleware/auth';
import { logger } from '../lib/logger';

function sendError(res: import('express').Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: code, message });
}

export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  const adminKey = process.env.ADMIN_SECRET_KEY || 'admin_secret_key_123';
  const apiKey = req.headers['x-admin-key'];
  if (apiKey !== adminKey && process.env.NODE_ENV === 'production') {
    return sendError(res, 401, 'UNAUTHORIZED', 'Acceso no autorizado');
  }
  next();
});

adminRouter.post('/create-super-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, 'MISSING_FIELDS', 'Email y password requeridos');
    }
    const existing = db.findUserByEmail(email);
    if (existing) {
      return sendError(res, 409, 'USER_EXISTS', 'Ya existe un usuario con ese email');
    }
    const passwordHash = await hashPassword(password);
    const result = db.createSuperAdmin(email, passwordHash);
    logger.info({ email: result.email }, 'Super admin created via API');
    return res.json({ success: true, orgId: result.orgId, email: result.email });
  } catch (err) {
    logger.error({ err }, 'Error creating super admin');
    return sendError(res, 500, 'CREATE_FAILED', 'Error al crear super admin');
  }
});

adminRouter.get('/usage', (req, res) => {
  const orgs = db.listOrgs();
  return res.json({
    month: req.query.month || new Date().toISOString().slice(0, 7),
    organizations_count: orgs.length,
    organizations: orgs,
  });
});

adminRouter.post('/org/:id/plan', (req, res) => {
  const { plan } = req.body;
  if (!['freemium', 'professional', 'enterprise'].includes(plan)) {
    return sendError(res, 400, 'INVALID_PLAN', 'Plan no válido');
  }
  const updatedOrg = db.setOrgPlan(req.params.id, plan, 'admin_rest_api');
  return res.json({ success: true, org: updatedOrg });
});

adminRouter.get('/org/:id/logs', (req, res) => {
  const logs = db.getAuditLogs(req.params.id);
  return res.json({ logs });
});

adminRouter.get('/backups', (req, res) => {
  const backups = listBackups();
  return res.json({ backups });
});

adminRouter.post('/backups/create', (req, res) => {
  const backupPath = createBackup();
  return res.json({ status: backupPath ? 'ok' : 'error', path: backupPath });
});

adminRouter.post('/backups/restore', (req, res) => {
  const { name } = req.body;
  if (!name) return sendError(res, 400, 'NAME_REQUIRED', 'Nombre de backup requerido');
  const ok = restoreBackup(name);
  return res.json({ status: ok ? 'ok' : 'error', message: ok ? 'Backup restaurado correctamente' : 'Error al restaurar' });
});
