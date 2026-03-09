import { runAllChecks } from '@/lib/health/collector';
import * as systemModule from '@/lib/health/modules/system';
import * as databaseModule from '@/lib/health/modules/database';

// Mock all health modules
jest.mock('@/lib/health/modules/system');
jest.mock('@/lib/health/modules/database');
jest.mock('@/lib/health/modules/api');
jest.mock('@/lib/health/modules/ingest');
jest.mock('@/lib/health/modules/sentry');
jest.mock('@/lib/health/modules/business');
jest.mock('@/lib/health/modules/integrations');

describe('Health Collector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should aggregate all module results', async () => {
    // Mock successful system check
    (systemModule.checkSystemHealth as jest.Mock).mockResolvedValue({
      module: 'system',
      status: 'healthy',
      timestamp: new Date(),
      metrics: [
        {
          timestamp: new Date(),
          module: 'system',
          metric: 'cpu_load_pct',
          value: 45,
          unit: 'pct',
          status: 'healthy',
        },
      ],
      summary: 'System OK',
    });

    // Mock degraded database check
    (databaseModule.checkDatabaseHealth as jest.Mock).mockResolvedValue({
      module: 'database',
      status: 'degraded',
      timestamp: new Date(),
      metrics: [
        {
          timestamp: new Date(),
          module: 'database',
          metric: 'connection_latency_ms',
          value: 500,
          unit: 'ms',
          status: 'degraded',
        },
      ],
      summary: 'DB slow',
    });

    const result = await runAllChecks('http://localhost:3000');

    expect(result.overall).toBe('degraded'); // worst status wins
    expect(result.checks.system).toBeDefined();
    expect(result.checks.database).toBeDefined();
    expect(result.checks.api).toBeDefined();
    expect(Object.keys(result.checks)).toHaveLength(7); // all modules
  });

  it('should handle module failures gracefully', async () => {
    (systemModule.checkSystemHealth as jest.Mock).mockRejectedValue(
      new Error('System check crashed')
    );
    (databaseModule.checkDatabaseHealth as jest.Mock).mockResolvedValue({
      module: 'database',
      status: 'healthy',
      timestamp: new Date(),
      metrics: [],
      summary: 'OK',
    });
    // Other modules return healthy as well...

    const result = await runAllChecks();

    expect(result.overall).toBe('down'); // one module down
    expect(result.checks.system.status).toBe('down');
    expect(result.checks.system.error).toContain('crashed');
  });

  it('should return overall healthy when all modules healthy', async () => {
    const mockHealthyResult = {
      module: 'any',
      status: 'healthy' as const,
      timestamp: new Date(),
      metrics: [],
      summary: 'OK',
    };

    Object.values({
      system: systemModule.checkSystemHealth,
      database: databaseModule.checkDatabaseHealth,
      api: require('@/lib/health/modules/api').checkApiHealth,
      ingest: require('@/lib/health/modules/ingest').checkIngestHealth,
      sentry: require('@/lib/health/modules/sentry').checkSentryHealth,
      business: require('@/lib/health/modules/business').checkBusinessHealth,
      integrations: require('@/lib/health/modules/integrations').checkIntegrationsHealth,
    }).forEach((fn: any) => fn.mockResolvedValue(mockHealthyResult));

    const result = await runAllChecks();

    expect(result.overall).toBe('healthy');
    expect(result.summary.healthy).toBe(7);
    expect(result.summary.down).toBe(0);
    expect(result.summary.degraded).toBe(0);
  });
});
