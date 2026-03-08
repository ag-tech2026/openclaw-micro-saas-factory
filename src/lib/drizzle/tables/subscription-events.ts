import { pgTable, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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
