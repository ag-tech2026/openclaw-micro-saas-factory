import { env } from '@/lib/config';
import { HealthCheckResult, SentryHealth, HealthMetric } from '../types';

/**
 * Sentry Health Check Module
 *
 * Queries Sentry API for:
 * - Error count in last 24h
 * - Error rate (errors per minute)
 * - Top error types
 */
export async function checkSentryHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'Sentry operational';
  let error: string | undefined;

  const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!sentryDsn) {
    // Sentry not configured - skip but mark as healthy (not an error)
    return {
      module: 'sentry',
      status: 'healthy',
      timestamp: new Date(),
      metrics,
      summary: 'Sentry not configured',
    };
  }

  try {
    // Parse DSN to get organization and project
    // DSN format: https://{publicKey}@{host}/{projectId}
    const dsnMatch = sentryDsn.match(/https:\/\/[^@]+@([^\/]+)\/(\d+)/);
    if (!dsnMatch) {
      throw new Error('Invalid Sentry DSN format');
    }

    const [, host, projectId] = dsnMatch;
    const authToken = process.env.SENTRY_AUTH_TOKEN;

    if (!authToken) {
      // Without auth token, we can't query errors. Skip with warning.
      metrics.push({
        timestamp: new Date(),
        module: 'sentry',
        metric: 'auth_missing',
        value: 1,
        unit: 'status',
        status: 'degraded',
        details: { message: 'SENTRY_AUTH_TOKEN not set' },
      });
      status = 'degraded';
      summary = 'Sentry: no auth token for error queries';
      return {
        module: 'sentry',
        status,
        timestamp: new Date(),
        metrics,
        summary,
      };
    }

    // Build API URL
    const apiUrl = `https://${host}/api/0/projects/${projectId}/stats/`;
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 24 * 60 * 60;

    // Query error stats (issues) over last 24h
    // Sentry stats endpoint: /api/0/projects/{org}/{project}/stats/
    // With query parameters: since=timestamp&resolution=1h or 1d
    const statsUrl = `${apiUrl}?since=${dayAgo}&resolution=1h`;

    const response = await fetch(statsUrl, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // The response structure varies by Sentry version.
    // Typically: { "series": [ [ts, count], ... ], "totals": { total: X } }
    // For issues stats endpoint, might be different.
    // We'll try to extract the total count.

    let totalErrors = 0;
    let errorRate = 0;

    if (Array.isArray(data.series) && data.series.length > 0) {
      // Sum all data points
      totalErrors = data.series.reduce((sum: number, point: [number, number]) => sum + point[1], 0);
      errorRate = totalErrors / (24 * 60); // errors per minute
    } else if (data.totals) {
      totalErrors = data.totals.total || 0;
      errorRate = totalErrors / (24 * 60);
    }

    metrics.push({
      timestamp: new Date(),
      module: 'sentry',
      metric: 'errors_24h',
      value: totalErrors,
      unit: 'count',
      status: totalErrors > 1000 ? 'down' :
              totalErrors > 100 ? 'degraded' : 'healthy',
      details: { period: '24h' },
      tags: { source: 'sentry' },
    });

    metrics.push({
      timestamp: new Date(),
      module: 'sentry',
      metric: 'error_rate_per_min',
      value: errorRate,
      unit: 'count',
      status: errorRate > 100 ? 'down' :
              errorRate > 10 ? 'degraded' : 'healthy',
      details: { period: '24h' },
      tags: { source: 'sentry' },
    });

    // Query top error types (issues)
    const issuesUrl = `https://${host}/api/0/projects/${projectId}/issues/`;
    const issuesResponse = await fetch(
      `${issuesUrl}?statsPeriod=24h&query=is:unresolved&sort=count&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (issuesResponse.ok) {
      const issuesData = await issuesResponse.json();
      const topErrors: Array<{ type: string; count: number; lastSeen: Date }> = [];

      for (const issue of issuesData) {
        topErrors.push({
          type: issue.title || issue.culprit || 'unknown',
          count: issue.count || 0,
          lastSeen: new Date(issue.lastSeen),
        });
      }

      metrics.push({
        timestamp: new Date(),
        module: 'sentry',
        metric: 'top_errors_count',
        value: topErrors.length,
        unit: 'count',
        status: 'healthy',
        details: { topErrors },
        tags: { category: 'issues' },
      });
    }

    // Evaluate overall status
    const worstStatus = metrics
      .filter(m => m.module === 'sentry')
      .map(m => m.status)
      .reduce((worst, current) => {
        if (current === 'down') return 'down';
        if (current === 'degraded' && worst !== 'down') return 'degraded';
        return worst;
      }, 'healthy');

    status = worstStatus as 'healthy' | 'degraded' | 'down';
    summary = `Sentry: ${totalErrors} errors in 24h`;

  } catch (err: any) {
    console.error('Sentry health check error:', err);
    status = 'down';
    error = err.message || 'Sentry API unreachable';
    summary = 'Sentry unreachable';
  }

  return {
    module: 'sentry',
    status,
    timestamp: new Date(),
    metrics,
    summary,
    error,
  };
}
