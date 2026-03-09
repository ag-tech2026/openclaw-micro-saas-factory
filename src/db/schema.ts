/**
 * Combined Database Schema
 *
 * Includes:
 * - BetterAuth tables: users, sessions, accounts, verification_requests
 * - Subscription tables: customers, subscriptions, invoices, payments, subscription_events
 */

import { pgTable, text, timestamp, boolean, jsonb, uuid, numeric, integer } from 'drizzle-orm/pg-core';

// ============================================================================
// BetterAuth Tables
// ============================================================================

/**
 * Users table (BetterAuth)
 * Stores user authentication data
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
  // Custom fields for our app
  role: text('role').default('user'),
  banned: boolean('banned').default(false),
  // Two-Factor Authentication
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  // Subscription linkage
  polarCustomerId: text('polar_customer_id'), // Reference to Polar customer ID
});

/**
 * Sessions table (BetterAuth)
 * Stores active user sessions
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  // Two-Factor Authentication: when verified for this session
  twoFactorVerifiedAt: timestamp('two_factor_verified_at', { mode: 'date' }),
  // Temporary storage for pending 2FA secret during setup (encrypted)
  pendingTwoFactorSecret: text('pending_two_factor_secret'),
});


/**
 * Accounts table (BetterAuth)
 * Stores OAuth account connections
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  password: text('password'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});


/**
 * Verification Requests table (BetterAuth)
 * Stores email verification and password reset tokens
 */
export const verificationRequests = pgTable('verification_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});


// ============================================================================
// Subscription Tables
// ============================================================================

/**
 * Customers table
 * Links to payment provider customers and optionally to BetterAuth users
 */
export const customers = pgTable('customers', {
  id: text('id').primaryKey(), // Provider-specific customer ID (e.g., Polar ID, Stripe cus_xxx, PayPal ID)
  email: text('email').notNull().unique(),
  name: text('name'),
  status: text('status').default('active'), // active, churned, paused
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Link to BetterAuth user (non-unique, allows multiple customer records per user)
  paymentProvider: text('payment_provider').default('polar'), // 'polar', 'stripe', 'paypal'
  // Provider-specific customer IDs (if different from primary id)
  stripeCustomerId: text('stripe_customer_id'),
  paypalCustomerId: text('paypal_customer_id'),
  polarMetadata: jsonb('polar_metadata'), // Additional Polar data (legacy)
  // Dunning management fields
  dunningStatus: text('dunning_status').default('none'), // none, pending, active, canceled
  lastPaymentFailedAt: timestamp('last_payment_failed_at', { mode: 'date' }),
  failedPaymentCount: integer('failed_payment_count').default(0),
  dunningEmailsSent: integer('dunning_emails_sent').default(0),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});


/**
 * Subscriptions table
 */
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(), // Provider-specific subscription ID
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull(),
  planName: text('plan_name'),
  billingInterval: text('billing_interval'), // 'month', 'year', etc.
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', 'incomplete', 'trialing'
  currentPeriodStart: timestamp('current_period_start', { mode: 'date' }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }).notNull(),
  canceledAt: timestamp('canceled_at', { mode: 'date' }),
  provider: text('provider').default('polar'), // 'polar', 'stripe', 'paypal'
  polarMetadata: jsonb('polar_metadata'),
  // Dunning management fields
  retryAttempts: integer('retry_attempts').default(0),
  lastRetryAt: timestamp('last_retry_at', { mode: 'date' }),
  canceledDueToDunning: boolean('canceled_due_to_dunning').default(false),
  dunningGracePeriodEnds: timestamp('dunning_grace_period_ends', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});


