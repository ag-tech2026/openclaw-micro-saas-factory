# Health Checks Developer Guide

This guide explains how to add new health check modules to the OpenClaw monitoring system.

## Overview

The health monitoring system is built around a modular architecture:

- **Modules**: Self-contained health checks for a specific domain (system, database, api, etc.)
- **Collector**: Orchestrates all modules, aggregates results, persists metrics
- **API**: Exposes health data and actions via REST endpoints
- **Dashboard**: React UI using Recharts for visualization
- **Alerts**: Threshold-based notification system

## File Structure

```
src/lib/health/
├── types.ts           # TypeScript interfaces and types
├── collector.ts       # Orchestrates all checks, persistence
├── thresholds.ts      # Threshold configuration from env
├── alerter.ts         # Alert evaluation and delivery
└── modules/
    ├── system.ts      # System resources check
    ├── database.ts    # Database connectivity
    ├── api.ts         # API endpoint probes
    ├── ingest.ts      # Inngest job queue
    ├── sentry.ts      # Sentry error queries
    ├── business.ts    # MRR, subscriptions
    └── integrations.ts # External service pings
```

## Writing a New Health Module

### 1. Define Module Function

A health module is an async function that returns a `HealthCheckResult`:

```typescript
import { HealthCheckResult, HealthMetric } from '../types';

export async function checkCustomHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'Custom check OK';
  let error: string | undefined;

  try {
    // Perform your health checks
    // Add metrics to the array
    metrics.push({
      timestamp: new Date(),
      module: 'custom',
      metric: 'my_metric',
      value: 42,
      unit: 'count',
      status: 'healthy', // or 'degraded' / 'down'
      details: { key: 'value' },
      tags: { category: 'mytag' },
    });

    // Optionally set overall module status based on metrics
    const hasDown = metrics.some(m => m.status === 'down');
    if (hasDown) {
      status = 'down';
      error = 'Something is not working';
    }

  } catch (err: any) {
    status = 'down';
    error = err.message;
  }

  return {
    module: 'custom',
    status,
    timestamp: new Date(),
    metrics,
    summary,
    error,
  };
}
```

### 2. Follow Conventions

**Module name**: Must match one of the `HealthModule` types in `types.ts`. If adding a new module, add it to the union type.

**Metric naming**: Use snake_case. Be specific:
- Good: `api_response_time_homepage_ms`
- Good: `queue_depth_pending`
- Avoid: `latency` (too vague)

**Metric units**:
- `ms` for milliseconds
- `pct` for percentage (0-100)
- `count` for counts/numbers
- `bytes` for memory/disk sizes
- `status` for binary status (0/1)
- `currency` for money (in cents/units)

**Status calculation**:
- Each metric can have its own status
- Overall module status = worst of all metric statuses
- Return `'healthy'` if all good, `'degraded'` if some are degraded but none down, `'down'` if any down

### 3. Handle Errors Gracefully

