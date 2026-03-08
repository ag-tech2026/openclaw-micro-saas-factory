import { NextRequest, NextResponse } from 'next/server';
import { calculateMRR, getCurrentMetrics } from '@/lib/subscription-analytics';
import { subscriptionDb } from '@/lib/subscription-db';

/**
 * Fetch subscription analytics data
 * Query params:
 * - start: YYYY-MM-DD
 * - end: YYYY-MM-DD
 *
 * Returns:
 * - mrrData: array of {date, mrr, newSubscriptions, churnedSubscriptions}
 * - metrics: {mrr, activeSubscribers, newSubscribers30d, churnedSubscribers30d, churnRate, asOf}
 * - subscriptions: recent subscription records
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');

    // Default to last 30 days if not specified
    const endDate = endParam ? new Date(endParam) : new Date();
    const startDate = startParam ? new Date(startParam) : new Date(new Date().setDate(new Date().getDate() - 30));

    // Ensure dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Fetch data in parallel
    const [mrrData, metrics, subscriptions] = await Promise.all([
      calculateMRR(startDate, endDate),
      getCurrentMetrics(),
      subscriptionDb.query(`
        SELECT
          s.id as subscription_id,
          c.email as customer_email,
          c.name as customer_name,
          s.plan_name,
          s.billing_interval,
          s.status,
          s.current_period_start,
          s.current_period_end,
          s.canceled_at,
          s.created_at
        FROM subscriptions s
        JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC
        LIMIT 100
      `),
    ]);

    return NextResponse.json({
      mrrData,
      metrics,
      subscriptions: subscriptions.rows,
      dateRange: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
