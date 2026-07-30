import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { db } from '../db/store';
import { sendWelcomeEmail } from '../lib/email';
import { logger } from '../lib/logger';
import { z } from 'zod';

export const orgRouter = Router();
orgRouter.use(requireAuth);

orgRouter.get('/members', (req, res) => {
  const auth = (req as any).auth;
  const members = db.getOrgMembers(auth.orgId);
  res.json({ members });
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'admin', 'enterprise']).optional(),
});

orgRouter.post('/invite', async (req, res) => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_EMAIL' });

    const auth = (req as any).auth;
    if (auth.role !== 'admin' && auth.role !== 'enterprise') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Solo admins pueden invitar miembros' });
    }

    const existingUser = db.findUserByEmail(parsed.data.email);
    if (existingUser) {
      return res.status(409).json({ error: 'ALREADY_MEMBER', message: 'Este email ya es miembro de una organización' });
    }

    const invite = db.createInvite(auth.orgId, parsed.data.email, parsed.data.role || 'user');
    await sendWelcomeEmail(parsed.data.email, `Invitación a OptimAirWing de ${auth.orgId}`);
    logger.info({ email: parsed.data.email, orgId: auth.orgId }, 'Invitación enviada');
    res.json({ status: 'ok', invite });
  } catch (err) {
    logger.error({ err }, 'Error al invitar miembro');
    res.status(500).json({ error: 'INVITE_FAILED' });
  }
});

orgRouter.delete('/members/:userId', requireAdmin, (req, res) => {
  try {
    db.removeOrgMember((req as any).orgId, parseInt(req.params.userId));
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'Error al eliminar miembro');
    res.status(500).json({ error: 'REMOVE_FAILED' });
  }
});

orgRouter.get('/stats', (req, res) => {
  const auth = (req as any).auth;
  const org = db.getOrg(auth.orgId);
  if (!org) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({
    members: db.getOrgMembers(auth.orgId).length,
    designs: db.listDesigns(auth.orgId),
    credits: db.getCreditsInfo(auth.orgId),
    plan: org.plan,
  });
});
