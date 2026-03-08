/**
 * Combined Database Schema
 *
 * Includes:
 * - BetterAuth tables: users, sessions, accounts, verification_requests
 * - Subscription tables: customers, subscriptions, invoices, payments, subscription_events
 */

import { pgTable, text, timestamp, boolean, jsonb, uuid, numeric } from 'drizzle-orm/pg-core';

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
 * Links to Polar customers and optionally to BetterAuth users
 */
export const customers = pgTable('customers', {
  id: text('id').primaryKey(), // Polar customer ID (prefixed with polar_ or just their ID)
  email: text('email').notNull().unique(),
  name: text('name'),
  status: text('status').default('active'), // active, churned, paused
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'set null' }), // Link to BetterAuth user
  polarMetadata: jsonb('polar_metadata'), // Additional Polar data
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
  id: text('id').primaryKey(), // Polar subscription ID
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull(),
  planName: text('plan_name'),
  billingInterval: text('billing_interval'), // 'month', 'year', etc.
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', 'incomplete', 'trialing'
  currentPeriodStart: timestamp('current_period_start', { mode: 'date' }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }).notNull(),
  canceledAt: timestamp('canceled_at', { mode: 'date' }),
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