/**
 * Invoices table
 */
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  subscriptionId: text('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  number: text('number'),
  status: text('status').notNull(), // 'draft', 'open', 'paid', 'uncollectible', 'void'
  amountDue: numeric('amount_due', { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).default(0),
  currency: text('currency').default('usd'),
  dueDate: timestamp('due_date', { mode: 'date' }),
  paidAt: timestamp('paid_at', { mode: 'date' }),
  provider: text('provider').default('polar'), // 'polar', 'stripe', 'paypal'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});


/**
 * Payments table
 */
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('usd'),
  status: text('status').notNull(), // 'succeeded', 'failed', 'processing', 'requires_action'
  paymentMethodType: text('payment_method_type'),
  provider: text('provider').default('polar'), // 'polar', 'stripe', 'paypal'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});


/**
 * Payment Retry Attempts table
 * Tracks automated retry attempts for failed payments
 */
export const paymentRetryAttempts = pgTable('payment_retry_attempts', {
  id: text('id').primaryKey(), // Format: retry_{customerId}_{attemptNumber} or UUID
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  subscriptionId: text('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  attemptNumber: integer('attempt_number').notNull(),
  status: text('status').notNull(), // 'scheduled', 'in_progress', 'succeeded', 'failed', 'canceled'
  scheduledFor: timestamp('scheduled_for', { mode: 'date' }).notNull(),
  startedAt: timestamp('started_at', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  retryable: boolean('retryable').default(true),
  nextRetryAt: timestamp('next_retry_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});


/**
 * Dunning Management table
 * Tracks customer dunning status and email reminders
 */
export const dunningEvents = pgTable('dunning_events', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(), // 'payment_failed', 'retry_scheduled', 'retry_attempt', 'email_sent', 'subscription_canceled'
  statusBefore: text('status_before'),
  statusAfter: text('status_after'),
  emailSent: boolean('email_sent').default(false),
  emailTemplate: text('email_template'),
  emailSentAt: timestamp('email_sent_at', { mode: 'date' }),
  attemptNumber: integer('attempt_number'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});


/**
 * Subscription Events table (audit log)
 */
export const subscriptionEvents = pgTable('subscription_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  source: text('source').notNull(), // 'polar' or 'stripe'
  data: jsonb('data').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at', { mode: 'date' }),
  error: text('error'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

// ============================================================================
// Analytics Tables
// ============================================================================

/**
 * Analytics Events table
 * Stores user event tracking for analytics
 */
export const analyticsEvents = pgTable('analytics_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').default('anonymous'),
  sessionId: text('session_id'),
  eventType: text('event_type').notNull(),
  properties: jsonb('properties'),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull(),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  ipHash: text('ip_hash'),
  batchIndex: integer('batch_index'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  idxTimestamp: { columns: [table.timestamp], name: 'idx_analytics_events_timestamp' },
  idxUserId: { columns: [table.userId], name: 'idx_analytics_events_user_id' },
  idxEventType: { columns: [table.eventType], name: 'idx_analytics_events_event_type' },
  idxSessionId: { columns: [table.sessionId], name: 'idx_analytics_events_session_id' },
  idxTimestampUser: { columns: [table.timestamp, table.userId], name: 'idx_analytics_events_timestamp_user' },
  idxSessionEvent: { columns: [table.sessionId, table.eventType], name: 'idx_analytics_events_session_event' },
}));

/**
 * Funnels table
 * Stores funnel definitions for conversion tracking
 */
export const funnels = pgTable('funnels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  steps: jsonb('steps').notNull(), // Array of step definitions: [{name, eventType, properties filter}]
  goalStepIndex: integer('goal_step_index').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  idxName: { columns: [table.name], name: 'idx_funnels_name' },
}));

/**
 * Funnel Events Junction table
 * Tracks which events belong to which funnel attempts
 * Used for debugging and detailed analysis
 */
export const funnelEvents = pgTable('funnel_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  analyticsEventId: text('analytics_event_id').notNull().references(() => analyticsEvents.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id'),
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  idxFunnelSession: { columns: [table.funnelId, table.sessionId], name: 'idx_funnel_events_funnel_session' },
  idxEvent: { columns: [table.analyticsEventId], name: 'idx_funnel_events_event' },
}));

// ============================================================================
// Materialized Views for Analytics Aggregation
// ============================================================================

// These are created via separate migration files (SQL) rather than Drizzle tables
// See drizzle/views/ directory for view definitions

// ============================================================================
// Job Queue Tables (optional persistence)
// ============================================================================

/**
 * Job Queue table (optional)
 * Provides additional persistence for job history beyond Redis
 * Can be used for audit logging and reporting
 */
export const jobQueueHistory = pgTable('job_queue_history', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  priority: integer('priority').notNull(),
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed', 'canceled'
  data: jsonb('data').notNull(),
  scheduledAt: timestamp('scheduled_at', { mode: 'date' }),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  startedAt: timestamp('started_at', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  error: text('error'),
  processingDurationMs: integer('processing_duration_ms'),
  totalDurationMs: integer('total_duration_ms'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

// ============================================================================
// Feature Flags Tables
// ============================================================================

/**
 * Feature Flags table
 * Stores configuration for feature toggles and gradual rollouts
 */
export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  enabled: boolean('enabled').default(false),
  rolloutPercentage: integer('rollout_percentage').default(0), // 0-100
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

/**
 * Feature Flag User Overrides table
 * Allows enabling/disabling features for specific users
 */
export const featureFlagUserOverrides = pgTable('feature_flag_user_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  flagId: uuid('flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled'), // null = use flag's default, true = force on, false = force off
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
  // Unique constraint: one override per flag per user
}, (table) => ({
  uniqueFlagUser: {
    columns: [table.flagId, table.userId],
    name: 'feature_flag_user_overrides_flag_id_user_id_key'
  }
}));

// ============================================================================
// Webhook Security Tables
// ============================================================================

/**
 * Webhook Secrets table
 * Stores webhook signing secrets for each provider with versioning support
 */
export const webhookSecrets = pgTable('webhook_secrets', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(), // 'stripe', 'polar', 'resend', 'github'
  secret: text('secret').notNull(),
  secretVersion: integer('secret_version').notNull().default(1),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  rotatedAt: timestamp('rotated_at', { mode: 'date' }),
});

/**
 * Webhook Verification Logs table
 * Audit log for all webhook verification attempts (successful and failed)
 */
export const webhookVerificationLogs = pgTable('webhook_verification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  ip: text('ip').notNull(),
  userAgent: text('user_agent'),
  success: boolean('success').notNull(),
  error: text('error'),
  eventId: text('event_id'),
  eventType: text('event_type'),
  payloadPreview: text('payload_preview'), // limited size
  verifiedAt: timestamp('verified_at', { mode: 'date' }).notNull().defaultNow(),
});


// ============================================================================
// Two-Factor Authentication Tables
// ============================================================================

/**
 * Two-Factor Secrets table
 * Stores encrypted TOTP secrets and backup codes for users (primarily admins)
 */
export const twoFactorSecrets = pgTable('two_factor_secrets', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(), // Encrypted TOTP secret
  backupCodes: jsonb('backup_codes'), // Array of hashed backup codes
  recoveryEmail: text('recovery_email'), // Email for recovery (may differ from primary)
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

/**
 * Two-Factor Recovery Tokens table
 * Temporary tokens for 2FA recovery via email
 */
export const twoFactorRecovery = pgTable('two_factor_recovery', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(), // Hashed token for verification
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});



// ============================================================================
// Dashboard Tasks Table
// ============================================================================

/**
 * Tasks table for Kanban board
 * Stores tasks with their current column/status
 */
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  column: text('column').notNull(), // 'todo', 'inprogress', 'done'
  priority: text('priority').default('medium'), // 'low', 'medium', 'high'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

// ============================================================================
// Audit Log Retention & Archiving Tables
// ============================================================================

/**
 * Audit Log Retention Config table
 * Stores retention periods (in days) for each audit table
 */
export const auditLogRetentionConfig = pgTable('audit_log_retention_config', {
  tableName: text('table_name').primaryKey(),
  retentionDays: integer('retention_days').notNull().default(90),
  archivingEnabled: boolean('archiving_enabled').default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
});

/**
 * Audit Log Archives table
 * Tracks what has been archived and where (blob storage paths)
 */
export const auditLogArchives = pgTable('audit_log_archives', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceTable: text('source_table').notNull(),
  recordIds: text('record_ids').array().notNull(),
  blobPath: text('blob_path').notNull(),
  blobUrl: text('blob_url'),
  archivedAt: timestamp('archived_at', { mode: 'date' }).notNull().defaultNow(),
  recordCount: integer('record_count').notNull(),
  sizeBytes: integer('size_bytes'),
  minCreatedAt: timestamp('min_created_at', { mode: 'date' }),
  maxCreatedAt: timestamp('max_created_at', { mode: 'date' }),
  checksum: text('checksum'),
}, (table) => ({
  idxSourceTable: { columns: [table.sourceTable], name: 'idx_audit_archives_source_table' },
  idxArchivedAt: { columns: [table.archivedAt], name: 'idx_audit_archives_archived_at' },
  idxBlobPath: { columns: [table.blobPath], name: 'idx_audit_archives_blob_path' },
}));

/**
 * GDPR Deletion Requests table
 * Tracks requests to delete personal data (right to be forgotten)
 */
export const gdprDeletionRequests = pgTable('gdpr_deletion_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userIdentifier: text('user_identifier').notNull(),
  identifierType: text('identifier_type').notNull(), // 'user_id', 'email', 'ip', 'other'
  requestedAt: timestamp('requested_at', { mode: 'date' }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { mode: 'date' }),
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  affectedTables: text('affected_tables').array().notNull(),
  affectedRecordsTotal: integer('affected_records_total').notNull().default(0),
  archivedRecordsDeleted: integer('archived_records_deleted').default(0),
  liveRecordsDeleted: integer('live_records_deleted').default(0),
  error: text('error'),
  processedBy: text('processed_by'), // 'manual' or 'automated'
}, (table) => ({
  idxStatus: { columns: [table.status], name: 'idx_gdpr_requests_status' },
  idxRequestedAt: { columns: [table.requestedAt], name: 'idx_gdpr_requests_requested_at' },
  idxUserIdentifier: { columns: [table.userIdentifier], name: 'idx_gdpr_requests_identifier' },
}));

