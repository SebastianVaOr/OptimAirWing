import { Pool, type PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { logger } from '../lib/logger';

function resolveSsl(): PoolConfig['ssl'] {
  const sslMode = process.env.PGSSLMODE || '';
  if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full' || sslMode === 'no-verify') {
    return { rejectUnauthorized: sslMode === 'verify-ca' || sslMode === 'verify-full' };
  }
  return undefined;
}

function resolvePoolConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: resolveSsl(),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'optimairwing',
    user: process.env.PGUSER || 'optimairwing',
    password: process.env.PGPASSWORD || 'optimairwing',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(resolvePoolConfig());

pool.on('error', (err) => {
  logger.error({ err }, 'Error inesperado en pool PostgreSQL');
});

export const pgPool = pool;
export const pgDb = drizzle(pool);

export async function checkPgConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    logger.error({ err }, 'PostgreSQL no disponible — usando SQLite como fallback');
    return false;
  }
}

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        owner_email TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL DEFAULT 'freemium',
        stripe_customer_id TEXT,
        predictions_used_month INTEGER NOT NULL DEFAULT 0,
        optimizations_used_month INTEGER NOT NULL DEFAULT 0,
        extra_credits INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL REFERENCES organizations(id),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL,
        old_plan TEXT,
        new_plan TEXT NOT NULL,
        changed_by TEXT NOT NULL DEFAULT 'system',
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS custom_profiles (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS org_members (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        role TEXT NOT NULL DEFAULT 'user',
        invited_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS design_versions (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id INTEGER,
        name TEXT NOT NULL,
        params JSONB NOT NULL,
        result JSONB,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_design_versions_org ON design_versions(org_id);
    `);
    logger.info('Migraciones PostgreSQL ejecutadas');
  } catch (err) {
    logger.error({ err }, 'Error en migraciones PostgreSQL');
  } finally {
    client.release();
  }
}
