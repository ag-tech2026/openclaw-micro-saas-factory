import { pgTable, text, timestamp, decimal, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Customers table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  status: text('status', { enum: ['active', 'churned', 'paused'] }).default('active'),
  // Dunning management fields
  dunningStatus: text('dunning_status', { enum: ['none', 'pending', 'active', 'canceled'] }).default('none'),
  lastPaymentFailedAt: timestamp('last_payment_failed_at'),
  failedPaymentCount: integer('failed_payment_count').default(0),
  dunningEmailsSent: integer('dunning_emails_sent').default(0),
  createdAt: timestamp('created_at').default(sql`NOW()`),
  updatedAt: timestamp('updated_at').default(sql`NOW()`),
}, (table) => ({
  idxEmail: index('idx_customers_email').on(table.email),
  idxStatus: index('idx_customers_status').on(table.status),
  idxDunningStatus: index('idx_customers_dunning_status').on(table.dunningStatus),
  idxCreatedAt: index('idx_customers_created_at').on(table.createdAt),
}));

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  planId: text('plan_id').notNull(),
  planName: text('plan_name'),
  billingInterval: text('billing_interval', { enum: ['month', 'year'] }),
  status: text('status', { enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'] }).notNull(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  canceledAt: timestamp('canceled_at'),
  // Dunning management fields
  retryAttempts: integer('retry_attempts').default(0),
  lastRetryAt: timestamp('last_retry_at'),
  canceledDueToDunning: boolean('canceled_due_to_dunning').default(false),
  dunningGracePeriodEnds: timestamp('dunning_grace_period_ends'),
  createdAt: timestamp('created_at').default(sql`NOW()`),
  updatedAt: timestamp('updated_at').default(sql`NOW()`),
  metadata: jsonb('metadata'),
}, (table) => ({
  idxCustomerId: index('idx_subscriptions_customer_id').on(table.customerId),
  idxStatus: index('idx_subscriptions_status').on(table.status),
  idxCreatedAt: index('idx_subscriptions_created_at').on(table.createdAt),
  idxPeriodEnd: index('idx_subscriptions_period_end').on(table.currentPeriodEnd),
}));

// Invoices table
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  subscriptionId: text('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  number: text('number'),
  status: text('status', { enum: ['draft', 'open', 'paid', 'uncollectible', 'void'] }).notNull(),
  amountDue: decimal('amount_due', { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).default(0),
  currency: text('currency').default('usd'),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').default(sql`NOW()`),
}, (table) => ({
  idxCustomerId: index('idx_invoices_customer_id').on(table.customerId),
  idxStatus: index('idx_invoices_status').on(table.status),
  idxPaidAt: index('idx_invoices_paid_at').on(table.paidAt),
  idxCreatedAt: index('idx_invoices_created_at').on(table.createdAt),
}));

// Payments table
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('usd'),
  status: text('status', { enum: ['succeeded', 'failed', 'processing', 'requires_action'] }).notNull(),
  paymentMethodType: text('payment_method_type'),
  createdAt: timestamp('created_at').default(sql`NOW()`),
}, (table) => ({
  idxCustomerId: index('idx_payments_customer_id').on(table.customerId),
  idxStatus: index('idx_payments_status').on(table.status),
  idxCreatedAt: index('idx_payments_created_at').on(table.createdAt),
}));

// Subscription events table
export const subscriptionEvents = pgTable('subscription_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  source: text('source').notNull(),
  data: jsonb('data').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').default(sql`NOW()`),
}, (table) => ({
  idxType: index('idx_subscription_events_type').on(table.type),
  idxSource: index('idx_subscription_events_source').on(table.source),
  idxProcessed: index('idx_subscription_events_processed').on(table.processed),
  idxCreatedAt: index('idx_subscription_events_created_at').on(table.createdAt),
}));

// Payment retry attempts table
export const paymentRetryAttempts = pgTable('payment_retry_attempts', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  subscriptionId: text('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  attemptNumber: integer('attempt_number').notNull(),
  status: text('status', { enum: ['scheduled', 'in_progress', 'succeeded', 'failed', 'canceled'] }).notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  retryable: boolean('retryable').default(true),
  nextRetryAt: timestamp('next_retry_at'),
  createdAt: timestamp('created_at').default(sql`NOW()`),
}, (table) => ({
  idxCustomerId: index('idx_payment_retry_customer_id').on(table.customerId),
  idxStatus: index('idx_payment_retry_status').on(table.status),
  idxScheduledFor: index('idx_payment_retry_scheduled_for').on(table.scheduledFor),
  idxCreatedAt: index('idx_payment_retry_created_at').on(table.createdAt),
}));

// Dunning events table
export const dunningEvents = pgTable('dunning_events', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  eventType: text('event_type', { enum: ['payment_failed', 'retry_scheduled', 'retry_attempt', 'email_sent', 'subscription_canceled'] }).notNull(),
  statusBefore: text('status_before'),
  statusAfter: text('status_after'),
  emailSent: boolean('email_sent').default(false),
  emailTemplate: text('email_template'),
  emailSentAt: timestamp('email_sent_at'),
  attemptNumber: integer('attempt_number'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`),
}, (table) => ({
  idxCustomerId: index('idx_dunning_events_customer_id').on(table.customerId),
  idxEventType: index('idx_dunning_events_event_type').on(table.eventType),
  idxCreatedAt: index('idx_dunning_events_created_at').on(table.createdAt),
}));

// Schema object
const dbSchema = {
  customers,
  subscriptions,
  invoices,
  payments,
  subscriptionEvents,
  paymentRetryAttempts,
  dunningEvents,
};

export default dbSchema;
export { dbSchema };
