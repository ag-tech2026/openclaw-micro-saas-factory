import { db } from '@/db';
import { healthAlerts as healthAlertsTable, maintenanceMode as maintenanceModeTable } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { env } from '@/lib/config';
import { HealthCheckResult, HealthAlert } from './types';
import { HEALTH_THRESHOLDS, isDegrading } from './thresholds';

/**
 * Generate a deduplication key for an alert condition
 */
export function generateDedupeKey(module: string, metric: string, threshold: number): string {
  return `${module}:${metric}:${Math.round(threshold)}`;
}

/**
 * Send alert via configured channels
 */
async function sendAlert(alert: HealthAlert): Promise<Record<string, boolean>> {
  const channelsSent: Record<string, boolean> = {};

  // Telegram
  if (env.HEALTH_ALERT_TELEGRAM_BOT_TOKEN && env.HEALTH_ALERT_TELEGRAM_CHAT_ID) {
    try {
      const message = `🚨 *Health Alert: ${alert.module.toUpperCase()} - ${alert.metric}*\n\n` +
        `*Severity:* ${alert.severity}\n` +
        `*Threshold:* ${alert.threshold}\n` +
        `*Observed:* ${alert.observedValue}\n` +
        `*Message:* ${alert.message}\n` +
        `*Time:* ${new Date(alert.createdAt).toISOString()}\n` +
        `[View Dashboard](${env.NEXT_PUBLIC_APP_URL}/admin/health)`;

      await fetch(`https://api.telegram.org/bot${env.HEALTH_ALERT_TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.HEALTH_ALERT_TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
      channelsSent.telegram = true;
    } catch (err) {
      console.error('Failed to send Telegram alert:', err);
      channelsSent.telegram = false;
    }
  }

  // Email (Resend)
  if (env.HEALTH_ALERT_EMAIL_TO && env.RESEND_API_KEY) {
    try {
      const subject = `[${alert.severity.toUpperCase()}] Health Alert: ${alert.module} - ${alert.metric}`;
      const html = `
        <h1>Health Alert: ${alert.module.toUpperCase()}</h1>
        <p><strong>Metric:</strong> ${alert.metric}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Threshold:</strong> ${alert.threshold}</p>
        <p><strong>Observed Value:</strong> ${alert.observedValue}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Time:</strong> ${new Date(alert.createdAt).toISOString()}</p>
        <p><a href="${env.NEXT_PUBLIC_APP_URL}/admin/health">View Dashboard</a></p>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || 'alerts@yourdomain.com',
          to: env.HEALTH_ALERT_EMAIL_TO,
          subject,
          html,
        }),
      });
      channelsSent.email = true;
    } catch (err) {
      console.error('Failed to send email alert:', err);
      channelsSent.email = false;
    }
  }

  // Slack Webhook
  if (env.HEALTH_ALERT_SLACK_WEBHOOK) {
    try {
      const color = alert.severity === 'critical' ? 'danger' : 'warning';
      const payload = {
        attachments: [
          {
            color,
            fields: [
              { title: 'Module', value: alert.module, short: true },
              { title: 'Metric', value: alert.metric, short: true },
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Threshold', value: String(alert.threshold), short: true },
              { title: 'Observed', value: String(alert.observedValue), short: true },
              { title: 'Time', value: new Date(alert.createdAt).toISOString(), short: false },
            ],
            text: alert.message,
            fallback: `Health Alert: ${alert.module} - ${alert.metric}`,
          },
        ],
      };

      await fetch(env.HEALTH_ALERT_SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      channelsSent.slack = true;
    } catch (err) {
      console.error('Failed to send Slack alert:', err);
      channelsSent.slack = false;
    }
  }

  return channelsSent;
}

/**
 * Evaluate health metrics and generate alerts if thresholds are breached
 */
