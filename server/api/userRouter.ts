import { Router } from 'express';
import { requireAuth, hashPassword, comparePassword } from '../middleware/auth';
import { db } from '../db/store';
import { sendWelcomeEmail } from '../lib/email';
import { logger } from '../lib/logger';
import { z } from 'zod';

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get('/profile', (req, res) => {
  const auth = (req as any).auth;
  const org = db.getOrg(auth.orgId);
  if (!org) return res.status(404).json({ error: 'Org no encontrada' });
  const user = db.findUserByEmail(org.owner_email);
  res.json({
    orgId: org.id,
    orgName: org.name,
    email: org.owner_email,
    plan: org.plan,
    role: auth.role,
    credits: db.getCreditsInfo(org.id),
    createdAt: org.createdAt || new Date().toISOString(),
  });
});

userRouter.put('/profile', async (req, res) => {
  try {
    const auth = (req as any).auth;
    const { name, email } = req.body;
    const org = db.getOrg(auth.orgId);
    if (!org) return res.status(404).json({ error: 'Org no encontrada' });

    const user = db.findUserByEmail(org.owner_email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (email && email !== user.email) {
      const existing = db.findUserByEmail(email);
      if (existing) return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email ya registrado' });
    }

    res.json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'Error al actualizar perfil');
    res.status(500).json({ error: 'UPDATE_FAILED' });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

userRouter.post('/change-password', async (req, res) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'Contraseña nueva debe tener al menos 8 caracteres' });

    const auth = (req as any).auth;
    const org = db.getOrg(auth.orgId);
    if (!org) return res.status(404).json({ error: 'Org no encontrada' });

    const user = db.findUserByEmail(org.owner_email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'INVALID_PASSWORD', message: 'Contraseña actual incorrecta' });

    const newHash = await hashPassword(parsed.data.newPassword);
    db.updatePassword(user.id, newHash);
    logger.info({ userId: user.id }, 'Contraseña actualizada');
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'Error al cambiar contraseña');
    res.status(500).json({ error: 'CHANGE_FAILED' });
  }
});

userRouter.get('/usage-history', (req, res) => {
  const auth = (req as any).auth;
  const org = db.getOrg(auth.orgId);
  if (!org) return res.status(404).json({ error: 'Org no encontrada' });
  res.json({
    predictions_used: org.predictions_used_month,
    optimizations_used: org.optimizations_used_month,
    extra_credits: org.extra_credits,
    audit_logs: db.getAuditLogs(org.id),
  });
});
