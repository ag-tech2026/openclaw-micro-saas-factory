import {
  checkSystemHealth,
  checkDatabaseHealth,
  checkApiHealth,
  checkIngestHealth,
  checkSentryHealth,
  checkBusinessHealth,
  checkIntegrationsHealth,
} from './modules';
import { db } from '@/db';
import { healthMetrics as healthMetricsTable } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { HealthCheckResult, HealthStatusResponse, HealthMetric } from './types';

/**
 * Run all health checks and aggregate results
 */
export async function runAllChecks(apiBaseUrl?: string): Promise<HealthStatusResponse> {
  const modules = [
    checkSystemHealth(),
    checkDatabaseHealth(),
    checkApiHealth(apiBaseUrl),
    checkIngestHealth(),
    checkSentryHealth(),
    checkBusinessHealth(),
    checkIntegrationsHealth(),
  ];

  const results = await Promise.allSettled(modules);
  const checks: Record<string, HealthCheckResult> = {};
  const allMetrics: HealthMetric[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      const check = result.value;
      checks[check.module] = check;
      allMetrics.push(...check.metrics);

      if (check.status === 'down') {
        overallStatus = 'down';
      } else if (check.status === 'degraded' && overallStatus !== 'down') {
        overallStatus = 'degraded';
      }
    } else {
      // Failed check
      const moduleName = (result as any).value?.module || `unknown-${idx}`;
      checks[moduleName] = {
        module: moduleName,
        status: 'down',
        timestamp: new Date(),
        metrics: [],
        summary: 'Health check failed',
        error: result.reason?.message || 'Unknown error',
      };
      overallStatus = 'down';
    }
  });

  const summary = {
    healthy: Object.values(checks).filter(c => c.status === 'healthy').length,
    degraded: Object.values(checks).filter(c => c.status === 'degraded').length,
    down: Object.values(checks).filter(c => c.status === 'down').length,
  };

  return {
    overall: overallStatus,
    timestamp: new Date(),
    checks,
    summary,
  };
}

/**
 * Persist health metrics to database
 */
export async function persistHealthMetrics(response: HealthStatusResponse): Promise<void> {
  try {
    // Flatten all metrics into rows
    const rows = response.checks[Object.keys(response.checks)[0]]?.metrics
      ? Object.values(response.checks).flatMap(check =>
          check.metrics.map(metric => ({
            timestamp: metric.timestamp,
            module: metric.module,
            metric: metric.metric,
            value: metric.value,
            unit: metric.unit,
            status: metric.status,
            details: metric.details || null,
            tags: metric.tags || null,
          }))
        )
      : [];

    if (rows.length === 0) return;

    // Bulk insert in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.insert(healthMetricsTable).values(batch);
    }

    console.log(`Persisted ${rows.length} health metrics`);
  } catch (err) {
    console.error('Failed to persist health metrics:', err);
    // Don't throw - health collection should continue even if persistence fails
  }
}

/**
 * Get health metrics history from database
 */
export async function getHealthHistory(
  metric: string,
  module?: string,
  range: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'
): Promise<Array<{ timestamp: Date; value: number; status: string }>> {
  try {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const whereConditions = [
      gte(healthMetricsTable.timestamp, startDate),
      eq(healthMetricsTable.metric, metric),
    ];

    if (module) {
      whereConditions.push(eq(healthMetricsTable.module, module));
    }

    const results = await db
      .select({
        timestamp: healthMetricsTable.timestamp,
        value: healthMetricsTable.value,
        status: healthMetricsTable.status,
      })
      .from(healthMetricsTable)
      .where(sql`${whereConditions.join(' AND ')}`)
      .orderBy(healthMetricsTable.timestamp);

    return results.map(r => ({
      timestamp: r.timestamp,
      value: Number(r.value),
      status: r.status,
    }));
  } catch (err) {
    console.error('Failed to fetch health history:', err);
    return [];
  }
}

// Import needed for getHealthHistory
import { gte, eq } from 'drizzle-orm/expressions';
