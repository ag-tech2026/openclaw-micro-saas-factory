import { env } from '@/lib/config';

/**
 * Health check threshold configuration
 * Values are loaded from environment variables with sensible defaults
 */
export const HEALTH_THRESHOLDS = {
  // Database: max acceptable query latency in milliseconds
  dbLatencyMs: env.HEALTH_ALERT_DB_LATENCY_MS,

  // API: max acceptable response time in milliseconds
  apiResponseTimeMs: env.HEALTH_ALERT_RESPONSE_TIME_MS,

  // System: CPU usage percentage
  cpuPct: env.HEALTH_ALERT_CPU_PCT,

  // System: Disk usage percentage
  diskPct: env.HEALTH_ALERT_DISK_PCT,

  // Business: MRR drop percentage (alert if drop exceeds this)
  mrrDropPct: env.HEALTH_ALERT_MRR_DROP_PCT,

  // Error rates: percentage (0-100)
  errorRatePct: env.HEALTH_ALERT_ERROR_RATE_PCT,

  // Inngest: queue depth threshold
  queueDepth: env.HEALTH_ALERT_QUEUE_DEPTH,

  // Alerting: number of consecutive degraded/down checks before sending alert
  consecutiveChecks: env.HEALTH_ALERT_CONSECUTIVE_CHECKS,
} as const;

/**
 * Determine health status based on value and thresholds
 */
export function getStatus(
  value: number,
  metric: keyof typeof HEALTH_THRESHOLDS,
  lowerIsBetter: boolean = true
): 'healthy' | 'degraded' | 'down' {
  const threshold = HEALTH_THRESHOLDS[metric];

  if (value === undefined || value === null || isNaN(value)) {
    return 'down';
  }

  if (lowerIsBetter) {
    if (value <= threshold * 0.5) return 'healthy';
    if (value <= threshold) return 'degraded';
    return 'down';
  } else {
    // For metrics where higher is better (e.g., hit rate)
    if (value >= threshold) return 'healthy';
    if (value >= threshold * 0.5) return 'degraded';
    return 'down';
  }
}

/**
 * Check if a numeric value exceeds the critical threshold
 */
export function isDegrading(
  value: number,
  metric: keyof typeof HEALTH_THRESHOLDS,
  lowerIsBetter: boolean = true
): boolean {
  const status = getStatus(value, metric, lowerIsBetter);
  return status === 'degraded' || status === 'down';
}

/**
 * Check if value is in down state
 */
export function isDown(
  value: number,
  metric: keyof typeof HEALTH_THRESHOLDS,
  lowerIsBetter: boolean = true
): boolean {
  return getStatus(value, metric, lowerIsBetter) === 'down';
}
