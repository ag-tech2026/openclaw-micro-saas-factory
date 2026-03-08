-- Migration: Add payment retry and dunning management tables
-- Date: 2026-03-08
-- Description: Adds tables and fields for automated payment retry logic, dunning management, and email reminders

-- Add dunning fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS dunning_status text DEFAULT 'none' CHECK (dunning_status IN ('none', 'pending', 'active', 'canceled')),
ADD COLUMN IF NOT EXISTS last_payment_failed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS failed_payment_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS dunning_emails_sent integer DEFAULT 0;

-- Add dunning fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS retry_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS canceled_due_to_dunning boolean DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dunning_grace_period_ends timestamp with time zone;

-- Create payment_retry_attempts table
CREATE TABLE IF NOT EXISTS payment_retry_attempts (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id text REFERENCES invoices(id) ON DELETE SET NULL,
  subscription_id text REFERENCES subscriptions(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'succeeded', 'failed', 'canceled')),
  scheduled_for timestamp with time zone NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  error_code text,
  retryable boolean DEFAULT TRUE,
  next_retry_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Create index for payment_retry_attempts
CREATE INDEX IF NOT EXISTS idx_payment_retry_customer_id ON payment_retry_attempts(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_status ON payment_retry_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_retry_scheduled_for ON payment_retry_attempts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_payment_retry_created_at ON payment_retry_attempts(created_at);

-- Create dunning_events table
CREATE TABLE IF NOT EXISTS dunning_events (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id text REFERENCES invoices(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('payment_failed', 'retry_scheduled', 'retry_attempt', 'email_sent', 'subscription_canceled')),
  status_before text,
  status_after text,
  email_sent boolean DEFAULT FALSE,
  email_template text,
  email_sent_at timestamp with time zone,
  attempt_number integer,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Create index for dunning_events
CREATE INDEX IF NOT EXISTS idx_dunning_events_customer_id ON dunning_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_dunning_events_event_type ON dunning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_dunning_events_created_at ON dunning_events(created_at);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_dunning_status ON customers(dunning_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_retry_attempts ON subscriptions(retry_attempts);
