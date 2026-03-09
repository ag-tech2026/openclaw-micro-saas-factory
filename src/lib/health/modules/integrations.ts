import { env } from '@/lib/config';
import { HealthCheckResult, IntegrationHealth, HealthMetric } from '../types';

/**
 * External Service Health Check Module
 *
 * Pings external integrations and measures latency:
 * - OpenRouter (AI API)
 * - Resend (Email API)
 * - Polar (Payment API)
 * - Stripe (Payment API)
 */
export async function checkIntegrationsHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'All integrations reachable';
  let error: string | undefined;

  const checks = [
    {
      name: 'openrouter' as const,
      enabled: !!env.OPENROUTER_API_KEY,
      check: async (): Promise<{ latencyMs: number; reachable: boolean; error?: string }> => {
        try {
          const start = Date.now();
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            },
            signal: AbortSignal.timeout(5000),
          });
          const latency = Date.now() - start;
          return {
            latencyMs: latency,
            reachable: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          };
        } catch (err: any) {
          return {
            latencyMs: 0,
            reachable: false,
            error: err.message || 'Network error',
          };
        }
      },
    },
    {
      name: 'resend' as const,
      enabled: !!env.RESEND_API_KEY,
      check: async (): Promise<{ latencyMs: number; reachable: boolean; error?: string }> => {
        try {
          const start = Date.now();
          const response = await fetch('https://api.resend.com/emails', {
            method: 'GET', // Resend API GET /emails lists (requires auth)
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            },
            signal: AbortSignal.timeout(5000),
          });
          const latency = Date.now() - start;
          // 200-299 is success, but 401/403 means auth works but insufficient perms
          return {
            latencyMs: latency,
            reachable: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          };
        } catch (err: any) {
          return {
            latencyMs: 0,
            reachable: false,
            error: err.message || 'Network error',
          };
        }
      },
    },
    {
      name: 'polar' as const,
      enabled: !!env.POLAR_CLIENT_ID && !!env.POLAR_CLIENT_SECRET,
      check: async (): Promise<{ latencyMs: number; reachable: boolean; error?: string }> => {
        try {
          // Polar API: get current organization/me endpoint
          const start = Date.now();
          // Need OAuth token - but for health check we can check API root
          const response = await fetch('https://api.polar.sh/api/v1/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${env.POLAR_CLIENT_SECRET}`, // Using client secret as basic auth
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          });
          const latency = Date.now() - start;
          return {
            latencyMs: latency,
            reachable: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          };
        } catch (err: any) {
          return {
            latencyMs: 0,
            reachable: false,
            error: err.message || 'Network error',
          };
        }
      },
    },
    {
      name: 'stripe' as const,
      enabled: !!env.STRIPE_SECRET_KEY,
      check: async (): Promise<{ latencyMs: number; reachable: boolean; error?: string }> => {
        try {
          const start = Date.now();
          const response = await fetch('https://api.stripe.com/v1/account', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            },
            signal: AbortSignal.timeout(5000),
          });
          const latency = Date.now() - start;
          return {
            latencyMs: latency,
            reachable: response.ok,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          };
        } catch (err: any) {
          return {
            latencyMs: 0,
            reachable: false,
            error: err.message || 'Network error',
          };
        }
      },
    },
  ];

  const results: Array<{ name: string; result: ReturnType<typeof checks[0]['check']> }> = [];

  // Run all checks in parallel
  const promises = checks
    .filter(c => c.enabled)
    .map(async (checkDef) => {
      const result = await checkDef.check();
      return { name: checkDef.name, result };
    });

  const completed = await Promise.allSettled(promises);

  completed.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      const checkDef = checks[idx];
      results.push({
        name: checkDef.name,
        result: {
          latencyMs: 0,
          reachable: false,
          error: result.reason?.message || 'Unknown error',
        },
      });
    }
  });

  // Process results into metrics
  for (const { name, result } of results) {
    metrics.push({
      timestamp: new Date(),
      module: 'integrations',
      metric: `${name}_latency_ms`,
      value: result.latencyMs,
      unit: 'ms',
      status: result.latencyMs > 5000 || !result.reachable ? 'down' :
              result.latencyMs > 2000 ? 'degraded' : 'healthy',
      details: { reachable: result.reachable, error: result.error },
      tags: { service: name },
    });

    if (!result.reachable) {
      status = 'down';
      error = `${name} unreachable: ${result.error}`;
    } else if (result.latencyMs > 2000 && status !== 'down') {
      status = 'degraded';
      summary = 'Some integrations are slow';
    }
  }

  if (status === 'healthy') {
    summary = `All ${results.length} integrations healthy`;
  } else if (status === 'degraded') {
    summary = 'Some integrations degraded';
  }

  return {
    module: 'integrations',
    status,
    timestamp: new Date(),
    metrics,
    summary,
    error,
  };
}
