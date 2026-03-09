# Health Monitoring Dashboard

Comprehensive monitoring system for OpenClaw micro-SaaS factory with real-time metrics, alerts, and admin actions.

## Features

- **Real-time Health Checks**: Continuous monitoring of all critical systems
- **Time-series Data**: Store and visualize metrics over time (90-day retention)
- **Configurable Alerts**: Threshold-based alerts via Telegram, Email, or Slack
- **Admin Dashboard**: Interactive UI with charts, status grid, and quick actions
- **Admin Actions**: Restart gateway, clear caches, toggle maintenance mode
- **Audit Logging**: Complete audit trail of all admin actions

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Inngest       │────▶│  Health          │────▶│   Database      │
│   Scheduler     │     │  Collector       │     │   (metrics)     │
│   (every 5 min) │     │  (modules)       │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                          │
         │                       ▼                          │
         │              ┌─────────────────┐                │
         │              │   Alert         │───────────────┘
         │              │   Evaluator     │
         │              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Admin API     │◀────▶│   Alert        │
│   (protected)   │     │   Dispatcher   │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Dashboard     │
│   UI            │
│   (/admin/health)│
└─────────────────┘
```

## Health Check Modules

### 1. System (`system`)
- **Uptime**: Server uptime in hours
- **CPU Load**: CPU usage percentage (threshold: 80% degraded, 90% down)
- **Memory**: RAM usage percentage
- **Disk**: Filesystem disk usage percentage
- **Gateway**: OpenClaw gateway status (via `openclaw gateway status`)

### 2. Database (`database`)
- **Connection Latency**: Time for `SELECT 1` query (threshold: 200ms degraded, 2000ms down)
- **Pool Stats**: Active, idle, total connections
- **Replication Lag**: For read replicas (if configured)

### 3. API (`api`)
Probes critical endpoints:
- `/` - Homepage
- `/api/health` - Health endpoint
- `/api/analyze` - AI analysis endpoint
- `/api/admin/customers` - Admin customers API
- `/api/admin/analytics` - Admin analytics API

Metrics:
- Response time per endpoint
- Success rate (threshold: <95% degraded, <50% down)
- Average response time (threshold: 1000ms degraded, 3000ms down)

### 4. Ingest (`ingest`)
- **Jobs Processed**: Number of jobs completed in last 24h
- **Success Rate**: Job completion success rate (threshold: <80% down, <90% degraded)
- **Avg Duration**: Average job processing time
- **Queue Depth**: Pending jobs count (threshold: 500 degraded, 1000 down)
- **Error Types**: Top job failure types

### 5. Sentry (`sentry`)
- **Errors (24h)**: Total error count (threshold: 100 degraded, 1000 down)
- **Error Rate**: Errors per minute
- **Top Issues**: Most frequent error types

Requires `SENTRY_DSN` and `SENTRY_AUTH_TOKEN`.

### 6. Business (`business`)
- **MRR**: Monthly Recurring Revenue (USD)
- **Active Subscriptions**: Count of active subscriptions
- **New Signups**: 7-day and 30-day counts
- **Churn Rate**: 7-day churn percentage
- **Dunning Customers**: Count of customers in dunning

### 7. Integrations (`integrations`)
Pings external services and measures latency:
- **OpenRouter**: AI API
- **Resend**: Email API
- **Polar**: Payment/subscription API
- **Stripe**: Payment API (if configured)

## Configuration

### Environment Variables

#### Alert Thresholds
```bash
# Database
HEALTH_ALERT_DB_LATENCY_MS=200              # ms

# API
HEALTH_ALERT_RESPONSE_TIME_MS=1000          # ms
HEALTH_ALERT_ERROR_RATE_PCT=5               # %

# System
HEALTH_ALERT_CPU_PCT=80                     # %
HEALTH_ALERT_DISK_PCT=90                    # %

# Business
HEALTH_ALERT_MRR_DROP_PCT=10                # %

# Queue
HEALTH_ALERT_QUEUE_DEPTH=1000               # count

# Alert evaluation
HEALTH_ALERT_CONSECUTIVE_CHECKS=2           # number of consecutive degraded states before alerting
HEALTH_COLLECTOR_INTERVAL_MIN=5             # minutes
```

#### Alert Channels
```bash
# Telegram
HEALTH_ALERT_TELEGRAM_BOT_TOKEN=your_bot_token
HEALTH_ALERT_TELEGRAM_CHAT_ID=your_chat_id

# Email (via Resend)
HEALTH_ALERT_EMAIL_TO=alerts@yourcompany.com
RESEND_API_KEY=re_xxx
EMAIL_FROM=Health Monitor <monitor@yourdomain.com>

# Slack
HEALTH_ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

### Database

The following tables are created automatically via migrations:

- `health_metrics`: Time-series metric data (indexed on timestamp and module)
- `health_alerts`: Alert history with deduplication
- `health_audit_log`: Audit log for admin actions
- `maintenance_mode`: Singleton row for maintenance state

