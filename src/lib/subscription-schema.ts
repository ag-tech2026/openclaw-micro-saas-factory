/**
 * Subscription Analytics Database Schema
 * Run this script to initialize the Neon DB tables
 */

import { subscriptionDb } from './subscription-db';

const SCHEMA = `
-- Customers/Subscribers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active', -- active, churned, paused
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT,
  billing_interval TEXT, -- 'month', 'year', etc.
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'incomplete', 'trialing'
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  number TEXT,
  status TEXT NOT NULL, -- 'draft', 'open', 'paid', 'uncollectible', 'void'
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'succeeded', 'failed', 'processing', 'requires_action'
  payment_method_type TEXT, -- 'card', 'bank_transfer', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Subscription events table (audit log for webhooks)
CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- e.g., 'customer.subscription.created', 'invoice.paid'
  source TEXT NOT NULL, -- 'polar' or 'stripe'
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_source ON subscription_events(source);
CREATE INDEX IF NOT EXISTS idx_subscription_events_processed ON subscription_events(processed);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

-- Function to calculate MRR (simplified version)
-- This can be expanded based on your billing model
CREATE OR REPLACE FUNCTION calculate_mrr(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
  date DATE,
  mrr DECIMAL,
  new_subscriptions DECIMAL,
  churned_subscriptions DECIMAL,
  expansion_revenue DECIMAL,
  contraction_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH daily AS (
    SELECT
      date_trunc('day', s.current_period_start)::date as day,
      COUNT(*) FILTER (WHERE s.status = 'active' AND s.current_period_end > start_date) as active_subs,
      COUNT(*) FILTER (WHERE s.status = 'active' AND date_trunc('day', s.created_at)::date = date_trunc('day', start_date)::date) as new_subs,
      COUNT(*) FILTER (WHERE s.status = 'canceled' AND s.canceled_at >= start_date AND s.canceled_at <= end_date) as churned_subs,
      SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as mrr_base
    FROM subscriptions s
    WHERE s.current_period_start <= end_date AND (s.current_period_end >= start_date OR s.current_period_end IS NULL)
    GROUP BY day
  )
  SELECT
    d.day,
    -- Simplified MRR: count of active subscriptions * average sub value (placeholder)
    -- In production, you'd sum actual subscription amounts by plan
    COUNT(s.id) * 29.99 as mrr, -- Placeholder: needs actual plan pricing
    COUNT(*) FILTER (WHERE date_trunc('day', s.created_at)::date = d.day) as new_subscriptions,
    COUNT(*) FILTER (WHERE s.status = 'canceled' AND date_trunc('day', s.canceled_at)::date = d.day) as churned_subscriptions,
    0 as expansion_revenue,
    0 as contraction_revenue
  FROM subscriptions s
  RIGHT JOIN daily d ON TRUE
  WHERE d.day BETWEEN start_date::date AND end_date::date
  GROUP BY d.day, d.active_subs, d.new_subs, d.churned_subs
  ORDER BY d.day;
END;
$$ LANGUAGE plpgsql;
`;

async function initializeDatabase() {
  try {
    await subscriptionDb.query(SCHEMA);
    console.log('✓ Subscription analytics database schema initialized');
  } catch (error) {
    console.error('✗ Failed to initialize subscription database schema:', error);
    throw error;
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase().then(() => {
    console.log('Database initialization complete');
    process.exit(0);
  });
}

export { initializeDatabase };
