import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger';

export type PlanTier = 'freemium' | 'base' | 'professional' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  owner_email: string;
  plan: PlanTier;
  stripe_customer_id?: string;
  predictions_used_month: number;
  optimizations_used_month: number;
  extra_credits: number;
  createdAt?: string;
}

export interface SubscriptionChangeLog {
  org_id: string;
  old_plan: string;
  new_plan: string;
  changed_by: string;
  timestamp: string;
}

export interface StoredRefreshToken {
  id: number;
  orgId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

const isVercel = !!process.env.VERCEL;
const DB_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'optimairwing.db');

class BackendDatabase {
  private sqlite: Database.Database;
  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    this.sqlite = new Database(DB_PATH);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('foreign_keys = ON');
    this.migrate();
    this.seed();
  }

  private migrate() {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        owner_email TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL DEFAULT 'freemium',
        stripe_customer_id TEXT,
        predictions_used_month INTEGER NOT NULL DEFAULT 0,
        optimizations_used_month INTEGER NOT NULL DEFAULT 0,
        extra_credits INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        old_plan TEXT,
        new_plan TEXT NOT NULL,
        changed_by TEXT NOT NULL DEFAULT 'system',
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS custom_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data JSON NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS org_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        invited_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS design_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        user_id INTEGER,
        name TEXT NOT NULL,
        params JSON NOT NULL,
        result JSON,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
      CREATE INDEX IF NOT EXISTS idx_custom_profiles_org ON custom_profiles(org_id);
      CREATE INDEX IF NOT EXISTS idx_design_versions_org ON design_versions(org_id);
    `);
    logger.info('Base de datos SQLite inicializada');
  }

  private seed() {
    const existing = this.sqlite.prepare('SELECT id FROM organizations WHERE id = ?').get('org_demo');
    if (!existing) {
      this.sqlite.prepare(`
        INSERT INTO organizations (id, name, owner_email, plan)
        VALUES ('org_demo', 'OptimAirWing Demo', 'user@optimairwing.app', 'freemium')
      `).run();
      logger.info('Organización demo creada');
    }
  }

  getOrg(id: string): Organization | undefined {
    const row = this.sqlite.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.rowToOrg(row);
  }

  updateOrg(id: string, fields: Partial<Organization>): void {
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [key, val] of Object.entries(fields)) {
      sets.push(`${key} = ?`);
      vals.push(val);
    }
    if (sets.length === 0) return;
    vals.push(id);
    this.sqlite.prepare(`UPDATE organizations SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }

  private rowToOrg(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      owner_email: row.owner_email,
      plan: row.plan as PlanTier,
      stripe_customer_id: row.stripe_customer_id,
      predictions_used_month: row.predictions_used_month,
      optimizations_used_month: row.optimizations_used_month,
      extra_credits: row.extra_credits,
      createdAt: row.created_at,
    };
  }

  listOrgs(): Organization[] {
    const rows = this.sqlite.prepare('SELECT * FROM organizations ORDER BY name').all() as any[];
    return rows.map(r => this.rowToOrg(r));
  }

  setOrgPlan(orgId: string, plan: PlanTier, changedBy = 'system'): Organization {
    const existing = this.sqlite.prepare('SELECT plan FROM organizations WHERE id = ?').get(orgId) as any;
    const oldPlan = existing ? existing.plan : 'none';

    if (!existing) {
      this.sqlite.prepare(`
        INSERT INTO organizations (id, name, owner_email, plan)
        VALUES (?, ?, ?, ?)
      `).run(orgId, `Org ${orgId}`, 'admin@aero.com', plan);
    } else {
      this.sqlite.prepare('UPDATE organizations SET plan = ? WHERE id = ?').run(plan, orgId);
    }

    this.sqlite.prepare(`
      INSERT INTO audit_logs (org_id, old_plan, new_plan, changed_by)
      VALUES (?, ?, ?, ?)
    `).run(orgId, oldPlan, plan, changedBy);

    return this.getOrg(orgId)!;
  }

  getPlanLimits(plan: PlanTier) {
    switch (plan) {
      case 'freemium': return { pred: 100, opt: 3 };
      case 'base': return { pred: 1000, opt: 30 };
      case 'professional': return { pred: 5000, opt: 100 };
      case 'enterprise': return { pred: 100000, opt: 100000 };
      default: return { pred: 100, opt: 3 };
    }
  }

  getCreditsInfo(orgId: string = 'org_demo') {
    const org = this.getOrg(orgId) || this.setOrgPlan(orgId, 'freemium');
    const limits = this.getPlanLimits(org.plan);
    const totalOptLimit = limits.opt + (org.extra_credits || 0);
    const optimizationsRemaining = Math.max(0, totalOptLimit - org.optimizations_used_month);

    return {
      org_id: org.id,
      plan: org.plan,
      predictions_used: org.predictions_used_month,
      predictions_limit: limits.pred,
      predictions_remaining: Math.max(0, limits.pred - org.predictions_used_month),
      optimizations_used: org.optimizations_used_month,
      optimizations_limit: limits.opt,
      extra_credits: org.extra_credits || 0,
      total_optimizations_limit: totalOptLimit,
      optimizations_remaining: optimizationsRemaining,
    };
  }

  incrementUsage(orgId: string, type: 'prediction' | 'optimization', amount = 1): boolean {
    const org = this.getOrg(orgId) || this.setOrgPlan(orgId, 'freemium');
    const limits = this.getPlanLimits(org.plan);

    if (type === 'prediction') {
      if (org.predictions_used_month + amount > limits.pred) return false;
      this.sqlite.prepare('UPDATE organizations SET predictions_used_month = predictions_used_month + ? WHERE id = ?')
        .run(amount, orgId);
    } else {
      const totalAllowed = limits.opt + (org.extra_credits || 0);
      if (org.optimizations_used_month + amount > totalAllowed) return false;
      this.sqlite.prepare('UPDATE organizations SET optimizations_used_month = optimizations_used_month + ? WHERE id = ?')
        .run(amount, orgId);
    }
    return true;
  }

  addExtraCredits(orgId: string = 'org_demo', amount: number): number {
    this.sqlite.prepare('UPDATE organizations SET extra_credits = extra_credits + ? WHERE id = ?')
      .run(amount, orgId);
    const org = this.getOrg(orgId)!;
    return org.extra_credits;
  }

  resetUsage(orgId: string): void {
    this.sqlite.prepare(`
      UPDATE organizations SET predictions_used_month = 0, optimizations_used_month = 0, extra_credits = 0 WHERE id = ?
    `).run(orgId);
  }

  getAuditLogs(orgId?: string): SubscriptionChangeLog[] {
    let rows: any[];
    if (orgId) {
      rows = this.sqlite.prepare('SELECT * FROM audit_logs WHERE org_id = ? ORDER BY timestamp DESC').all(orgId) as any[];
    } else {
      rows = this.sqlite.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as any[];
    }
    return rows.map(r => ({
      org_id: r.org_id,
      old_plan: r.old_plan,
      new_plan: r.new_plan,
      changed_by: r.changed_by,
      timestamp: r.timestamp,
    }));
  }

  createUser(orgId: string, email: string, passwordHash: string, role: string = 'user'): { id: number; email: string } {
    const stmt = this.sqlite.prepare(`
      INSERT INTO users (org_id, email, password_hash, role) VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(orgId, email, passwordHash, role);
    return { id: result.lastInsertRowid as number, email };
  }

  findUserByEmail(email: string): { id: number; orgId: string; email: string; passwordHash: string; role: string } | undefined {
    const row = this.sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      orgId: row.org_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
    };
  }

  saveRefreshToken(orgId: string, tokenHash: string, expiresAt: string): void {
    this.sqlite.prepare(`
      INSERT INTO refresh_tokens (org_id, token_hash, expires_at) VALUES (?, ?, ?)
    `).run(orgId, tokenHash, expiresAt);
  }

  getRefreshToken(tokenHash: string): StoredRefreshToken | undefined {
    const row = this.sqlite.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash) as any;
    if (!row) return undefined;
    return row as StoredRefreshToken;
  }

  deleteRefreshToken(tokenHash: string): void {
    this.sqlite.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
  }

  cleanupExpiredRefreshTokens(): void {
    this.sqlite.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();
  }

  updatePassword(userId: number, passwordHash: string): void {
    this.sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
  }

  saveCustomProfile(orgId: string, name: string, points: { x: number; y: number }[]): void {
    this.sqlite.prepare(`
      INSERT INTO custom_profiles (org_id, name, data) VALUES (?, ?, ?)
    `).run(orgId, name, JSON.stringify(points));
  }

  listCustomProfiles(orgId: string): { id: number; name: string; points: number; createdAt: string }[] {
    const rows = this.sqlite.prepare('SELECT id, name, data, created_at FROM custom_profiles WHERE org_id = ? ORDER BY created_at DESC').all(orgId) as any[];
    return rows.map(r => ({ id: r.id, name: r.name, points: JSON.parse(r.data).length, createdAt: r.created_at }));
  }

  getOrgMembers(orgId: string): { id: number; email: string; role: string; createdAt: string }[] {
    const rows = this.sqlite.prepare(`
      SELECT u.id, u.email, u.role, u.created_at FROM org_members om JOIN users u ON om.user_id = u.id WHERE om.org_id = ?
    `).all(orgId) as any[];
    return rows;
  }

  createInvite(orgId: string, email: string, role: string): { id: number; email: string; role: string } {
    const result = this.sqlite.prepare('INSERT INTO invites (org_id, email, role) VALUES (?, ?, ?)').run(orgId, email, role);
    return { id: result.lastInsertRowid as number, email, role };
  }

  removeOrgMember(orgId: string, userId: number): void {
    this.sqlite.prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?').run(orgId, userId);
  }

  listDesigns(orgId: string): { id: number; name: string; version: number; createdAt: string }[] {
    const rows = this.sqlite.prepare(`
      SELECT id, name, version, created_at FROM design_versions WHERE org_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(orgId) as any[];
    return rows;
  }

  saveDesign(orgId: string, userId: number | undefined, name: string, params: unknown, result: unknown): void {
    const existing = this.sqlite.prepare('SELECT MAX(version) as mv FROM design_versions WHERE org_id = ? AND name = ?').get(orgId, name) as any;
    const version = (existing?.mv || 0) + 1;
    this.sqlite.prepare(`
      INSERT INTO design_versions (org_id, user_id, name, params, result, version) VALUES (?, ?, ?, ?, ?, ?)
    `).run(orgId, userId, name, JSON.stringify(params), JSON.stringify(result), version);
  }

  close(): void {
    this.sqlite.close();
    logger.info('Conexión a base de datos cerrada');
  }
}

export const db = new BackendDatabase();