Retention: 90 days for raw metrics. A background job can be added to aggregate and prune old data.

## API Endpoints

All admin health endpoints require authentication as an admin user (BetterAuth with admin role). Some endpoints also require 2FA verification.

### GET `/api/health/status`

Returns comprehensive health status for all modules.

**Response:**
```json
{
  "overall": "healthy",
  "timestamp": "2025-03-09T04:30:00.000Z",
  "checks": {
    "system": {
      "module": "system",
      "status": "healthy",
      "timestamp": "2025-03-09T04:30:00.000Z",
      "metrics": [...],
      "summary": "All system resources healthy"
    },
    ...
  },
  "summary": {
    "healthy": 6,
    "degraded": 0,
    "down": 1
  }
}
```

Query parameters:
- `force=true` - Run fresh checks (skip caching)

### GET `/api/health/history`

Returns time-series data for charts.

**Query parameters:**
- `metric` (required): Metric name (e.g., `cpu_load_pct`, `mrr_usd`)
- `module` (optional): Module filter (e.g., `system`)
- `range` (optional): `1h`, `6h`, `24h` (default), `7d`, `30d`

**Response:**
```json
{
  "metric": "cpu_load_pct",
  "module": "system",
  "range": "24h",
  "data": [
    { "timestamp": "2025-03-08T04:30:00.000Z", "value": 45.2, "status": "healthy" },
    ...
  ]
}
```

### GET `/api/health/checks/:module`

Runs a specific health check on demand.

**Response:** Same as individual check result.

Example:
```bash
curl -H "Cookie: better-auth.session=<token>" \
  https://yourapp.com/api/health/checks/system
```

### POST `/api/health/actions/:action`

Triggers admin actions.

**Supported actions:**

#### `restart-gateway`
Restarts the OpenClaw gateway service.

```json
{}
```

#### `clear-cache`
Clears Redis cache. Requires confirmation for full flush.

```json
{
  "confirm": "FLUSH_ALL_CACHE"
}
```

#### `trigger-check`
Runs a manual health check immediately via Inngest.

```json
{}
```

#### `toggle-maintenance`
Enables or disables maintenance mode.

```json
{
  "enabled": true,
  "reason": "Scheduled maintenance"
}
```

#### `resolve-alert`
Marks an alert as resolved.

```json
{
  "alertId": "alert-uuid"
}
```

### GET `/api/health/alerts`

Lists recent health alerts.

**Query parameters:**
- `resolved=true|false` - Filter by resolution status
- `limit=20` - Max results (default 50, max 100)

**Response:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "createdAt": "...",
      "module": "database",
      "metric": "connection_latency_ms",
      "severity": "critical",
      "threshold": 200,
      "observedValue": 3500,
      "message": "Database latency is 3500ms, threshold is 200ms",
      "resolved": false
    }
  ],
  "total": 1
}
```

### PATCH `/api/health/alerts`

Bulk update alerts.

```json
{
  "alertIds": ["uuid1", "uuid2"],
  "resolved": true
}
```

## Dashboard UI

Access at `/admin/health` (admin + 2FA required).

### Features

1. **Status Grid**
   - Overview cards for each health module
   - Color-coded status (OK/Warning/Down)
   - Click card to drill into metrics

2. **Charts**
   - Line chart (area) for metric history
   - Metric selector per module
   - 24-hour window by default

3. **Alerts Panel**
   - Most recent alerts
   - Inline acknowledgment
   - Show/hide resolved

4. **Quick Actions**
   - Restart Gateway (with confirmation)
   - Run Check Now (manual trigger)
   - Clear Cache (not fully implemented)
   - View Audit Log

5. **Business Metrics**
   - MRR display with formatting
   - Active subscriptions count
   - New signups (7d/30d)
   - Churn rate

6. **Real-time Updates**
   - Auto-refresh every 30 seconds
   - Manual refresh button
   - Updates timestamps

### Maintenance Mode

When maintenance mode is enabled:
- Health collector skips checks (optional, configurable)
- Frontend can show maintenance banner/page
- Admin can still access dashboard

## Alerting Logic

1. **Collection**: Every 5 minutes, Inngest runs `healthCollector`
2. **Evaluation**: For each metric, compare value to threshold
3. **Deduplication**: Same module+metric+threshold combo not re-alerted within 24h unless resolved
4. **Delivery**: Send to enabled channels (Telegram, Email, Slack)
5. **Logging**: All alerts stored in `health_alerts` table with delivery status
6. **Resolution**: Admin acknowledges via UI (PATCH /api/health/alerts)

### Severity Levels

- **warning**: Status is degraded but system still functional
- **critical**: Status is down or critical threshold breached

## Adding New Health Checks

1. Create a new module file in `src/lib/health/modules/`:

```typescript
export async function checkMyModuleHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: HealthStatus = 'healthy';
  let summary = '...';
  let error?: string;

  // Perform checks and push metrics

  return { module: 'my-module', status, timestamp: new Date(), metrics, summary, error };
}
```

2. Register in `src/lib/health/collector.ts`:
   - Add to `runAllChecks()` array
   - Add to `moduleChecks` in the on-demand endpoint

3. (Optional) Add alert thresholds to `src/lib/config.ts`

4. Add UI integration on dashboard:
   - Add MODULE_ICONS entry
   - The grid auto-discovers modules from `healthResponse.checks`

5. Write tests

## Testing

### Unit Tests

Test each health module individually:

```typescript
import { checkSystemHealth } from '@/lib/health/modules/system';

