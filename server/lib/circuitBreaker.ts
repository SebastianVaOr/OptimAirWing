import { logger } from './logger';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitOptions {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  name: string;
}

const state = new Map<string, { state: CircuitState; failures: number; lastFailure: number }>();

export function circuitBreaker<T>(fn: () => Promise<T>, opts: CircuitOptions): Promise<T> {
  const s = state.get(opts.name) || { state: 'closed' as CircuitState, failures: 0, lastFailure: 0 };
  const now = Date.now();

  if (s.state === 'open') {
    if (now - s.lastFailure > opts.recoveryTimeoutMs) {
      s.state = 'half-open';
      logger.info({ name: opts.name }, 'Circuit breaker → half-open');
    } else {
      return Promise.reject(new Error(`Circuit breaker open: ${opts.name}`));
    }
  }

  return fn().then(
    (result) => {
      if (s.state === 'half-open') {
        s.state = 'closed';
        s.failures = 0;
        logger.info({ name: opts.name }, 'Circuit breaker → closed (recuperado)');
      }
      state.set(opts.name, s);
      return result;
    },
    (err) => {
      s.failures++;
      s.lastFailure = now;
      if (s.failures >= opts.failureThreshold) {
        s.state = 'open';
        logger.error({ name: opts.name, failures: s.failures }, 'Circuit breaker → open');
      }
      state.set(opts.name, s);
      throw err;
    },
  );
}
