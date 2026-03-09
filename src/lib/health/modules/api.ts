import { HealthCheckResult, ApiEndpointHealth, HealthMetric } from '../types';

/**
 * Define critical endpoints to probe
 */
const CRITICAL_ENDPOINTS = [
  { path: '/', method: 'GET', name: 'homepage' },
  { path: '/api/health', method: 'GET', name: 'health' },
  { path: '/api/analyze', method: 'POST', name: 'analyze' }, // Might need test payload
  { path: '/api/admin/customers', method: 'GET', name: 'admin-customers' },
  { path: '/api/admin/analytics', method: 'GET', name: 'admin-analytics' },
];

/**
 * Probe a single endpoint
 */
async function probeEndpoint(
  baseUrl: string,
  endpoint: typeof CRITICAL_ENDPOINTS[0],
  timeout: number = 5000
): Promise<ApiEndpointHealth> {
  const url = baseUrl + endpoint.path;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
      // For POST /api/analyze, send a minimal test payload if needed
      body: endpoint.method === 'POST' && endpoint.path === '/api/analyze'
        ? JSON.stringify({ imageUrl: 'https://example.com/test.jpg' })
        : null,
      signal: controller.signal as any,
      next: { revalidate: 0 }, // Skip cache
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    return {
      endpoint: endpoint.path,
      status: response.status,
      responseTimeMs,
      success: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;
    return {
      endpoint: endpoint.path,
      status: 0,
      responseTimeMs,
      success: false,
      error: err.message || 'Network error',
    };
  }
}

/**
 * API Health Check Module
 *
 * Probes key endpoints and measures:
 * - Response time per endpoint
 * - HTTP status codes
 * - Success/error rates
 */
export async function checkApiHealth(baseUrl?: string): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'All APIs responding';
  let error: string | undefined;

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const endpointResults: ApiEndpointHealth[] = [];

    // Probe all endpoints in parallel
    const probes = CRITICAL_ENDPOINTS.map(ep =>
      probeEndpoint(appUrl, ep).then(res => {
        endpointResults.push(res);
        return res;
      })
    );

    await Promise.all(probes);

    // Add metrics for each endpoint
    for (const result of endpointResults) {
      metrics.push({
        timestamp: new Date(),
        module: 'api',
        metric: `response_time_${result.endpoint.replace(/\//g, '_')}`,
        value: result.responseTimeMs,
        unit: 'ms',
        status: result.responseTimeMs > 3000 ? 'down' :
                result.responseTimeMs > 1000 ? 'degraded' : 'healthy',
        details: {
          status: result.status,
          success: result.success,
          error: result.error,
        },
        tags: { endpoint: result.endpoint, method: CRITICAL_ENDPOINTS.find(e => e.path === result.endpoint)?.method || 'GET' },
      });
    }

    // Calculate overall success rate
    const successCount = endpointResults.filter(r => r.success).length;
    const totalCount = endpointResults.length;
    const successRate = totalCount > 0 ? successCount / totalCount : 0;

    metrics.push({
      timestamp: new Date(),
      module: 'api',
      metric: 'success_rate',
      value: successRate * 100, // percentage
      unit: 'pct',
      status: successRate < 0.5 ? 'down' :
              successRate < 0.95 ? 'degraded' : 'healthy',
      details: {
        successful: successCount,
        failed: totalCount - successCount,
        total: totalCount,
      },
      tags: { aggregation: 'all' },
    });

    // Calculate average response time
    const avgResponseTime = endpointResults.reduce((sum, r) => sum + r.responseTimeMs, 0) / totalCount;
    metrics.push({
      timestamp: new Date(),
      module: 'api',
      metric: 'avg_response_time_ms',
      value: avgResponseTime,
      unit: 'ms',
      status: avgResponseTime > 2000 ? 'down' :
              avgResponseTime > 1000 ? 'degraded' : 'healthy',
      details: { endpoints: totalCount },
      tags: { aggregation: 'average' },
    });

    // Determine overall status
    const anyDown = endpointResults.some(r => !r.success) || avgResponseTime > 2000 || successRate < 0.5;
    const anyDegraded = endpointResults.some(r => r.responseTimeMs > 1000) || successRate < 0.95;

    if (anyDown) {
      status = 'down';
      summary = 'One or more APIs are failing';
      error = `${totalCount - successCount} endpoints failing`;
    } else if (anyDegraded) {
      status = 'degraded';
      summary = 'Some APIs are slow or failing';
    } else {
      summary = `All ${totalCount} endpoints healthy (avg ${Math.round(avgResponseTime)}ms)`;
    }

  } catch (err: any) {
    console.error('API health check error:', err);
    status = 'down';
    error = err.message || 'API health check failed';
    summary = 'API health check unreachable';
  }

  return {
    module: 'api',
    status,
    timestamp: new Date(),
    metrics,
    summary,
    error,
  };
}
