import { pgTable, serial, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  ownerEmail: text('owner_email').notNull().default(''),
  plan: text('plan').notNull().default('freemium'),
  stripeCustomerId: text('stripe_customer_id'),
  predictionsUsedMonth: integer('predictions_used_month').notNull().default(0),
  optimizationsUsedMonth: integer('optimizations_used_month').notNull().default(0),
  extraCredits: integer('extra_credits').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  loginAttempts: integer('login_attempts').notNull().default(0),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  loginAttempts: integer('login_attempts').notNull().default(0),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  orgId: text('org_id').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  orgId: text('org_id').notNull(),
  oldPlan: text('old_plan'),
  newPlan: text('new_plan').notNull(),
  changedBy: text('changed_by').notNull().default('system'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

export const customProfiles = pgTable('custom_profiles', {
  id: serial('id').primaryKey(),
  orgId: text('org_id').notNull(),
  name: text('name').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orgMembers = pgTable('org_members', {
  id: serial('id').primaryKey(),
  orgId: text('org_id').notNull(),
  userId: integer('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('user'),
  invitedBy: text('invited_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const designVersions = pgTable('design_versions', {
  id: serial('id').primaryKey(),
  orgId: text('org_id').notNull(),
  userId: integer('user_id'),
  name: text('name').notNull(),
  params: jsonb('params').notNull(),
  result: jsonb('result'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invites = pgTable('invites', {
  id: serial('id').primaryKey(),
  orgId: text('org_id').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
