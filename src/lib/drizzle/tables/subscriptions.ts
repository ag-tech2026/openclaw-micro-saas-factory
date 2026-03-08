import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';

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
  createdAt: timestamp('created_at').default(sql`NOW()`),
  updatedAt: timestamp('updated_at').default(sql`NOW()`),
  metadata: jsonb('metadata'),
}, (table) => ({
  idxCustomerId: index('idx_subscriptions_customer_id').on(table.customerId),
  idxStatus: index('idx_subscriptions_status').on(table.status),
  idxCreatedAt: index('idx_subscriptions_created_at').on(table.createdAt),
  idxPeriodEnd: index('idx_subscriptions_period_end').on(table.currentPeriodEnd),
}));
