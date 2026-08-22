import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { v1Router } from './server/api/v1Router';
import { adminRouter } from './server/admin/adminRouter';
import { gdprRouter } from './server/api/gdprRouter';
import { dbAdapter } from './server/db/adapter';
import {
  requireAuth, signToken, signRefreshToken, orgScoped,
  hashPassword, comparePassword, setAuthCookies,
  clearAuthCookies, storeRefreshToken, validateRefreshToken,
  revokeRefreshToken, checkBruteForce, recordFailedAttempt,
  resetLoginAttempts,
} from './server/middleware/auth';
import { csrfProtection, setCsrfCookie } from './server/middleware/csrf';
import { rateLimit } from './server/middleware/rateLimiter';
import { createCheckoutSession, handleStripeWebhook, createBillingPortalSession } from './server/lib/stripe';
import { sendWelcomeEmail, sendPasswordResetEmail } from './server/lib/email';
import { db } from './server/db/store';
import { logger } from './server/lib/logger';
import { initSentry } from './server/lib/sentry';
import { createBackup, startBackupCron, pruneOldBackups } from './server/lib/backup';
import { initWebSocket } from './server/lib/websocket';
import { swaggerSpec } from './server/lib/swagger';
import swaggerUi from 'swagger-ui-express';
import { checkPgConnection, runMigrations } from './server/infra/postgres';
import { redis, checkRedisConnection } from './server/infra/redis';
import { getMetrics, trackRequest } from './server/infra/metrics';
import { idempotent } from './server/infra/idempotency';
import { getHealth } from './server/infra/health';
import { initTracing } from './server/lib/tracing';
import { errorHandler } from './server/lib/errors';
import { requirePlan } from './server/middleware/planEnforcer';
import { validate } from './server/middleware/validate';
import { z } from 'zod';
import { reportUsage } from './server/lib/stripe';
import { userRouter } from './server/api/userRouter';
import { uploadRouter } from './server/api/uploadRouter';
import { orgRouter } from './server/api/orgRouter';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

function validateEnv() {
  const requiredVars: string[] = [];
  if (process.env.NODE_ENV === 'production') {
    requiredVars.push('JWT_SECRET', 'ADMIN_SECRET_KEY');
  }
  for (const key of requiredVars) {
    if (!process.env[key]) {
      logger.error({ key }, `Variable de entorno ${key} no definida`);
      process.exit(1);
    }
  }
}

function sendError(res: express.Response, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return res.status(status).json({ error: code, message, ...extra });
}

function apiKeyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (process.env.NODE_ENV !== 'production') return next();
  const key = req.headers['x-api-key'];
  const validKey = process.env.API_KEY;
  if (!validKey) {
    logger.warn('API_KEY no configurada en producción');
    return next();
  }
  if (key !== validKey) {
    return sendError(res, 401, 'INVALID_API_KEY', 'API key inválida o ausente');
  }
  next();
}

