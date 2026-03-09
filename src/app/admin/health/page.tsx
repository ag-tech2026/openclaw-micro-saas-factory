'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { formatCurrency } from '@/lib/pricing';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wifi,
  Database,
  Server,
  AlertCircle,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Power,
  Trash2,
  Settings,
  Shield,
  Mail,
  MessageSquare,
} from 'lucide-react';

// Types
type HealthStatus = 'healthy' | 'degraded' | 'down';

interface HealthMetric {
  timestamp: string;
  module: string;
  metric: string;
  value: number;
  unit: string;
  status: string;
  details?: Record<string, any>;
}

interface HealthCheckResult {
  module: string;
  status: HealthStatus;
  timestamp: string;
  metrics: HealthMetric[];
  summary?: string;
  error?: string;
}

interface HealthStatusResponse {
  overall: HealthStatus;
  timestamp: string;
  checks: Record<string, HealthCheckResult>;
  summary: {
    healthy: number;
    degraded: number;
    down: number;
  };
}

interface HistoryPoint {
  timestamp: string;
  value: number;
  status: string;
}

interface Alert {
  id: string;
  createdAt: string;
  resolvedAt?: string;
  module: string;
  metric: string;
  severity: string;
  threshold: number;
  observedValue: number;
  message: string;
  resolved: boolean;
}

const COLORS = {
  healthy: '#10b981',
  degraded: '#f59e0b',
  down: '#ef4444',
};

const MODULE_ICONS: Record<string, any> = {
  system: Server,
  database: Database,
  api: Wifi,
  ingest: Zap,
  sentry: AlertCircle,
  business: BarChart3,
  integrations: MessageSquare,
};

const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; icon: any }> = {
  healthy: { label: 'OK', color: 'bg-green-500', icon: CheckCircle2 },
  degraded: { label: 'Warning', color: 'bg-yellow-500', icon: AlertTriangle },
  down: { label: 'Down', color: 'bg-red-500', icon: XCircle },
};

