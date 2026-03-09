# Alert Threshold Tuning Guide

This guide helps you calibrate health alert thresholds for your production environment.

## Understanding Thresholds

Each module has metrics that are compared against thresholds. When a metric exceeds its threshold, the status becomes `degraded` or `down`, which can trigger alerts.

## Default Thresholds

These defaults are a starting point for a typical micro-SaaS. Adjust based on your actual traffic, infrastructure, and tolerance.

| Metric | Default Threshold | Status | Notes |
|--------|-------------------|--------|-------|
| Database latency | 200ms | degraded | High DB latency impacts all operations |
| Database latency | 2000ms | down | Critical - likely connection pool exhaustion |
| API response time | 1000ms | degraded | Users notice slow responses |
| API response time | 3000ms | down | Timeout territory |
| API success rate | <95% | degraded | More than 5% errors |
| API success rate | <50% | down | Half of requests failing |
| CPU usage | 80% | degraded | Sustained high CPU affects performance |
| CPU usage | 90% | down | Approaching saturation |
| Disk usage | 90% | degraded | Running out of space soon |
| Disk usage | 95% | down | Critical - could crash |
| Queue depth | 500 | degraded | Jobs backing up |
| Queue depth | 1000 | down | Severe backlog |
| Errors (Sentry) | 100/24h | degraded | Spike in errors |
| Errors (Sentry) | 1000/24h | down | Outage-level error volume |
| MRR drop | 10% | degraded | Significant revenue loss |

## How to Tune

### 1. Observe Baseline

Let the system run for 1-2 weeks without alerts (set thresholds very high temporarily). Collect data:

```sql
-- Find typical ranges for key metrics
SELECT
  module,
  metric,
  avg(value) as avg_value,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY value) as p95,
  max(value) as max_value,
  count(*) as count
FROM health_metrics
WHERE timestamp > NOW() - INTERVAL '14 days'
GROUP BY module, metric
ORDER BY module, metric;
```

Look at:
- Average values
- 95th percentile (p95) - what's the typical max?
- Absolute maximums (ignore obvious outliers)

### 2. Set Warning Thresholds

Set degraded threshold around the 95th-99th percentile. This triggers when you're entering unusual territory.

Example: If CPU load typically ranges 10-40%, with occasional spikes to 60%, set degraded at 70-80% and down at 85-90%.

### 3. Set Critical Thresholds

Down thresholds should indicate immediate action needed. They should be above normal operational maximums but still allow some buffer before complete failure.

For timeouts (API, DB): 3000ms is often good because it's above typical user timeout expectations.

### 4. Account for Maintenance

If you're doing planned maintenance, enable maintenance mode to suppress alerts. The health collector will skip checks (configurable).

### 5. Evaluate False Positives

If you get alert spam, raise the threshold slightly or increase `HEALTH_ALERT_CONSECUTIVE_CHECKS` to require multiple consecutive degraded readings before alerting:

```bash
HEALTH_ALERT_CONSECUTIVE_CHECKS=3  # Require 3 bad readings (15 min at 5-min intervals)
```

### 6. Consider Business Impact

- **High-traffic app**: Lower thresholds for API latency (500ms degradation, 2000ms down)
- **Batch processing**: Queues can be deeper; check job SLA times
- **Startups**: Might tolerate more downtime → higher thresholds initially
- **Enterprise clients**: Lower thresholds, faster response expectations

### 7. Use Histogram Data

In your dashboard, view metric history charts to see the distribution. Identify where "normal" ends and "abnormal" begins.

## Module-Specific Guidance

### Database

- Latency should be <50ms ideally on same region
- If >100ms regularly, investigate slow queries or connection pool sizing
- Connection count: monitor for leaks (active connections steadily increasing)
- Replication lag: should be <1s for primary-replica setups

### API

- Response time: P95 should be <300ms for good UX
- Success rate: Should be >99.9% (0.1% errors)
- If any endpoint consistently slow, optimize or add caching

### Ingest/Queue

- Success rate should be >99%
- Average duration depends on job type (set acceptable range based on job SLA)
- Queue depth should trend toward zero during normal operation
- Persistent backlog indicates need for more workers

### System

- CPU > 80% sustained → need larger instance or optimization
- Memory > 85% → risk of OOM kills
- Disk > 90% → start cleanup, ensure monitoring

