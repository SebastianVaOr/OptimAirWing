/**
 * CSRF Protection Middleware
 * 
 * Implements the Double-Submit Cookie pattern (OWASP recommended).
 * A random CSRF token is set as a cookie and must be sent back
 * in a custom header (X-CSRF-Token) for state-changing requests.
 * 
 * EU GDPR requires anti-forgery protections for authenticated sessions.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = '_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Generate a signed CSRF token from a random value + HMAC.
 */
function generateCsrfToken(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(randomBytes)
    .digest('hex');
  return `${randomBytes}.${signature}`;
}

/**
 * Validate a CSRF token against the HMAC signature.
 */
function validateCsrfToken(token: string): boolean {
  if (!token || token.length < 65) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [randomBytes, signature] = parts;
  const expected = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(randomBytes)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * Sets the CSRF token cookie on the response.
 * Should be called on initial page load / login.
 */
export function setCsrfCookie(res: Response): void {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript to send in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * CSRF validation middleware.
 * Only applies to state-changing methods (POST, PUT, PATCH, DELETE).
 * 
 * Exemptions:
 * - OPTIONS (preflight)
 * - GET/HEAD (safe methods)
 * - Stripe webhook (uses signature verification instead)
 * - Health check endpoints
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Skip health/metrics endpoints
  if (req.path === '/api/health' || req.path === '/metrics') {
    next();
    return;
  }

  // Skip Stripe webhook (uses Stripe's own signature verification)
  if (req.path === '/api/stripe/webhook') {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    res.status(403).json({
      error: 'CSRF_TOKEN_MISSING',
      message: 'Token CSRF requerido. Actualice la página e inténtelo de nuevo.',
    });
    return;
  }

  if (!validateCsrfToken(headerToken)) {
    res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      message: 'Token CSRF inválido. Actualice la página e inténtelo de nuevo.',
    });
    return;
  }

  // Verify cookie matches header (double-submit pattern)
  if (cookieToken !== headerToken) {
    res.status(403).json({
      error: 'CSRF_TOKEN_MISMATCH',
      message: 'Token CSRF no coincide. Actualice la página e inténtelo de nuevo.',
    });
    return;
  }

  next();
}

/**
 * Middleware to refresh CSRF token on auth state changes.
 */
export function refreshCsrfToken(req: Request, res: Response, next: NextFunction): void {
  setCsrfCookie(res);
  next();
}
