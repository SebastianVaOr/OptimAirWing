import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'req.headers["x-admin-key"]', 'body.password', 'body.secret'],
    censor: '[REDACTED]',
  },
});
