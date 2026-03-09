import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/db';
import { healthAlerts as healthAlertsTable } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { desc, gte } from 'drizzle-orm/expressions';

/**
 * GET /api/health/alerts
 *
 * List recent health alerts.
 * Requires admin authentication.
 *
 * Query parameters:
 * - resolved (optional): 'true' or 'false' to filter
 * - limit (optional): max number to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const resolvedFilter = searchParams.get('resolved');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Build query
    const query = db.select().from(healthAlertsTable);

    // Filter by resolved status if specified
    if (resolvedFilter !== null) {
      const isResolved = resolvedFilter === 'true';
      query.where(eq(healthAlertsTable.resolved, isResolved));
    }

    // Get recent alerts, ordered by creation time descending
    const alerts = await query
      .orderBy(desc(healthAlertsTable.createdAt))
      .limit(limit);

    // Serialize dates
    const serialized = alerts.map(alert => ({
      id: alert.id,
      createdAt: alert.createdAt.toISOString(),
      resolvedAt: alert.resolvedAt?.toISOString(),
      module: alert.module,
      metric: alert.metric,
      severity: alert.severity,
      threshold: alert.threshold,
      observedValue: alert.observedValue,
      message: alert.message,
      dedupeKey: alert.dedupeKey,
      resolved: alert.resolved,
      resolvedBy: alert.resolvedBy,
      channelsSent: alert.channelsSent || {},
      deliveredAt: alert.deliveredAt?.toISOString(),
      metricId: alert.metricId,
    }));

    return NextResponse.json({
      alerts: serialized,
      total: serialized.length,
    });

  } catch (error: any) {
    console.error('Health alerts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/health/alerts
 *
 * Bulk update alerts (e.g., mark as resolved).
 * Requires admin authentication.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alertIds, resolved, resolvedBy } = body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'alertIds array is required' },
        { status: 400 }
      );
    }

    if (typeof resolved !== 'boolean') {
      return NextResponse.json(
        { error: 'resolved (boolean) is required' },
        { status: 400 }
      );
    }

    const updateData: any = { resolved };
    if (resolved) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = resolvedBy || user.id;
    }

    const [result] = await db
      .update(healthAlertsTable)
      .set(updateData)
      .where(sql`id = ANY(${alertIds})`)
      .returning({ count: sql`count(*)` });

    return NextResponse.json({
      success: true,
      updated: result?.count || alertIds.length,
    });

  } catch (error: any) {
    console.error('Health alerts PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update alerts', message: error.message },
      { status: 500 }
    );
  }
}