If a health check fails completely (can't connect, timeout, etc.), still return a result with `status: 'down'` and the error message. This ensures the collector continues with other modules and error is visible in UI.

Use try/catch around each check. Don't let one module's failure crash the whole collector.

### 4. Avoid Side Effects

Health checks should be read-only probes. No mutations, no writes. They should be safe to run frequently.

If you need to test write operations, create a separate endpoint.

### 5. Respect Timeouts

Network calls (fetch, DB queries) should have reasonable timeouts (3-5 seconds) so a slow external service doesn't block all health checks.

### 6. Be Efficient

Health checks run every 5 minutes. Avoid expensive operations (full DB scans, large API responses). Use simple queries like `SELECT 1`.

### 7. Add to Collector

In `src/lib/health/collector.ts`, add your check to the `runAllChecks` function:

```typescript
export async function runAllChecks(apiBaseUrl?: string): Promise<HealthStatusResponse> {
  const modules = [
    checkSystemHealth(),
    checkDatabaseHealth(),
    checkApiHealth(apiBaseUrl),
    checkIngestHealth(),
    checkSentryHealth(),
    checkBusinessHealth(),
    checkIntegrationsHealth(),
    checkCustomHealth(), // << Add here
  ];
  // ... rest unchanged
}
```

Also add it to the `moduleChecks` map in the on-demand endpoint:

```typescript
const moduleChecks: Record<string, () => Promise<any>> = {
  // ... existing
  custom: checkCustomHealth,
};
```

### 8. (Optional) Add Thresholds

If your module has metrics that should trigger alerts, add corresponding thresholds in `src/lib/config.ts`:

```typescript
HEALTH_ALERT_CUSTOM_METRIC_MS: z.string().transform(val => parseInt(val, 10)).default('500'),
```

And in `src/lib/health/thresholds.ts`:

```typescript
export const HEALTH_THRESHOLDS = {
  // ... existing
  customMetricMs: env.HEALTH_ALERT_CUSTOM_METRIC_MS,
} as const;
```

Then in `src/lib/health/alerter.ts`, update the `evaluateAlerts` function to recognize your metric pattern and map to the correct threshold.

### 9. Write Tests

Create a test file for your module:

```typescript
// src/__tests__/health/custom.test.ts
import { checkCustomHealth } from '@/lib/health/modules/custom';

describe('Custom Health Check', () => {
  beforeAll(() => {
    // Setup mocks if needed
  });

  it('should return healthy when service is up', async () => {
    const result = await checkCustomHealth();
    expect(result.module).toBe('custom');
    expect(result.status).toBe('healthy');
    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0].metric).toBe('my_metric');
  });

  it('should return degraded when metric exceeds warning threshold', async () => {
    // Mock condition
    const result = await checkCustomHealth();
    // Assert degraded
  });
});
```

### 10. Update UI Icons (if new module appears on dashboard)

The dashboard auto-discovers modules from the API response. However, you should add an icon for your module in `src/app/admin/health/page.tsx`:

```typescript
const MODULE_ICONS: Record<string, any> = {
  system: Server,
  database: Database,
  // ...
  custom: YourIconFromLucide,
};
```

## Alert Evaluation Logic

The alerter (`src/lib/health/alerter.ts`) examines each metric against thresholds:

```typescript
if (metric.metric.includes('latency') || metric.metric.includes('response_time')) {
  thresholdMetric = metric.module === 'database' ? 'dbLatencyMs' : 'apiResponseTimeMs';
}
```

Add similar pattern-matching for your metric. The mapping is based on metric name suffixes/prefixes.

If your metric needs custom logic (e.g., compare against historical baseline), extend `isDegrading` or add a custom evaluator function.

## Alert Deduplication

Uses a dedupe key: `${module}:${metric}:${Math.round(threshold)}`

Same issue within 24 hours won't re-alert unless resolved explicitly.

## Testing Locally

1. Start dev server: `npm run dev`
2. Login as admin at `/sign-in`
3. Go to `/admin/health`
4. Click "Run Check Now" to trigger manual check immediately
5. View results and history charts

## Debugging

- Check Inngest function logs in Inngest dashboard
- Look at `health_metrics` table directly in database
- API endpoints return full metric arrays for inspection
- Server logs: `console.log` in health modules appear in Next.js dev server output

## Common Pitfalls

- **Missing module registration**: Forgetting to add to `runAllChecks` or `moduleChecks`
- **Wrong timestamp**: Always use `new Date()` not `Date.now()` for metric timestamps
- **Metric serialization**: Dates must be converted to ISO strings before JSON response
- **Unhandled errors**: Always catch errors and return `status: 'down'` with error message
- **Blocking operations**: Long-running checks delay other modules; use timeouts
- **Memory leaks**: Don't store large datasets in metrics; trim details to essentials
- **Threshold not firing**: Check that your metric name matches the pattern in `evaluateAlerts`

## Example: Adding a CDN Health Check

```typescript
// src/lib/health/modules/cdn.ts
import fetch from 'node-fetch';

export async function checkCdnHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: HealthStatus = 'healthy';
  const cdnUrls = [
    'https://cdn1.example.com/health',
    'https://cdn2.example.com/health',
  ];

  for (const url of cdnUrls) {
    try {
      const start = Date.now();
      const res = await fetch(url, { method: 'HEAD', timeout: 3000 });
      const latency = Date.now() - start;

      metrics.push({
        timestamp: new Date(),
        module: 'cdns',
        metric: `latency_${url.hostname}`.replace(/\./g, '_'),
        value: latency,
        unit: 'ms',
        status: latency > 2000 ? 'down' : latency > 1000 ? 'degraded' : 'healthy',
        details: { url, status: res.status },
        tags: { service: 'cdn' },
      });
    } catch (err: any) {
      metrics.push({
        timestamp: new Date(),
        module: 'cdns',
        metric: `error_${url.hostname}`.replace(/\./g, '_'),
        value: 1,
        unit: 'status',
        status: 'down',
        details: { error: err.message },
      });
      status = 'down';
    }
  }

  return {
    module: 'cdns',
    status,
    timestamp: new Date(),
    metrics,
    summary: status === 'healthy' ? 'All CDNs reachable' : 'Some CDNs failing',
  };
}
```

Then add `'cdns'` to `HealthModule` type, register in collector, and optionally add to `MODULE_ICOS` in dashboard.

## Performance Tips

- **Batch DB queries**: If checking multiple things, combine into one query
- **Cache results**: Within a single collector run, don't repeat identical queries
- **Use connection pool**: DB queries should use existing pool (Drizzle handles this)
- **Parallelize**: The collector already runs all modules in parallel with `Promise.allSettled`
- **Limit history queries**: When fetching history for charts, always use time range filter

## Security

- Health endpoints are admin-only (BetterAuth)
- No sensitive data in metric details (avoid PII)
- Alert messages should not leak internal IPs or credentials
- Sanitize any user-controllable input if used in queries

## Production Deployment

1. Ensure all required API keys are set in `.env.production`
2. Set reasonable thresholds for production load
3. Configure alert channels with dedicated monitoring email/chat
4. Set up Inngest function to run on schedule (dev and prod)
5. Verify database indexes exist for `health_metrics(timestamp, module)`
6. Consider enabling alert deduplication and quiet hours if needed

## Support

For issues, check:
- Inngest function logs (failed runs)
- `/api/health/status` endpoint output
- Database `health_metrics` for recent entries
- Server logs for uncaught errors