// ============================================================================
// Health Monitoring Tables
// ============================================================================

/**
 * Health Metrics table
 * Stores time-series health data for all modules
 */
export const healthMetrics = pgTable('health_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
  module: text('module').notNull(), // 'system', 'database', 'api', 'ingest', 'sentry', 'business', 'integrations'
  metric: text('metric').notNull(), // e.g., 'latency_ms', 'error_rate', 'uptime', 'disk_usage_pct'
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').default('ms'), // 'ms', 'pct', 'count', 'bytes', 'status'
  status: text('status').notNull(), // 'healthy', 'degraded', 'down'
  details: jsonb('details'), // Additional context (endpoint, error, etc.)
  tags: jsonb('tags'), // Optional categorization (service, region, etc.)
}, (table) => ({
  idxTimestamp: { columns: [table.timestamp], name: 'idx_health_metrics_timestamp' },
  idxModule: { columns: [table.module], name: 'idx_health_metrics_module' },
  idxMetric: { columns: [table.metric], name: 'idx_health_metrics_metric' },
  idxTimestampModule: { columns: [table.timestamp, table.module], name: 'idx_health_metrics_timestamp_module' },
}));

/**
 * Health Alerts table
 * Tracks triggered alerts for audit and deduplication
 */
export const healthAlerts = pgTable('health_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { mode: 'date' }),
  module: text('module').notNull(),
  metric: text('metric').notNull(),
  severity: text('severity').notNull(), // 'warning', 'critical'
  threshold: numeric('threshold', { precision: 10, scale: 2 }).notNull(),
  observedValue: numeric('observed_value', { precision: 10, scale: 2 }).notNull(),
  message: text('message').notNull(),
  dedupeKey: text('dedupe_key').notNull().unique(), // For deduplication
  resolved: boolean('resolved').default(false),
  resolvedBy: text('resolved_by'), // User ID or 'system'
  // Alert delivery tracking
  channelsSent: jsonb('channels_sent'), // { telegram: true, email: true, slack: false }
  deliveredAt: timestamp('delivered_at', { mode: 'date' }),
  // Foreign key to health metric that triggered this (optional)
  metricId: uuid('metric_id').references(() => healthMetrics.id, { onDelete: 'set null' }),
}, (table) => ({
  idxCreatedAt: { columns: [table.createdAt], name: 'idx_health_alerts_created_at' },
  idxResolved: { columns: [table.resolved], name: 'idx_health_alerts_resolved' },
  idxDedupeKey: { columns: [table.dedupeKey], name: 'idx_health_alerts_dedupe_key' },
  idxModuleSeverity: { columns: [table.module, table.severity], name: 'idx_health_alerts_module_severity' },
}));

