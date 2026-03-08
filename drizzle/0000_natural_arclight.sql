CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT NOW(),
	"updated_at" timestamp DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"subscription_id" text,
	"number" text,
	"status" text NOT NULL,
	"amount_due" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT 0,
	"currency" text DEFAULT 'usd',
	"due_date" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"invoice_id" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'usd',
	"status" text NOT NULL,
	"payment_method_type" text,
	"created_at" timestamp DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"data" jsonb NOT NULL,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text,
	"billing_interval" text,
	"status" text NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT NOW(),
	"updated_at" timestamp DEFAULT NOW(),
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_customers_email" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_customers_status" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_customers_created_at" ON "customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_invoices_customer_id" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invoices_paid_at" ON "invoices" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "idx_invoices_created_at" ON "invoices" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_customer_id" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_created_at" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_subscription_events_type" ON "subscription_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_subscription_events_source" ON "subscription_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_subscription_events_processed" ON "subscription_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_subscription_events_created_at" ON "subscription_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_customer_id" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_created_at" ON "subscriptions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_period_end" ON "subscriptions" USING btree ("current_period_end");

-- Function for MRR calculation (simplified version)
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
    COUNT(s.id) * 29.99 as mrr,
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

-- migrate:down

DROP FUNCTION IF EXISTS calculate_mrr;

-- Drop foreign key constraints first
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_subscription_id_subscriptions_id_fk";
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_customer_id_customers_id_fk";
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_invoice_id_invoices_id_fk";
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_customer_id_customers_id_fk";
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_customer_id_customers_id_fk";

-- Drop tables (indexes are automatically dropped with tables)
DROP TABLE IF EXISTS "subscription_events";
DROP TABLE IF EXISTS "payments";
DROP TABLE IF EXISTS "invoices";
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "customers";
