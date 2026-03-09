import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { HealthCheckResult, DatabaseHealth, HealthMetric } from '../types';

/**
 * Database Health Check Module
 *
 * Checks:
 * - Connection test (SELECT 1)
 * - Query latency
 * - Connection pool stats (active/idle/total)
 * - Replication status (if applicable)
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'Database operational';
  let error: string | undefined;

  try {
    // Test connection with SELECT 1 and measure latency
    const startTime = Date.now();
    const result = await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - startTime;

    metrics.push({
      timestamp: new Date(),
      module: 'database',
      metric: 'connection_latency_ms',
      value: latencyMs,
      unit: 'ms',
      status: latencyMs > 2000 ? 'down' :
              latencyMs > 1000 ? 'degraded' : 'healthy',
      details: { query: 'SELECT 1' },
      tags: { test: 'connection' },
    });

    // Check if query succeeded
    if (result.rows.length === 0 || result.rows[0][0] !== 1) {
      status = 'down';
      error = 'Database connection test failed: unexpected result';
      summary = 'Database connection test failed';
    }

    // Get connection pool stats
    // Note: Neon/Serverless Postgres doesn't expose pool stats directly via standard queries.
    // We'll use pg_stat_activity to approximate active connections.
    try {
      const poolStatsResult = await db.execute(sql`
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      const row = poolStatsResult.rows[0];
      if (row) {
        const totalConn = parseInt(row.total_connections, 10) || 0;
        const activeConn = parseInt(row.active_connections, 10) || 0;
        const idleConn = parseInt(row.idle_connections, 10) || 0;

        metrics.push({
          timestamp: new Date(),
          module: 'database',
          metric: 'pool_total',
          value: totalConn,
          unit: 'count',
          status: 'healthy', // No specific threshold for total
          details: { total: totalConn, active: activeConn, idle: idleConn },
          tags: { resource: 'pool' },
        });

        metrics.push({
          timestamp: new Date(),
          module: 'database',
          metric: 'pool_active',
          value: activeConn,
          unit: 'count',
          status: activeConn > 100 ? 'degraded' : 'healthy', // High active connections might indicate connection leak
          details: { total: totalConn, active: activeConn, idle: idleConn },
          tags: { resource: 'pool' },
        });

        // Add idle connections metric
        metrics.push({
          timestamp: new Date(),
          module: 'database',
          metric: 'pool_idle',
          value: idleConn,
          unit: 'count',
          status: 'healthy',
          details: { total: totalConn, active: activeConn, idle: idleConn },
          tags: { resource: 'pool' },
        });
      }
    } catch (poolErr) {
      console.warn('Could not fetch pool stats:', poolErr);
      // Non-fatal, continue
    }

    // Check replication status if applicable (for read replicas)
    // This is only relevant if the app uses replication
    try {
      const replResult = await db.execute(sql`
        SELECT
          pg_is_in_recovery() as in_recovery,
          pg_last_xlog_receive_location() as receive_lsn,
          pg_last_xlog_replay_location() as replay_lsn,
          pg_wal_lsn_diff(pg_current_wal_lsn(), COALESCE(pg_last_xlog_receive_location(), pg_current_wal_lsn())) as replication_lag_bytes
        FROM (SELECT 1) s
      `);

      if (replResult.rows.length > 0) {
        const row = replResult.rows[0];
        const inRecovery = Boolean(row.in_recovery);
        const lagBytes = parseInt(row.replication_lag_bytes, 10) || 0;

        metrics.push({
          timestamp: new Date(),
          module: 'database',
          metric: 'replication_lag_bytes',
          value: lagBytes,
          unit: 'bytes',
          status: lagBytes > 10000000 ? 'degraded' : // > 10MB lag
                  lagBytes > 100000000 ? 'down' : 'healthy',
          details: {
            inRecovery,
            receiveLsn: row.receive_lsn,
            replayLsn: row.replay_lsn,
          },
          tags: { feature: 'replication' },
        });
      }
    } catch (replErr) {
      // Replication not configured or not available - this is fine
      console.debug('Replication check not applicable:', replErr);
    }

    // Determine overall status based on metrics
    const worstMetric = metrics
      .filter(m => m.module === 'database' && m.metric !== 'pool_total')
      .reduce((worst, m) => {
        if (m.status === 'down') return 'down';
        if (m.status === 'degraded' && worst !== 'down') return 'degraded';
        return worst;
      }, 'healthy');

    if (worstMetric !== 'healthy') {
      status = worstMetric as 'degraded' | 'down';
      summary = status === 'down' ? 'Database critical' : 'Database degraded';
      if (latencyMs > 2000) {
        error = `High database latency: ${latencyMs}ms`;
      }
    }

  } catch (err: any) {
    console.error('Database health check error:', err);
    status = 'down';
    error = err.message || 'Database health check failed';
    summary = 'Database unreachable';

    // Add a metric to capture the error
    metrics.push({
      timestamp: new Date(),
      module: 'database',
      metric: 'connection_error',
      value: 1,
      unit: 'status',
      status: 'down',
      details: { error: err.message },
      tags: { severity: 'critical' },
    });
  }

  return {
    module: 'database',
    status,
    timestamp: new Date(),
    metrics,
    summary,
    error,
  };
}
