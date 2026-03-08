import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  status: text('status', { enum: ['active', 'churned', 'paused'] }).default('active'),
  createdAt: timestamp('created_at').default(sql`NOW()`),
  updatedAt: timestamp('updated_at').default(sql`NOW()`),
}, (table) => ({
  idxEmail: index('idx_customers_email').on(table.email),
  idxStatus: index('idx_customers_status').on(table.status),
  idxCreatedAt: index('idx_customers_created_at').on(table.createdAt),
}));
