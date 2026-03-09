/**
 * Health Monitoring Types
 */

export type HealthModule =
  | 'system'
  | 'database'
  | 'api'
  | 'ingest'
  | 'sentry'
  | 'business'
  | 'integrations';

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export type MetricUnit = 'ms' | 'pct' | 'count' | 'bytes' | 'status' | 'currency';

export interface HealthMetric {
  id?: string; // Database ID (if persisted)
  timestamp: Date;
  module: HealthModule;
  metric: string;
  value: number;
  unit: MetricUnit;
  status: HealthStatus;
  details?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface HealthCheckResult {
  module: HealthModule;
  status: HealthStatus;
  timestamp: Date;
  metrics: HealthMetric[];
  summary?: string;
  error?: string;
}

export interface HealthStatusResponse {
  overall: HealthStatus;
  timestamp: Date;
  checks: Record<HealthModule, HealthCheckResult>;
  summary: {
    healthy: number;
    degraded: number;
    down: number;
  };
}

export interface HealthHistoryQuery {
  metric: string;
  module?: HealthModule;
  range: '1h' | '6h' | '24h' | '7d' | '30d';
  start?: Date;
  end?: Date;
}

export interface HealthHistoryPoint {
  timestamp: Date;
  value: number;
  status: HealthStatus;
}

export interface HealthAlert {
  id: string;
  createdAt: Date;
  resolvedAt?: Date;
  module: HealthModule;
  metric: string;
  severity: 'warning' | 'critical';
  threshold: number;
  observedValue: number;
  message: string;
  dedupeKey: string;
  resolved: boolean;
  resolvedBy?: string;
  channelsSent?: Record<string, boolean>;
  deliveredAt?: Date;
  metricId?: string;
}

export interface AlertChannel {
  type: 'telegram' | 'email' | 'slack';
  enabled: boolean;
  config: Record<string, any>;
}

export interface AdminAction {
  action: string;
  resource?: string;
  parameters?: Record<string, any>;
}

export interface MaintenanceMode {
  enabled: boolean;
  reason?: string;
  startedAt?: Date;
  startedBy?: string;
  endedAt?: Date;
  endedBy?: string;
}

export interface SystemResources {
  uptime: number; // seconds
  cpu: {
    load: number; // 0-1
    cores: number;
    model: string;
  };
  memory: {
    total: number; // bytes
    used: number;
    free: number;
    usagePct: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePct: number;
  };
  platform: string;
  nodeVersion: string;
}

export interface DatabaseHealth {
  connected: boolean;
  latencyMs: number;
  pool: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  replication?: {
    lag?: number;
    state?: string;
  };
  error?: string;
}

export interface ApiEndpointHealth {
  endpoint: string;
  status: number;
  responseTimeMs: number;
  success: boolean;
  error?: string;
}

export interface IngestHealth {
  jobsRecent: number; // last 24h
  successRate: number; // 0-1
  avgDurationMs: number;
  queueDepth: number;
  errors: Array<{
    type: string;
    count: number;
    lastOccurred: Date;
  }>;
}

export interface SentryHealth {
  errorsLast24h: number;
  errorRate: number; // errors per minute
  topErrors: Array<{
    type: string;
    count: number;
    lastSeen: Date;
  }>;
  healthy: boolean;
}

export interface BusinessMetrics {
  mrr: number; // monthly recurring revenue in cents
  activeSubscriptions: number;
  newSignups7d: number;
  newSignups30d: number;
  churned7d: number;
  churnRate: number; // 0-1 (annual or monthly)
  dunningCount: number; // customers in dunning
  lastUpdated: Date;
}

export interface IntegrationHealth {
  openrouter: {
    latencyMs: number;
    reachable: boolean;
    error?: string;
  };
  resend: {
    latencyMs: number;
    reachable: boolean;
    error?: string;
  };
  polar: {
    latencyMs: number;
    reachable: boolean;
    error?: string;
  };
  stripe: {
    latencyMs: number;
    reachable: boolean;
    error?: string;
  };
}
