import { pgTable, text, timestamp, decimal, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customers } from './customers.ts';
import { invoices } from './invoices.ts';

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