export default function AdminHealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Health data
  const [healthStatus, setHealthStatus] = useState<HealthStatusResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Selected module history
  const [selectedModule, setSelectedModule] = useState<string>('system');
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu_load_pct');
  const [metricHistory, setMetricHistory] = useState<HistoryPoint[]>([]);

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showResolved, setShowResolved] = useState(false);

  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Authenticate
  useEffect(() => {
    const token = localStorage.getItem('admin_auth_token');
    if (token) {
      setAuthToken(token);
      setAuthenticated(true);
    } else {
      // Check for session cookie as fallback
      fetch('/api/auth/session')
        .then(res => res.json())
        .then(data => {
          if (data?.user?.role === 'admin') {
            setAuthenticated(true);
          } else {
            router.push('/sign-in?callbackUrl=/admin/health');
          }
        })
        .catch(() => {
          router.push('/sign-in?callbackUrl=/admin/health');
        });
    }
  }, [router]);

  // Load health status
  const loadHealthStatus = useCallback(async (force = false) => {
    if (!authenticated) return;

    try {
      setError(null);
      const response = await fetch(`/api/health/status${force ? '?force=true' : ''}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/sign-in?callbackUrl=/admin/health');
          return;
        }
        throw new Error(`Failed to fetch health status: ${response.status}`);
      }
      const data: HealthStatusResponse = await response.json();
      setHealthStatus(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticated, router]);

  // Load alerts
  const loadAlerts = useCallback(async () => {
    if (!authenticated) return;
    try {
      const response = await fetch(`/api/health/alerts?resolved=${showResolved}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  }, [authenticated, showResolved]);

  // Load metric history
  const loadMetricHistory = useCallback(async (module: string, metric: string) => {
    try {
      const response = await fetch(`/api/health/history?metric=${encodeURIComponent(metric)}&module=${module}&range=24h`);
      if (response.ok) {
        const data = await response.json();
        setMetricHistory(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load metric history:', err);
    }
  }, []);

  // Check maintenance mode
  const checkMaintenanceMode = useCallback(async () => {
    try {
      // Could have a dedicated endpoint, but we can check health status for now
      // Actually maintenance mode should be a separate endpoint
      // For now assume false
      setMaintenanceMode(false);
    } catch {
      setMaintenanceMode(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (authenticated) {
      loadHealthStatus();
      loadAlerts();
      checkMaintenanceMode();
      // Refresh every 30 seconds
      const interval = setInterval(() => loadHealthStatus(), 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated, loadHealthStatus, loadAlerts, checkMaintenanceMode]);

  // Load history when module/metric changes
  useEffect(() => {
    if (selectedModule && selectedMetric) {
      loadMetricHistory(selectedModule, selectedMetric);
    }
  }, [selectedModule, selectedMetric, loadMetricHistory]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    loadHealthStatus(true);
    loadAlerts();
  };

  // Toggle maintenance mode
  const toggleMaintenance = async (enabled: boolean) => {
    if (!confirm(`Are you sure you want to ${enabled ? 'enable' : 'disable'} maintenance mode?`)) {
      return;
    }

    try {
      const response = await fetch('/api/health/actions/toggle-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, reason: enabled ? 'Manual maintenance' : undefined }),
      });
      if (response.ok) {
        setMaintenanceMode(enabled);
        loadHealthStatus();
      } else {
        alert('Failed to toggle maintenance mode');
      }
    } catch (err) {
      alert('Error toggling maintenance mode');
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/health/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [alertId], resolved: true }),
      });
      if (response.ok) {
        loadAlerts();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Get metrics for a module
  const getModuleMetrics = (moduleName: string) => {
    return healthStatus?.checks[moduleName]?.metrics || [];
  };

  // Render status badge
  const renderStatusBadge = (status: HealthStatus) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge className={`${status === 'healthy' ? 'bg-green-500' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading health dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Health Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modules = healthStatus ? Object.keys(healthStatus.checks) : [];
  const overallStatus = healthStatus?.overall || 'healthy';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
            <p className="text-muted-foreground">
              System monitoring and alerts
              {lastUpdated && (
                <span className="ml-2 text-sm">
                  • Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {maintenanceMode && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertCircle className="w-3 h-3 mr-1" />
                Maintenance Mode
              </Badge>
            )}
            <Button
              onClick={() => toggleMaintenance(!maintenanceMode)}
              variant={maintenanceMode ? "destructive" : "outline"}
              size="sm"
            >
              {maintenanceMode ? 'Disable' : 'Enable'} Maintenance
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status Card */}
        <Card className={`border-l-4 ${
          overallStatus === 'healthy' ? 'border-l-green-500' :
          overallStatus === 'degraded' ? 'border-l-yellow-500' :
          'border-l-red-500'
        }`}>
          <CardHeader>
            <CardTitle>Overall System Status</CardTitle>
            <CardDescription>
              {healthStatus?.summary.healthy} healthy, {healthStatus?.summary.degraded} degraded, {healthStatus?.summary.down} down
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold">
                {overallStatus === 'healthy' ? (
                  <span className="text-green-600">HEALTHY</span>
                ) : overallStatus === 'degraded' ? (
                  <span className="text-yellow-600">DEGRADED</span>
                ) : (
                  <span className="text-red-600">CRITICAL</span>
                )}
              </div>
              <div className="text-2xl font-mono">
                {STATUS_CONFIG[overallStatus].label}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Module Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(module => {
            const check = healthStatus?.checks[module];
            const Icon = MODULE_ICONS[module] || Activity;
            const metricCount = check?.metrics.length || 0;
            const errorCount = check?.metrics.filter(m => m.status !== 'healthy').length || 0;

            return (
              <Card key={module} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedModule(module);
                  // Auto-select first metric
                  if (check?.metrics.length > 0) {
                    setSelectedMetric(check.metrics[0].metric);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      {module}
                    </CardTitle>
                    {check && renderStatusBadge(check.status)}
                  </div>
                  <CardDescription>{check?.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metrics:</span>
                      <span className="font-medium">{metricCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Warnings:</span>
                      <span className={`font-medium ${errorCount > 0 ? 'text-red-600' : ''}`}>
                        {errorCount}
                      </span>
                    </div>
                    {check?.error && (
                      <div className="text-xs text-red-600 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {check.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Details Section */}
        {selectedModule && healthStatus?.checks[selectedModule] && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metrics Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="capitalize">{selectedModule} Metrics Over Time</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Select Metric:</label>
                  <select
                    className="w-full p-2 border rounded bg-background"
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                  >
                    {getModuleMetrics(selectedModule).map(m => (
                      <option key={m.metric} value={m.metric}>
                        {m.metric.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="h-80">
                  {metricHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metricHistory}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(ts) => new Date(ts).toLocaleString()}
                          formatter={(value: number) => [value.toFixed(2), 'Value']}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No historical data available for this metric
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showResolved}
                      onChange={(e) => setShowResolved(e.target.checked)}
                      className="rounded"
                    />
                    Show resolved
                  </label>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No alerts</p>
                  ) : (
                    alerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`p-3 border rounded-lg ${alert.resolved ? 'bg-muted/50 opacity-60' : 'bg-card'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {alert.severity}
                              </Badge>
                              <span className="text-xs uppercase font-mono text-muted-foreground">
                                {alert.module}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!alert.resolved && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resolveAlert(alert.id)}
                              title="Mark as resolved"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Admin health management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Restart OpenClaw gateway? This may cause brief downtime.')) {
                    fetch('/api/health/actions/restart-gateway', { method: 'POST' })
                      .then(res => res.json())
                      .then(data => alert(data.message || 'Gateway restart initiated'))
                      .catch(err => alert('Error: ' + err.message));
                  }
                }}
              >
                <Power className="w-4 h-4 mr-2" />
                Restart Gateway
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Trigger immediate health check?')) {
                    fetch('/api/health/actions/trigger-check', { method: 'POST' })
                      .then(() => {
                        alert('Manual health check triggered');
                        setTimeout(loadHealthStatus, 2000);
                      });
                  }
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
                Run Check Now
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Navigate to cache management or open modal
                  alert('Cache management not implemented yet');
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/audit?filter=health')}
              >
                <Shield className="w-4 h-4 mr-2" />
                View Audit Log
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* MRR & Subscriptions Overview */}
        {healthStatus?.checks.business && (
          <Card>
            <CardHeader>
              <CardTitle>Business Metrics</CardTitle>
              <CardDescription>Subscription and revenue overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const businessMetrics = healthStatus.checks.business.metrics;
                  const getValue = (name: string) => {
                    const m = businessMetrics.find(m => m.metric === name);
                    return m ? m.value : null;
                  };

                  return [
                    {
                      label: 'MRR',
                      value: getValue('mrr_usd'),
                      format: (v: number) => formatCurrency(v),
                    },
                    {
                      label: 'Active Subscriptions',
                      value: getValue('active_subscriptions'),
                      format: (v: number) => v?.toLocaleString() || '0',
                    },
                    {
                      label: 'New Signups (30d)',
                      value: getValue('new_signups_30d'),
                      format: (v: number) => v?.toLocaleString() || '0',
                    },
                    {
                      label: 'Churn Rate (7d)',
                      value: getValue('churn_rate_7d'),
                      format: (v: number) => `${(v || 0).toFixed(1)}%`,
                    },
                  ];
                })().map((item, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                    <div className="text-2xl font-bold">{item.format(item.value)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
