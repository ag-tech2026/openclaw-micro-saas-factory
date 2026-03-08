/**
 * Admin Dunning Metrics API
 * Provides metrics and management for payment retry and dunning
 */

import { NextRequest, NextResponse } from 'next/server';
import { subscriptionDb } from '@/lib/subscription-db';
import { requireAdmin } from '@/lib/auth-utils';

/**
 * GET /api/admin/dunning/metrics
 * Returns comprehensive dunning metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get summary metrics
    const summary = await getDunningSummary(startDate, endDate);

    // Get recent failed payments
    const recentFailures = await getRecentPaymentFailures(50);

    // Get retry schedule (upcoming)
    const upcomingRetries = await getUpcomingRetries(50);

    // Get customers in dunning
    const customersInDunning = await getCustomersInDunning(50);

    // Get retry success rate
    const retrySuccessRate = await getRetrySuccessRate(startDate, endDate);

    // Get email metrics
    const emailMetrics = await getEmailMetrics(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        retrySuccessRate,
        emailMetrics,
        recentFailures,
        upcomingRetries,
        customersInDunning,
      },
    });
  } catch (error: any) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: error.status });
    }
    console.error('Admin dunning metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dunning metrics' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Metric Queries
// ============================================================================

async function getDunningSummary(startDate: string, endDate: string) {
  const query = `
    SELECT
      -- Customers in dunning
      COUNT(DISTINCT c.id) FILTER (WHERE c.dunning_status != 'none') as customers_in_dunning,
      -- Failed payments in period
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'failed' AND p.created_at >= $1 AND p.created_at <= $2) as failed_payments,
      -- Payment retry attempts
      COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= $1 AND r.created_at <= $2) as total_retry_attempts,
      COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'succeeded' AND r.created_at >= $1 AND r.created_at <= $2) as successful_retries,
      COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'failed' AND r.created_at >= $1 AND r.created_at <= $2) as failed_retries,
      -- Subscriptions canceled due to dunning
      COUNT(DISTINCT s.id) FILTER (WHERE s.canceled_due_to_dunning = TRUE AND s.updated_at >= $1 AND s.updated_at <= $2) as subscriptions_canceled_due_to_dunning,
      -- Total amount recovered
      COALESCE(SUM(CASE WHEN r.status = 'succeeded' THEN r.amount ELSE 0 END), 0) as amount_recovered
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    LEFT JOIN payments p ON c.id = p.customer_id
    LEFT JOIN payment_retry_attempts r ON c.id = r.customer_id
    LEFT JOIN subscriptions s ON c.id = s.customer_id
    WHERE c.updated_at >= $1 AND c.updated_at <= $2
  `;

  const result = await subscriptionDb.query(query, [startDate, endDate]);
  const row: any = result.rows[0];

  return {
    customersInDunning: parseInt(row.customers_in_dunning) || 0,
    failedPayments: parseInt(row.failed_payments) || 0,
    totalRetryAttempts: parseInt(row.total_retry_attempts) || 0,
    successfulRetries: parseInt(row.successful_retries) || 0,
    failedRetries: parseInt(row.failed_retries) || 0,
    subscriptionsCanceledDueToDunning: parseInt(row.subscriptions_canceled_due_to_dunning) || 0,
    amountRecovered: parseFloat(row.amount_recovered) || 0,
  };
}

async function getRetrySuccessRate(startDate: string, endDate: string) {
  const result = await subscriptionDb.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM payment_retry_attempts
    WHERE created_at >= $1 AND created_at <= $2
  `, [startDate, endDate]);

  const row: any = result.rows[0];
  const total = parseInt(row.total) || 0;
  const succeeded = parseInt(row.succeeded) || 0;

  return {
    totalAttempts: total,
    successfulAttempts: succeeded,
    failedAttempts: parseInt(row.failed) || 0,
    successRate: total > 0 ? (succeeded / total) * 100 : 0,
  };
}

async function getEmailMetrics(startDate: string, endDate: string) {
  const result = await subscriptionDb.query(`
    SELECT
      COUNT(*) as total_emails,
      COUNT(*) FILTER (WHERE email_sent = TRUE) as sent,
      COUNT(*) FILTER (WHERE email_sent = FALSE) as failed
    FROM dunning_events
    WHERE event_type = 'email_sent' AND created_at >= $1 AND created_at <= $2
  `, [startDate, endDate]);

  const row: any = result.rows[0];

  return {
    totalEmails: parseInt(row.total_emails) || 0,
    sentEmails: parseInt(row.sent) || 0,
    failedEmails: parseInt(row.failed) || 0,
  };
}

async function getRecentPaymentFailures(limit: number) {
  const result = await subscriptionDb.query(`
    SELECT
      p.id as payment_id,
      p.customer_id,
      c.email as customer_email,
      c.name as customer_name,
      c.dunning_status,
      c.failed_payment_count,
      p.amount,
      p.currency,
      p.created_at as payment_failed_at,
      i.id as invoice_id,
      i.due_date
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE p.status = 'failed'
    ORDER BY p.created_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map((row: any) => ({
    paymentId: row.payment_id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    dunningStatus: row.dunning_status,
    failedPaymentCount: row.failed_payment_count,
    amount: parseFloat(row.amount),
    currency: row.currency,
    paymentFailedAt: row.payment_failed_at,
    invoiceId: row.invoice_id,
    dueDate: row.due_date,
  }));
}

async function getUpcomingRetries(limit: number) {
  const result = await subscriptionDb.query(`
    SELECT
      r.id as retry_id,
      r.customer_id,
      c.email as customer_email,
      c.name as customer_name,
      r.invoice_id,
      r.attempt_number,
      r.scheduled_for,
      r.status
    FROM payment_retry_attempts r
    JOIN customers c ON r.customer_id = c.id
    WHERE r.status = 'scheduled' AND r.scheduled_for > NOW()
    ORDER BY r.scheduled_for ASC
    LIMIT $1
  `, [limit]);

  return result.rows.map((row: any) => ({
    retryId: row.retry_id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    invoiceId: row.invoice_id,
    attemptNumber: row.attempt_number,
    scheduledFor: row.scheduled_for,
  }));
}

async function getCustomersInDunning(limit: number) {
  const result = await subscriptionDb.query(`
    SELECT
      c.id,
      c.email,
      c.name,
      c.dunning_status,
      c.failed_payment_count,
      c.last_payment_failed_at,
      s.id as subscription_id,
      s.plan_name,
      s.status as subscription_status,
      s.retry_attempts,
      COALESCE(SUM(i.amount_due), 0) as total_overdue
    FROM customers c
    LEFT JOIN subscriptions s ON c.id = s.customer_id AND s.status != 'canceled'
    LEFT JOIN invoices i ON c.id = i.customer_id AND i.status = 'open'
    WHERE c.dunning_status != 'none'
    GROUP BY c.id, s.id, s.plan_name, s.status, s.retry_attempts
    ORDER BY c.failed_payment_count DESC, c.last_payment_failed_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map((row: any) => ({
    customerId: row.id,
    email: row.email,
    name: row.name,
    dunningStatus: row.dunning_status,
    failedPaymentCount: row.failed_payment_count,
    lastPaymentFailedAt: row.last_payment_failed_at,
    subscriptionId: row.subscription_id,
    planName: row.plan_name,
    subscriptionStatus: row.subscription_status,
    retryAttempts: row.retry_attempts,
    totalOverdue: parseFloat(row.total_overdue),
  }));
}