export async function evaluateAlerts(response: HealthCheckResult): Promise<void> {
  if (!response || response.status === 'healthy') {
    return; // No alerts for healthy state
  }

  const alertsToCreate: HealthAlert[] = [];

  for (const metric of response.metrics) {
    // Determine which threshold applies based on metric name
    let thresholdMetric: keyof typeof HEALTH_THRESHOLDS | null = null;
    const lowerIsBetter = true;

    if (metric.metric.includes('latency') || metric.metric.includes('response_time')) {
      thresholdMetric = metric.module === 'database' ? 'dbLatencyMs' : 'apiResponseTimeMs';
    } else if (metric.metric.includes('cpu') || metric.metric.includes('disk_usage')) {
      thresholdMetric = metric.module === 'system' ? 'cpuPct' : 'diskPct';
    } else if (metric.metric.includes('queue_depth')) {
      thresholdMetric = 'queueDepth';
    } else if (metric.metric === 'mrr_usd' || metric.metric === 'mrr_cents') {
      // MRR drop detection needs historical data - handled separately
      continue;
    } else if (metric.metric === 'success_rate') {
      thresholdMetric = 'errorRatePct'; // Inverse: success rate < 100 - error% threshold
    }

    if (thresholdMetric && metric.value !== undefined) {
      const threshold = HEALTH_THRESHOLDS[thresholdMetric];
      let isAlertCondition = false;

      // For success_rate (metric is percentage), lower is worse
      if (metric.metric === 'success_rate') {
        if ((100 - metric.value) > HEALTH_THRESHOLDS.errorRatePct) {
          isAlertCondition = true;
        }
      } else if (isDegrading(metric.value, thresholdMetric, lowerIsBetter)) {
        isAlertCondition = true;
      }

      if (isAlertCondition) {
        const severity = metric.status === 'down' ? 'critical' : 'warning';
        const dedupeKey = generateDedupeKey(metric.module, metric.metric, threshold);

        alertsToCreate.push({
          id: '', // will be generated by DB
          createdAt: new Date(),
          module: metric.module,
          metric: metric.metric,
          severity: severity as 'warning' | 'critical',
          threshold,
          observedValue: metric.value,
          message: response.summary || `${metric.module} ${metric.metric} is ${metric.status}`,
          dedupeKey,
          resolved: false,
          metricId: metric.id,
        });
      }
    }
  }

  // Process alerts: check for recent alerts and dedupe, then send
  for (const alert of alertsToCreate) {
    try {
      // Check if there's an unresolved alert with same dedupeKey from within alert day
      const recentAlert = await db
        .select()
        .from(healthAlertsTable)
        .where(
          and(
            eq(healthAlertsTable.dedupeKey, alert.dedupeKey),
            eq(healthAlertsTable.resolved, false),
            gte(healthAlertsTable.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        )
        .limit(1);

      if (recentAlert.length > 0) {
        // Already have a recent unresolved alert - skip sending again
        console.log(`Alert deduped: ${alert.dedupeKey}`);
        continue;
      }

      // Insert alert into DB
      const [inserted] = await db
        .insert(healthAlertsTable)
        .values(alert)
        .returning({ id: healthAlertsTable.id });

      alert.id = inserted.id;

      // Attempt to send alert via configured channels
      const channelsSent = await sendAlert(alert);

      // Update alert with delivery info
      await db
        .update(healthAlertsTable)
        .set({
          channelsSent,
          deliveredAt: new Date(),
        })
        .where(eq(healthAlertsTable.id, alert.id));

      console.log(`Alert sent: ${alert.module} - ${alert.metric} via`, Object.keys(channelsSent).filter(k => channelsSent[k]));
    } catch (err) {
      console.error('Failed to process alert:', err);
    }
  }
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const [row] = await db
      .select()
      .from(maintenanceModeTable)
      .where(eq(maintenanceModeTable.id, 1))
      .limit(1);

    return row?.enabled || false;
  } catch {
    return false;
  }
}

/**
 * Enable or disable maintenance mode
 */
export async function setMaintenanceMode(
  enabled: boolean,
  reason?: string,
  userId?: string
): Promise<void> {
  const now = new Date();

  // Check if row exists, if not insert, else update
  const [existing] = await db
    .select()
    .from(maintenanceModeTable)
    .where(eq(maintenanceModeTable.id, 1))
    .limit(1);

  if (existing) {
    await db
      .update(maintenanceModeTable)
      .set({
        enabled,
        reason: reason || existing.reason,
        startedBy: enabled ? (existing.startedBy || userId) : userId,
        startedAt: enabled ? (existing.startedAt || now) : existing.startedAt,
        endedAt: !enabled ? now : undefined,
        endedBy: !enabled ? userId : undefined,
        updatedAt: now,
      })
      .where(eq(maintenanceModeTable.id, 1));
  } else {
    await db.insert(maintenanceModeTable).values({
      id: 1,
      enabled,
      reason,
      startedBy: enabled ? userId : undefined,
      startedAt: enabled ? now : undefined,
      endedAt: !enabled ? now : undefined,
      endedBy: !enabled ? userId : undefined,
    });
  }

  console.log(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by ${userId}`);
}

// Import needed for and()
import { and } from 'drizzle-orm/expressions';
