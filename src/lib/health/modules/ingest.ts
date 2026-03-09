import { db } from '@/db';
import { jobQueueHistory, analyticsEvents } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { desc, gt, lte, between } from 'drizzle-orm/expressions';
import { HealthCheckResult, IngestHealth, HealthMetric } from '../types';

/**
 * Inngest/Job Queue Health Check Module
 *
 * Collects:
 * - Number of recent jobs (last 24h)
 * - Job success rate
 * - Average job duration
 * - Current queue depth (pending jobs)
 * - Top error types
 */
export async function checkIngestHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'Job queue healthy';
  let error: string | undefined;

  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Get recent job stats from jobQueueHistory (past 24h)
    const recentJobsResult = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where status = 'completed')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`,
        processing: sql<number>`count(*) filter (where status = 'processing')`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        avgDuration: sql<number>`avg(processing_duration_ms)`,
      })
      .from(jobQueueHistory)
      .where(gt(jobQueueHistory.createdAt, dayAgo));

    const recentJobs = recentJobsResult[0];
    const totalJobs = recentJobs.total || 0;
    const completedJobs = recentJobs.completed || 0;
    const failedJobs = recentJobs.failed || 0;
    const processingJobs = recentJobs.processing || 0;
    const pendingJobs = recentJobs.pending || 0;
    const avgDuration = recentJobs.avgDuration || 0;

    // Success rate (completed / (completed + failed + processing)), ignoring pending
    const settledJobs = completedJobs + failedJobs + processingJobs;
    const successRate = settledJobs > 0 ? completedJobs / settledJobs : 1;

    metrics.push({
      timestamp: new Date(),
      module: 'ingest',
      metric: 'jobs_24h',
      value: totalJobs,
      unit: 'count',
      status: 'healthy',
      details: { total: totalJobs, completed: completedJobs, failed: failedJobs, processing: processingJobs, pending: pendingJobs },
      tags: { period: '24h' },
    });

    metrics.push({
      timestamp: new Date(),
      module: 'ingest',
      metric: 'success_rate',
      value: successRate * 100,
      unit: 'pct',
      status: successRate < 0.9 ? 'degraded' : successRate < 0.8 ? 'down' : 'healthy',
      details: { settled: settledJobs, completed: completedJobs },
      tags: { period: '24h' },
    });

    metrics.push({
      timestamp: new Date(),
      module: 'ingest',
      metric: 'avg_duration_ms',
      value: avgDuration,
      unit: 'ms',
      status: avgDuration > 300000 ? 'down' : // > 5 min
              avgDuration > 120000 ? 'degraded' : 'healthy',
      details: { samples: completedJobs },
      tags: { period: '24h' },
    });

    metrics.push({
      timestamp: new Date(),
      module: 'ingest',
      metric: 'queue_depth',
      value: pendingJobs,
      unit: 'count',
      status: pendingJobs > 1000 ? 'down' :
              pendingJobs > 500 ? 'degraded' : 'healthy',
      details: { pending: pendingJobs, processing: processingJobs },
      tags: { resource: 'queue' },
    });

    // 2. Top error types from failed jobs
    const errorTypesResult = await db
      .select({
        error: sql<string>`coalesce(error, 'unknown')`,
        count: sql<number>`count(*)`,
      })
      .from(jobQueueHistory)
      .where(
        and(
          gt(jobQueueHistory.createdAt, dayAgo),
          eq(jobQueueHistory.status, 'failed'),
          sql`error IS NOT NULL`
        )
      )
      .groupBy(sql`error`)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    metrics.push({
      timestamp: new Date(),
      module: 'ingest',
      metric: 'error_types_count',
      value: errorTypesResult.length,
      unit: 'count',
      status: 'healthy',
      details: { topErrors: errorTypesResult },
      tags: { category: 'errors' },
    });

    // 3. Check Redis queue depth if we have access to queue stats
    // Since we don't have direct access to Inngest queue API from server,
    // we'll approximate using pending jobs from DB. Could also query Inngest API if needed.

    // Determine overall status
    const worstStatus = metrics
      .map(m => m.status)
      .reduce((worst, current) => {
        if (current === 'down') return 'down';
        if (current === 'degraded' && worst !== 'down') return 'degraded';
        return worst;
      }, 'healthy');

    if (worstStatus !== 'healthy') {
      status = worstStatus as 'degraded' | 'down';
      summary = status === 'down' ? 'Job queue critical' : 'Job queue degraded';
      if (avgDuration > 300000) {
        error = `High job duration: ${Math.round(avgDuration / 1000)}s`;
      }
    } else {
      summary = `Queue: ${pendingJobs} pending, ${totalJobs} processed (24h), ${Math.round(successRate * 100)}% success`;
    }

    return {
      module: 'ingest',
      status,
      timestamp: new Date(),
      metrics,
      summary,
      error,
    };

  } catch (err: any) {
    console.error('Ingest health check error:', err);
    return {
      module: 'ingest',
      status: 'down',
      timestamp: new Date(),
      metrics,
      summary: 'Ingest health check failed',
      error: err.message,
    };
  }
}

// Helper to combine conditions (since drizzle-orm's and() is re-exported differently)
import { and } from 'drizzle-orm/expressions';