/**
 * Health Audit Log table
 * Records all admin actions on the health system
 */
export const healthAuditLog = pgTable('health_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // 'restart_gateway', 'clear_cache', 'toggle_maintenance', 'manual_check', 'acknowledge_alert', 'resolve_alert'
  resource: text('resource'), // e.g., 'gateway', 'redis', 'health:module:api'
  details: jsonb('details'), // { previous, current, parameters }
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
}, (table) => ({
  idxTimestamp: { columns: [table.timestamp], name: 'idx_health_audit_timestamp' },
  idxUserId: { columns: [table.userId], name: 'idx_health_audit_user_id' },
  idxAction: { columns: [table.action], name: 'idx_health_audit_action' },
}));

/**
 * Maintenance Mode table
 * Single-row configuration for system-wide maintenance mode
 */
export const maintenanceMode = pgTable('maintenance_mode', {
  id: integer('id').primaryKey().default(1), // Always 1, singleton row
  enabled: boolean('enabled').default(false),
  reason: text('reason'),
  startedAt: timestamp('started_at', { mode: 'date' }),
  startedBy: uuid('started_by').references(() => users.id, { onDelete: 'set null' }),
  endedAt: timestamp('ended_at', { mode: 'date' }),
  endedBy: uuid('ended_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  idxEnabled: { columns: [table.enabled], name: 'idx_maintenance_mode_enabled' },
}));
