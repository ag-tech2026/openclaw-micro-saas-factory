import { db } from '@/db';
import { customers, subscriptions, invoices } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { eq, and, gte, lte, between as betweenExp } from 'drizzle-orm/expressions';
import { HealthCheckResult, BusinessMetrics, HealthMetric } from '../types';

/**
 * Business Metrics Health Check Module
 *
 * Collects:
 * - MRR (Monthly Recurring Revenue)
 * - Active subscriptions count
 * - New signups (7d, 30d)
 * - Churned subscriptions (7d, 30d)
 * - Churn rate
 * - Dunning customers count
 */
export async function checkBusinessHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'Business metrics collected';
  let error: string | undefined;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Active subscriptions (status = 'active')
    const activeSubsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const activeSubscriptions = activeSubsResult[0]?.count || 0;

    metrics.push({
      timestamp: now,
      module: 'business',
      metric: 'active_subscriptions',
      value: activeSubscriptions,
      unit: 'count',
      status: 'healthy',
      details: { period: 'current' },
      tags: { metric: 'subscriptions' },
    });

    // 2. New signups (customers created in last 7d and 30d)
    // New customers are those without a linked user or with recent creation
    const newSignups7dResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(gte(customers.createdAt, sevenDaysAgo));

    const newSignups7d = newSignups7dResult[0]?.count || 0;

    metrics.push({
      timestamp: now,
      module: 'business',
      metric: 'new_signups_7d',
      value: newSignups7d,
      unit: 'count',
      status: 'healthy',
      details: { period: '7d' },
      tags: { metric: 'signups' },
    });

    const newSignups30dResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(gte(customers.createdAt, thirtyDaysAgo));

    const newSignups30d = newSignups30dResult[0]?.count || 0;

    metrics.push({
      timestamp: now,
      module: 'business',
      metric: 'new_signups_30d',
      value: newSignups30d,
      unit: 'count',
      status: 'healthy',
      details: { period: '30d' },
      tags: { metric: 'signups' },
    });

    // 3. Churned subscriptions (canceled in last 7d)
    // We consider subscriptions that were active but are now canceled or past_due and had a cancellation date
    const churnedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'canceled'),
          gte(subscriptions.canceledAt!, sevenDaysAgo)
        )
      );

    const churned7d = churnedResult[0]?.count || 0;

    metrics.push({
      timestamp: now,
      module: 'business',
      metric: 'churned_7d',
      value: churned7d,
      unit: 'count',
      status: 'healthy',
      details: { period: '7d' },
      tags: { metric: 'churn' },
    });

    // 4. Churn rate calculation
    // Churn rate = (churned in period) / (active at start of period + new signups in period)
    // Approximation: (churned 7d) / ((active subs - churned) + new signups 7d)
    const activeAtStartOfPeriod = activeSubscriptions - churned7d + newSignups7d; // Rough estimate
    const churnRate = activeAtStartOfPeriod > 0 ? churned7d / activeAtStartOfPeriod : 0;

    metrics.push({
      timestamp: now,
      module: 'business',
      metric: 'churn_rate_7d',
      value: churnRate * 100,
      unit: 'pct',
      status: churnRate > 0.1 ? 'degraded' : // >10% weekly = 100%+ annualized
              churnRate > 0.05 ? 'down' : 'healthy',
      details: {
        churned: churned7d,
        activeAtStart: activeAtStartOfPeriod,
        period: '7d',
      },
      tags: { metric: 'churn' },
    });

    // 5. MRR calculation
    // For Polar subscriptions, we need to sum invoice amounts with status 'paid' for the current billing cycle
    // Simplified: sum all open invoices that belong to active subscriptions, converted to monthly equivalent
    // We'll use current_period_end to determine current cycle
    let mrr = 0; // Declare in outer scope to use later
    try {
      const mrrResult = await db
        .select({
          total: sql<number>`sum(
            CASE
              WHEN s.billing_interval = 'month' THEN i.amount_due
              WHEN s.billing_interval = 'year' THEN i.amount_due / 12
              ELSE i.amount_due
            END
          )`,
        })
        .from(subscriptions.as('s'))
        .innerJoin(
          invoices.as('i'),
          and(
            eq(sql`s.customer_id`, sql`i.customer_id`),
            eq(sql`s.id`, sql`i.subscription_id`),
            eq(sql`i.status`, 'open') // open invoices for current period
          )
        )
        .where(eq(sql`s.status`, 'active'));

      mrr = mrrResult[0]?.total || 0;

      metrics.push({
        timestamp: now,
        module: 'business',
        metric: 'mrr_cents',
        value: mrr,
        unit: 'currency',
        status: 'healthy',
        details: { currency: 'USD', interval: 'monthly' },
        tags: { metric: 'revenue' },
      });

      // Also store MRR in dollars for easier reading
      metrics.push({
        timestamp: now,
        module: 'business',
        metric: 'mrr_usd',
        value: mrr / 100,
        unit: 'currency',
        status: 'healthy',
        details: { currency: 'USD', interval: 'monthly' },
        tags: { metric: 'revenue' },
      });

    } catch (mrrErr) {
      console.warn('Could not calculate MRR:', mrrErr);
      metrics.push({
        timestamp: now,
        module: 'business',
        metric: 'mrr_error',
        value: 1,
        unit: 'status',
        status: 'degraded',
        details: { error: String(mrrErr) },
      });
    }

    // 6. Dunning count (customers with failed payments in dunning)
    const dunningResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(
        and(
          eq(customers.dunningStatus, 'active'),
          eq(customers.status, 'active')
        )
      );

    const dunningCount = dunningResult[0]?.count || 0;

    metrics.push({
      timestamp: now,
      module: 'business',
      metric: 'dunning_customers',
      value: dunningCount,
      unit: 'count',
      status: dunningCount > 50 ? 'degraded' :
              dunningCount > 100 ? 'down' : 'healthy',
      details: { period: 'current' },
      tags: { category: 'payment' },
    });

    // 7. Overall business health assessment
    const totalFailedInvoices = 0; // Could query if needed
    const failedInvoiceRate = activeSubscriptions > 0 ? totalFailedInvoices / activeSubscriptions : 0;

    const degradedMetrics = metrics.filter(m => m.status === 'degraded' || m.status === 'down');
    if (degradedMetrics.length > 0) {
      status = degradedMetrics.some(m => m.status === 'down') ? 'down' : 'degraded';
      summary = `Business metrics: ${degradedMetrics.length} warning${degradedMetrics.length > 1 ? 's' : ''}`;
    } else {
      const mrrUsd = mrr / 100;
      const churnPct = churnRate * 100;
      summary = `Business: ${activeSubscriptions} subs, $${mrrUsd.toFixed(0)} MRR, ${churnPct.toFixed(1)}% churn`;
    }

  } catch (err: any) {
    console.error('Business health check error:', err);
    status = 'down';
    error = err.message || 'Business health check failed';
    summary = 'Business metrics unavailable';
  }

  return {
    module: 'business',
    status,
    timestamp: new Date(),
    metrics,
    summary,
    error,
  };
}
