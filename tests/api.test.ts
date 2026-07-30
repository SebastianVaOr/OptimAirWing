import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:3000';
let serverRunning = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
    serverRunning = res.ok;
  } catch {
    serverRunning = false;
  }
}, 5000);

const itIf = (condition: boolean) => condition ? it : it.skip;

describe('API Integration Tests', () => {
  describe('Health endpoint', () => {
    itIf(serverRunning)('returns 200 and service info', async () => {
      const res = await fetch(`${API_BASE}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('service', 'OptimAirWing Engine');
    });
  });

  describe('Auth routes', () => {
    itIf(serverRunning)('rejects registration with missing fields', async () => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('MISSING_FIELDS');
    });

    itIf(serverRunning)('rejects weak passwords', async () => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: '123' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('WEAK_PASSWORD');
    });

    itIf(serverRunning)('rejects login with missing fields', async () => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toHaveProperty('error');
    });

    itIf(serverRunning)('rejects login with wrong credentials', async () => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong_password' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Content-Type validation', () => {
    itIf(serverRunning)('rejects POST without application/json', async () => {
      const res = await fetch(`${API_BASE}/api/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'hello',
      });
      expect(res.status).toBe(415);
    });
  });
});