### Business

- MRR drop >5% in a day or 10% in a week warrants investigation
- Churn rate >2% monthly is high for SaaS
- Dunning customers >5% of active → payment issues

### Integrations

- All external APIs should respond <2000ms
- 5xx errors → alert immediately
- 4xx errors may indicate config issues (still alert)

## Alert Channels

Choose appropriate severity mapping:

- **Telegram/Slack**: Both warning and critical
- **Email**: Only critical to avoid noise
- **PagerDuty/Opsgenie**: Only critical (if integrated)

## Maintenance Mode

When performing deployments, database migrations, or infrastructure work:

```bash
curl -X POST https://yourapp.com/api/health/actions/toggle-maintenance \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Deploying v2.1"}'
```

This:
- Disables alert evaluation
- Can show a banner on your site (implement separately)
- Logs the action to audit trail

Remember to re-enable after maintenance.

## Silence Alerts Temporarily

If there's a known issue you're working on and don't want alert spam, you can:

1. **Resolve alerts** in UI (mark as resolved) - they won't re-alert on same condition if persisted
2. **Higher thresholds** - temporarily increase threshold above current issue level
3. **Disable channels** - remove webhook token temporarily (not recommended)

Better: Use maintenance mode.

## Alert Fatigue Prevention

- **Escalation delays**: Use `HEALTH_ALERT_CONSECUTIVE_CHECKS=2` to require 2 bad readings (10 min) before alerting
- **Snooze**: Implement a cooldown period after sending an alert for a specific metric (not yet implemented)
- **Group**: Similar alerts on same module could be combined (future feature)

## Monitoring the Monitor

Ensure the health collector itself is running:

- Check Inngest dashboard for `health-collector` successful runs
- Verify `health_metrics` table is receiving new rows (last entry < 10 min old)
- Watch for `health_collector` errors in Sentry
- The `/api/health` endpoint (simple) should always return quickly

If the collector fails repeatedly, alerts will stop. Consider a separate watchdog (cron job) to ping `/api/health/status` and notify if stale.

## Advanced: Custom Thresholds per Environment

Use different thresholds in staging vs production:

```typescript
// src/lib/health/thresholds.ts
const baseMultiplier = env.NODE_ENV === 'production' ? 1.0 : 1.5; // Staging allows more slack

export const HEALTH_THRESHOLDS = {
  dbLatencyMs: Math.round(env.HEALTH_ALERT_DB_LATENCY_MS * baseMultiplier),
  // ...
} as const;
```

Or maintain separate `.env.production` and `.env.staging` files.

## Advanced: Dynamic Thresholds

Instead of static thresholds, compute based on rolling baseline:

```typescript
const recentAvg = await getAverageLatency('5m');
const threshold = recentAvg * 2; // Alert if 2x normal
```

This requires storing baseline metrics and is more complex but adapts to traffic patterns.

## Evaluation Checklist

- [ ] Thresholds set for all critical metrics
- [ ] Alert channels tested (send test message)
- [ ] Inngest schedule confirmed active
- [ ] Database indexes in place for health_metrics queries
- [ ] Admin user can access /admin/health
- [ ] Maintenance mode toggle tested
- [ ] Audit log recording actions
- [ ] Retry logic for failed alert delivery (could be added)

## Common Adjustments

| Symptom | Likely Fix |
|---------|------------|
| Too many false alerts during traffic spikes | Increase threshold or add consecutive checks requirement |
| Missed actual incidents | Lower thresholds or investigate why metric didn't spike |
| Alerts after deployments | Ensure maintenance mode is enabled during deployments |
| Alert spam from flaky integration | Add circuit breaker pattern or increase threshold for that module |
| Charts showing gaps | Collector failed - check Inngest logs |
| High CPU alerts during backup | Temporarily raise threshold or schedule backups during low traffic |

## Review Cadence

Revisit thresholds monthly:
- Check alert history: were alerts valid?
- Review false positives/negatives
- Adjust as app scales (more traffic → higher absolute metrics, but relative thresholds often still apply)

## Support

For questions, consult:
- `/data/workspace/HEALTH_DASHBOARD.md` - Full documentation
- `/data/workspace/HEALTH_CHECKS_DEV_GUIDE.md` - Developer guide
- Inngest dashboard for function logs
- Database queries on `health_metrics`
