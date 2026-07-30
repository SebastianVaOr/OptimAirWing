import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  ownerEmail: text('owner_email').notNull().default(''),
  plan: text('plan').notNull().default('freemium'),
  stripeCustomerId: text('stripe_customer_id'),
  predictionsUsedMonth: integer('predictions_used_month').notNull().default(0),
  optimizationsUsedMonth: integer('optimizations_used_month').notNull().default(0),
  extraCredits: integer('extra_credits').notNull().default(0),
  createdAt: text('created_at').notNull().default('1970-01-01T00:00:00.000Z'),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: text('org_id').notNull(),
  oldPlan: text('old_plan'),
  newPlan: text('new_plan').notNull(),
  changedBy: text('changed_by').notNull().default('system'),
  timestamp: text('timestamp').notNull().default('1970-01-01T00:00:00.000Z'),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: text('org_id').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: text('created_at').notNull().default('1970-01-01T00:00:00.000Z'),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: text('org_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default('1970-01-01T00:00:00.000Z'),
});
