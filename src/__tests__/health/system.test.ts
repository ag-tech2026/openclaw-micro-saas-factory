import { checkSystemHealth } from '@/lib/health/modules/system';

// Mock Node.js os module
jest.mock('os', () => ({
  cpus: () => [
    {
      model: 'Intel(R) Core(TM) i7-9750H',
      speed: 2660,
      times: {
        user: 1425400,
        nice: 0,
        sys: 123400,
        idle: 4235300,
        irq: 0,
      },
    },
  ],
  totalmem: () => 16 * 1024 * 1024 * 1024, // 16GB
  freemem: () => 4 * 1024 * 1024 * 1024, // 4GB free
  uptime: () => 86400 * 5, // 5 days in seconds
  loadavg: () => [2.5, 2.0, 1.8], // 1, 5, 15 min load averages
  platform: () => 'linux',
}));

// Mock exec to avoid running actual commands
const mockExec = jest.fn();
jest.doMock('child_process', () => ({
  exec: mockExec,
  promisify: () => mockExec,
}));

describe('System Health Check', () => {
  beforeEach(() => {
    mockExec.mockReset();
  });

  it('should return healthy status when resources are good', async () => {
    // Mock df command to return disk info
    mockExec.mockResolvedValue({
      stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       51200000 10240000  40960000  20% /\n',
      stderr: '',
    });

    // Mock openclaw status
    mockExec.mockResolvedValue({
      stdout: '✅ OpenClaw Gateway is running (pid 1234)\nUptime: 5 days\n',
      stderr: '',
    });

    const result = await checkSystemHealth();

    expect(result.module).toBe('system');
    expect(result.status).toBe('healthy');
    expect(result.metrics).toHaveLength(5); // memory, cpu, disk, uptime, gateway
    expect(result.error).toBeUndefined();
  });

  it('should return degraded when memory usage is high', async () => {
    // Override freemem to simulate high memory usage
    const originalFreemem = (require('os') as any).freemem;
    (require('os') as any).freemem = () => 1 * 1024 * 1024 * 1024; // 1GB free out of 16GB = ~94%

    mockExec.mockResolvedValue({
      stdout: 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       51200000 10240000  40960000  20% /\n',
      stderr: '',
    });
    mockExec.mockResolvedValue({
      stdout: '✅ OpenClaw Gateway is running\n',
      stderr: '',
    });

    const result = await checkSystemHealth();

    // Memory usage should be degraded (~94%)
    const memoryMetric = result.metrics.find(m => m.metric === 'memory_usage_pct');
    expect(memoryMetric?.status).toBe('degraded');
    expect(result.status).toBe('degraded');

    // Restore
    (require('os') as any).freemem = originalFreemem;
  });

  it('should return down when gateway is not running', async () => {
    mockExec.mockResolvedValue({
      stdout: '',
      stderr: 'Error: gateway not found',
    });

    const result = await checkSystemHealth();

    const gatewayMetric = result.metrics.find(m => m.metric === 'gateway_running');
    expect(gatewayMetric?.status).toBe('down');
    expect(result.status).toBe('down');
    expect(result.error).toContain('gateway');
  });

  it('should handle disk usage correctly', async () => {
    // 90% disk usage = degraded
    // Simulate 22GB used out of 24GB
    const usedBlocks = Math.floor(22 * 1024 * 1024 / 1024); // 22GB in 1K blocks
    const totalBlocks = Math.floor(24 * 1024 * 1024 / 1024); // 24GB

    mockExec.mockResolvedValue({
      stdout: `Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       ${totalBlocks} ${usedBlocks} ${totalBlocks - usedBlocks}  90% /\n`,
      stderr: '',
    });
    mockExec.mockResolvedValue({
      stdout: '✅ Gateway running\n',
      stderr: '',
    });

    const result = await checkSystemHealth();

    const diskMetric = result.metrics.find(m => m.metric === 'disk_usage_pct');
    expect(diskMetric?.status).toBe('degraded');
    expect(diskMetric?.details.usagePct).toBeGreaterThanOrEqual(90);
  });

  it('should handle exec errors gracefully', async () => {
    mockExec.mockRejectedValue(new Error('Command not found'));

    const result = await checkSystemHealth();

    // Should still return a result, but gateway metric will indicate error
    expect(result.module).toBe('system');
    expect(result.metrics).toBeDefined();
  });
});
