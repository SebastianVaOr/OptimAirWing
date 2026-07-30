import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/store';
import { logger } from '../lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '30d';
const REFRESH_TOKEN_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export interface AuthPayload {
  orgId: string;
  role: 'admin' | 'user' | 'enterprise';
  userId?: number;
  plan?: string;
}

const BRUTE_MAX_ATTEMPTS = 5;
const BRUTE_LOCKOUT_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkBruteForce(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || req.body?.email || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (record && now < record.lockedUntil) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Demasiados intentos de inicio de sesión. Intente de nuevo más tarde.',
      retryAfterMs: record.lockedUntil - now,
    });
  }

  next();
}

export function recordFailedAttempt(req: Request) {
  const key = req.ip || req.body?.email || 'unknown';
  const now = Date.now();
  let record = loginAttempts.get(key);
  if (!record || now >= record.lockedUntil) {
    record = { count: 0, lockedUntil: 0 };
    loginAttempts.set(key, record);
  }
  record.count++;
  if (record.count >= BRUTE_MAX_ATTEMPTS) {
    record.lockedUntil = now + BRUTE_LOCKOUT_MS;
  }
}

export function resetLoginAttempts(identifier: string) {
  loginAttempts.delete(identifier);
  loginAttempts.delete(`ip:${identifier}`);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(orgId: string, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS).toISOString();
  try {
    db.saveRefreshToken(orgId, tokenHash, expiresAt);
  } catch (err) {
    logger.error({ err }, 'Error storing refresh token');
  }
}

export async function validateRefreshToken(token: string): Promise<AuthPayload | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  const tokenHash = hashToken(token);
  const stored = db.getRefreshToken(tokenHash);
  if (!stored) return null;
  if (new Date(stored.expiresAt) < new Date()) {
    db.deleteRefreshToken(tokenHash);
    return null;
  }
  return payload;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  db.deleteRefreshToken(tokenHash);
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRES_MS,
    path: '/api/auth',
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

function extractToken(req: Request): string | null {
  const cookie = req.cookies?.access_token;
  if (cookie) return cookie;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  (req as any).auth = payload;
  (req as any).orgId = payload.orgId;
  (req as any).orgPlan = payload.plan || 'freemium';
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const auth = (req as any).auth as AuthPayload;
    if (auth.role !== 'admin') {
      return res.status(403).json({ error: 'Se requiere rol de administrador' });
    }
    next();
  });
}

export function orgScoped(req: Request, res: Response, next: NextFunction) {
  const headerOrg = req.headers['x-org-id'] as string;
  const authOrg = (req as any).orgId;
  const targetOrg = headerOrg || authOrg;
  if (!targetOrg) {
    return res.status(400).json({ error: 'X-Org-Id header o autenticación requerida' });
  }
  (req as any).orgId = targetOrg;
  next();
}