async function startServer() {
  validateEnv();
  initSentry();
  initTracing();

  // Conectar a PostgreSQL (con fallback a SQLite)
  const pgOk = await checkPgConnection();
  if (pgOk) await runMigrations();

  // Conectar a Redis (fallback silencioso a memoria)
  checkRedisConnection().then(ok => logger.info({ ok }, 'Redis check'));

  // Backup automático cada 6 horas
  startBackupCron();
  pruneOldBackups(30);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] as const : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Required for Three.js assets
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('json') && req.headers['content-length'] !== '0') {
      return sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type debe ser application/json');
    }
    next();
  });

  app.use((req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const corsWhitelist = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'];
  app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    const allowed = corsWhitelist.includes('*') || corsWhitelist.some(w => origin.startsWith(w)) || !origin;
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Admin-Key, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(rateLimit);

  // CSRF protection (Double-Submit Cookie pattern)
  app.use(csrfProtection);

  // Additional security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  // Métricas Prometheus
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      trackRequest(req.method, req.route?.path || req.path, res.statusCode, Date.now() - start);
    });
    next();
  });

  app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url, ip: req.ip }, 'request');
    next();
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(await getMetrics());
  });

  app.get('/api/health', async (req, res) => {
    const health = await getHealth();
    res.status(health.status === 'unhealthy' ? 503 : 200).json(health);
  });

  const loginSchema = z.object({
    email: z.string().min(1, 'Email requerido'),
    password: z.string().min(1, 'Contraseña requerida'),
  });

  const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(12, 'Mínimo 12 caracteres').regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/,
      'Debe incluir al menos una mayúscula, una minúscula y un número'
    ),
    orgName: z.string().max(100).optional(),
  });

  const checkoutSchema = z.object({
    plan: z.enum(['professional', 'enterprise']),
    email: z.string().email(),
  });

  app.post('/api/auth/register', checkBruteForce, validate(registerSchema), async (req, res) => {
    try {
      const { email, password, orgName } = req.body;
      if (!email || !password) {
        return sendError(res, 400, 'MISSING_FIELDS', 'Email y contraseña requeridos');
      }
      if (password.length < 8) {
        return sendError(res, 400, 'WEAK_PASSWORD', 'La contraseña debe tener al menos 8 caracteres');
      }

      const existing = db.findUserByEmail(email);
      if (existing) {
        return sendError(res, 409, 'EMAIL_EXISTS', 'Ya existe una cuenta con este email');
      }

      const passwordHash = await hashPassword(password);
      const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const user = db.createUser(orgId, email, passwordHash);

      db.setOrgPlan(orgId, 'freemium');

      const payload = { orgId, role: 'user' as const, userId: user.id, plan: 'freemium' };
      const accessToken = signToken(payload);
      const refreshToken = signRefreshToken(payload);
      await storeRefreshToken(orgId, refreshToken);
      setAuthCookies(res, accessToken, refreshToken);
      setCsrfCookie(res);

      sendWelcomeEmail(email, orgName || orgId);

      logger.info({ orgId, email }, 'Usuario registrado');
      res.status(201).json({
        token: accessToken,
        refreshToken,
        orgId,
        user: { id: user.id, email: user.email },
      });
    } catch (err) {
      logger.error({ err }, 'Error en registro');
      sendError(res, 500, 'REGISTRATION_ERROR', 'Error al registrar usuario');
    }
  });

  app.post('/api/auth/login', checkBruteForce, validate(loginSchema), async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 400, 'MISSING_FIELDS', 'Email y contraseña requeridos');
      }

      let user = db.findUserByEmail(email);

      if (!user) {
        // REMOVED: Admin secret key bypass (security vulnerability)
        // All authentication must go through proper user accounts
        recordFailedAttempt(req);
        return sendError(res, 401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        recordFailedAttempt(req);
        return sendError(res, 401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
      }

      const org = db.getOrg(user.orgId);
      const plan = org?.plan || 'freemium';
      const payload = { orgId: user.orgId, role: user.role as 'admin' | 'user' | 'enterprise', userId: user.id, plan };
      const accessToken = signToken(payload);
      const refreshToken = signRefreshToken(payload);
      await storeRefreshToken(user.orgId, refreshToken);
      setAuthCookies(res, accessToken, refreshToken);
      setCsrfCookie(res);
      resetLoginAttempts(email);

      logger.info({ orgId: user.orgId, email }, 'Usuario autenticado');
      res.json({ token: accessToken, refreshToken, orgId: user.orgId });
    } catch (err) {
      logger.error({ err }, 'Error en login');
      sendError(res, 500, 'LOGIN_ERROR', 'Error al iniciar sesión');
    }
  });

  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const token = req.cookies?.refresh_token || req.body?.refreshToken;
      if (!token) {
        return sendError(res, 401, 'REFRESH_REQUIRED', 'Token de refresco requerido');
      }
      const payload = await validateRefreshToken(token);
      if (!payload) {
        clearAuthCookies(res);
        return sendError(res, 401, 'INVALID_REFRESH', 'Token de refresco inválido o expirado');
      }
      await revokeRefreshToken(token);

      const newAccessToken = signToken({ orgId: payload.orgId, role: payload.role, userId: payload.userId });
      const newRefreshToken = signRefreshToken({ orgId: payload.orgId, role: payload.role, userId: payload.userId });
      await storeRefreshToken(payload.orgId, newRefreshToken);
      setAuthCookies(res, newAccessToken, newRefreshToken);
      setCsrfCookie(res);

      res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
      logger.error({ err }, 'Error en refresh token');
      sendError(res, 500, 'REFRESH_ERROR', 'Error al renovar token');
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (token) {
      await revokeRefreshToken(token);
    }
    clearAuthCookies(res);
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 400, 'MISSING_EMAIL', 'Email requerido');
    const user = db.findUserByEmail(email);
    if (user) {
      const resetToken = signToken({ orgId: user.orgId, role: user.role as any, userId: user.id });
      const resetUrl = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
    res.json({ status: 'ok', message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' });
  });

  app.post('/api/auth/reset-password', validate(z.object({
    token: z.string().min(1, 'Token requerido'),
    password: z.string().min(12, 'Mínimo 12 caracteres para contraseñas').regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{12,}$/,
      'La contraseña debe incluir mayúscula, minúscula, número y carácter especial'
    ),
  })), async (req, res) => {
    const { token, password } = req.body;

    const payload = require('./server/middleware/auth').verifyToken(token);
    if (!payload) return sendError(res, 401, 'INVALID_TOKEN', 'Token inválido o expirado');

    const user = db.findUserById(payload.userId);
    if (!user) return sendError(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado');

    const passwordHash = await hashPassword(password);
    db.updatePassword(user.id, passwordHash);

    // Revoke all refresh tokens for this user (force re-login on all devices)
    db.deleteRefreshTokensByOrgId(user.orgId);

    logger.info({ userId: user.id, orgId: user.orgId }, 'Contraseña reseteada exitosamente');
    res.json({ status: 'ok', message: 'Contraseña actualizada. Inicie sesión nuevamente.' });
  });

  app.post('/api/stripe/checkout', requireAuth, idempotent(3600000), validate(checkoutSchema), async (req, res) => {
    try {
      const { plan } = req.body;
      if (!plan || !['professional', 'enterprise'].includes(plan)) {
        return sendError(res, 400, 'INVALID_PLAN', 'Plan no válido');
      }
      const auth = (req as any).auth;
      const result = await createCheckoutSession(plan, auth.orgId, '');
      if (!result.success) {
        return sendError(res, 500, 'CHECKOUT_FAILED', result.error || 'Error al crear sesión de checkout');
      }
      res.json(result);
    } catch (err) {
      logger.error({ err }, 'Error en stripe checkout');
      sendError(res, 500, 'CHECKOUT_ERROR', 'Error al procesar checkout');
    }
  });

  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) return res.status(400).json({ error: 'Firma requerida' });
    const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
    const result = await handleStripeWebhook(rawBody, signature);
    if (!result) return res.status(400).json({ error: 'Webhook inválido' });
    if (result.event === 'checkout.session.completed' && result.orgId && result.plan) {
      db.setOrgPlan(result.orgId, result.plan as any, 'stripe');
      logger.info({ orgId: result.orgId, plan: result.plan }, 'Plan actualizado via Stripe webhook');
    }
    res.json({ received: true });
  });

  app.post('/api/stripe/billing-portal', requireAuth, async (req, res) => {
    try {
      const auth = (req as any).auth;
      const org = db.getOrg(auth.orgId);
      if (!org?.stripe_customer_id) return sendError(res, 400, 'NO_CUSTOMER', 'Sin cliente Stripe');
      const session = await createBillingPortalSession(org.stripe_customer_id);
      if (!session?.url) return sendError(res, 500, 'PORTAL_FAILED', 'Error al crear portal');
      res.json({ url: session.url });
    } catch (err) {
      logger.error({ err }, 'Error en billing portal');
      sendError(res, 500, 'PORTAL_ERROR', 'Error al procesar');
    }
  });

  app.post('/api/designs/save', requireAuth, (req, res) => {
    try {
      const auth = (req as any).auth;
      const { name, params, result } = req.body;
      if (!name) return sendError(res, 400, 'NAME_REQUIRED', 'Nombre requerido');
      db.saveDesign(auth.orgId, auth.userId, name, params, result);
      res.json({ status: 'ok' });
    } catch (err) {
      logger.error({ err }, 'Error al guardar diseño');
      sendError(res, 500, 'SAVE_FAILED', 'Error al guardar');
    }
  });

  app.get('/api/designs', requireAuth, (req, res) => {
    const auth = (req as any).auth;
    const designs = db.listDesigns(auth.orgId);
    res.json({ designs });
  });

  app.post('/api/designs/export-pdf', requireAuth, async (req, res) => {
    try {
      const { title, params, results, nacaCode, sector } = req.body;
      const { generatePdf } = await import('./server/lib/pdf');
      const pdf = await generatePdf({
        title: title || 'OptimAirWing Design Report',
        date: new Date().toISOString(),
        params: params || {},
        results: results || {},
        nacaCode,
        sector,
      });
      if (!pdf) return sendError(res, 500, 'PDF_FAILED', 'Error al generar PDF');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="optimairwing-report-${Date.now()}.pdf"`);
      res.send(pdf);
    } catch (err) {
      logger.error({ err }, 'Error en export PDF');
      sendError(res, 500, 'PDF_ERROR', 'Error al exportar PDF');
    }
  });

  app.use('/v1', apiKeyAuth, orgScoped, rateLimit, v1Router);
  app.use('/admin', requireAuth, adminRouter);
  app.use('/api/user', userRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/org', orgRouter);
  app.use('/api/gdpr', gdprRouter);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    initWebSocket(server);
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'OptimAirWing iniciado');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Iniciando apagado graceful');
    server.close(() => {
      db.close();
      logger.info('Servidor detenido');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Apagado forzado por timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });
}

startServer();
