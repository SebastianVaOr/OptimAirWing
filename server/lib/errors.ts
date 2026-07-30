export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'No autorizado') {
    super(401, 'AUTH_ERROR', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(404, 'NOT_FOUND', `${resource} no encontrado`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterMs: number) {
    super(429, 'RATE_LIMIT', 'Demasiadas solicitudes', { retryAfterMs });
  }
}

export function errorHandler(err: Error, _req: any, res: any, _next: any) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  console.error('Error no manejado:', err);
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Error interno del servidor',
  });
}
