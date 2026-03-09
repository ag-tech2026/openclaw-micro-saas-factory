import { NextRequest, NextResponse } from 'next/server';
import { cacheMetrics, getRedisConnected } from '@/lib/redis';
import { env } from '@/lib/config';
import { withSWR } from '@/lib/cache';
import { getPoolMetrics, getCircuitBreakerStatus } from '@/lib/drizzle/db';

/**
 * Health check endpoint
 *
 * GET /api/health
 *
 * Returns system health status including Redis connection, cache metrics,
 * and database connection pool metrics.
 *
 * This endpoint is cached with SWR (stale-while-revalidate) for better performance.
 */
const handler = async (request: NextRequest) => {
  const now = new Date().toISOString();
  const uptime = process.uptime();

  // Collect Redis status
  const redisStatus = {
    connected: getRedisConnected(),
    cache: {
      hits: cacheMetrics.getHitCount(),
      freshHits: cacheMetrics.getFreshHitCount(),
      staleHits: cacheMetrics.getStaleHitCount(),
      misses: cacheMetrics.getMissCount(),
      errors: cacheMetrics.getErrorCount(),
      backgroundRefreshes: cacheMetrics.getBackgroundRefreshCount(),
      hitRate: parseFloat(cacheMetrics.getHitRate().toFixed(2)),
      staleHitRate: parseFloat(cacheMetrics.getStaleHitRate().toFixed(2)),
    },
  };

  // Collect database pool metrics (only if DATABASE_URL is set)
  let database: any = null;
  try {
    if (process.env.DATABASE_URL) {
      database = {
        pool: getPoolMetrics(),
        circuitBreaker: getCircuitBreakerStatus(),
      };
    }
  } catch (error) {
    // Database metrics collection should not break health check
    console.error('[Health] Database metrics error:', error);
  }

  const healthData = {
    status: 'ok',
    timestamp: now,
    uptime,
    environment: env.NODE_ENV,
    redis: redisStatus,
    database,
    version: process.env.npm_package_version || 'unknown',
  };

  return NextResponse.json(healthData, {
    status: 200,
    // Cache-Control for CDN/shared caches (optional, separate from Redis cache)
    headers: {
      'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30',
    },
  });
};

// Wrap with SWR caching: 15s fresh, 30s stale window for more responsive metrics
export const GET = withSWR(handler, { ttl: 15, staleWhileRevalidate: 30 });
