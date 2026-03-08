import { pgTable, text, timestamp, decimal, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';
import { subscriptions } from './subscriptions.ts';

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