describe('System Health', () => {
  it('should return healthy status when resources good', async () => {
    const result = await checkSystemHealth();
    expect(result.status).toBe('healthy');
    expect(result.module).toBe('system');
    expect(result.metrics).toHaveLength(4);
  });
});
```

### Integration Tests

Test API endpoints:

```typescript
import { GET } from '@/app/api/health/status/route';

describe('Health Status API', () => {
  it('should require admin auth', async () => {
    const request = new Request('http://localhost/api/health/status');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

### Alert Condition Tests

Verify threshold evaluation:

```typescript
import { getStatus } from '@/lib/health/thresholds';

describe('Thresholds', () => {
  it('marks as down when value exceeds threshold', () => {
    expect(getStatus(300, 'dbLatencyMs')).toBe('down');
  });
  it('marks as degraded when slightly above threshold', () => {
    expect(getStatus(150, 'dbLatencyMs')).toBe('degraded');
  });
});
```

## Audit Logging

All admin actions on the health system are logged to `health_audit_log`:

- `action`: Action name (restart-gateway, clear-cache, etc.)
- `userId`: Admin user ID
- `resource`: Affected resource (e.g., `health:module:api`)
- `details`: JSON with parameters and result
- `ipAddress`, `userAgent`: Request context
- `success`, `errorMessage`: Outcome

## Security Considerations

- All health endpoints require admin role (BetterAuth)
- Sensitive actions (restart, cache clear) require confirmation
- Alert delivery channels are authenticated via their respective tokens
- Audit log provides non-repudiation
- CSRF protection on POST actions (via Next.js middleware)

## Maintenance

### Manual Trigger

```bash
# Use openclaw CLI to send Inngest event
curl -X POST https://yourapp.com/api/inngest \
  -H "Content-Type: application/json" \
  -d '{"name":"manual/health.check","data":{"userId":"admin-id"}}'
```

### View Metrics Directly

```sql
SELECT * FROM health_metrics
WHERE timestamp > NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC;
```

### Query Alerts

```sql
SELECT * FROM health_alerts
WHERE resolved = false
ORDER BY created_at DESC;
```

### Clear Old Metrics (90+ days)

```sql
DELETE FROM health_metrics
WHERE timestamp < NOW() - INTERVAL '90 days';
-- Consider using partitioning for performance
```

## Development

### Local Setup

1. Ensure environment variables are set in `.env.local`
2. Run database migrations: `npm run db:migrate`
3. Start dev server: `npm run dev`
4. Navigate to `/admin/health` (login as admin)

### Testing Alerts Locally

Temporarily lower thresholds to trigger alerts:

```env
HEALTH_ALERT_CPU_PCT=1
HEALTH_ALERT_DB_LATENCY_MS=1
```

Then refresh dashboard or wait for next collector run.

### Disable Alerts in Development

```env
HEALTH_ALERT_TELEGRAM_BOT_TOKEN=
HEALTH_ALERT_EMAIL_TO=
HEALTH_ALERT_SLACK_WEBHOOK=
```

Collector will still run and log, but won't send notifications.

## Troubleshooting

### Health collector not running

Check Inngest dashboard to verify scheduled function is enabled:
- Go to Inngest app → Functions → `health-collector`
- Ensure schedule `*/5 * * * *` is active

### No data in charts

- Verify `health_metrics` table exists and has rows
- Check collector logs for errors
- Ensure admin user viewing dashboard has proper role

### Alerts not sending

- Verify channel configuration (token, chat ID, webhook)
- Check `healthAlerts` table for `channelsSent` field
- Look for errors in server logs

### Gateway restart fails

- Ensure `openclaw` CLI is in PATH on server
- Check that current user has permission to run `openclaw gateway restart`
- Consider using sudo if needed (update action endpoint)

## Performance Notes

- Each health check run sends ~20-50 metric rows to database
- 5-minute interval = ~240-600 rows/hour, ~6k/day
- Indexes on `(timestamp, module)` ensure fast queries
- Retention policy (90 days) keeps table size manageable
- For long-term storage, aggregate hourly/daily averages

## Future Enhancements

- [ ] Grafana/Prometheus integration
- [ ] Anomaly detection (ML-based)
- [ ] Multi-region health checks
- [ ] SLA/SLO tracking
- [ ] PagerDuty/Opsgenie integration
- [ ] Health score calculation
- [ ] Root cause analysis suggestions
