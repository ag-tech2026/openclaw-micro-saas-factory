import { exec } from 'child_process';
import { promisify } from 'util';
import { buffer } from 'stream/consumers';
import * as os from 'os';
import * as fs from 'fs';
import { HealthCheckResult, SystemResources, HealthMetric } from '../types';

const execAsync = promisify(exec);

/**
 * Get system resources using Node.js os module and /proc filesystem
 */
async function getSystemResources(): Promise<SystemResources> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const uptime = os.uptime();

  // Calculate CPU load average (1-minute)
  const loadAvg = os.loadavg()[0] || 0;
  const cpuCores = cpus.length;

  // Get disk space (try multiple methods)
  let diskTotal = 0;
  let diskUsed = 0;
  let diskFree = 0;

  try {
    // Method 1: Use df command on root filesystem
    const { stdout: dfOutput } = await execAsync('df -k /');
    const lines = dfOutput.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      if (parts.length >= 4) {
        diskTotal = parseInt(parts[1], 10) * 1024; // 1K blocks to bytes
        diskUsed = parseInt(parts[2], 10) * 1024;
        diskFree = parseInt(parts[3], 10) * 1024;
      }
    }
  } catch {
    // Method 2: Fallback to reading /proc/fsinfo or /proc/mounts
    try {
      const statvfs = await readStatvfs('/');
      if (statvfs) {
        diskTotal = statvfs.blocks * statvfs.frsize;
        diskFree = statvfs.bfree * statvfs.frsize;
        diskUsed = diskTotal - diskFree;
      }
    } catch {
      console.error('Could not determine disk space');
    }
  }

  return {
    uptime,
    cpu: {
      load: loadAvg / cpuCores,
      cores: cpuCores,
      model: cpus[0]?.model || 'Unknown',
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePct: (usedMem / totalMem) * 100,
    },
    disk: {
      total: diskTotal,
      used: diskUsed,
      free: diskFree,
      usagePct: diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0,
    },
    platform: os.platform(),
    nodeVersion: process.version,
  };
}

/**
 * Parse statvfs structure from /proc/self/fs or similar
 */
async function readStatvfs(path: string): Promise<{
  blocks: number;
  bfree: number;
  frsize: number;
} | null> {
  try {
    // In Node.js, we can use fs.statfs if available (not in standard library)
    // So we'll use df as fallback above. Return null.
    return null;
  } catch {
    return null;
  }
}

/**
 * Check OpenClaw gateway status using CLI
 */
async function checkGatewayStatus(): Promise<{
  running: boolean;
  status?: string;
  error?: string;
}> {
  try {
    // Use openclaw CLI to check gateway status
    const { stdout, stderr } = await execAsync('openclaw gateway status', {
      timeout: 5000,
    });

    // Parse output - typical output might be "running" or include more details
    const output = stdout + stderr;
    const isRunning = output.toLowerCase().includes('running') ||
                      output.toLowerCase().includes('active') ||
                      output.includes('✅');

    return {
      running: isRunning,
      status: output.trim().split('\n')[0] || 'Unknown',
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        running: false,
        error: 'openclaw CLI not found in PATH',
      };
    }
    return {
      running: false,
      error: error.message || 'Unknown error checking gateway',
    };
  }
}

/**
 * System Health Check Module
 *
 * Collects:
 * - Uptime
 * - CPU usage and load
 * - Memory usage
 * - Disk space
 * - OpenClaw gateway status
 */
export async function checkSystemHealth(): Promise<HealthCheckResult> {
  const metrics: HealthMetric[] = [];
  let status: 'healthy' | 'degraded' | 'down' = 'healthy';
  let summary = 'System operational';
  let error: string | undefined;

  try {
    // Get system resources
    const resources = await getSystemResources();

    // Add memory metric
    metrics.push({
      timestamp: new Date(),
      module: 'system',
      metric: 'memory_usage_pct',
      value: resources.memory.usagePct,
      unit: 'pct',
      status: resources.memory.usagePct > 90 ? 'down' :
              resources.memory.usagePct > 80 ? 'degraded' : 'healthy',
      details: {
        total: resources.memory.total,
        used: resources.memory.used,
        free: resources.memory.free,
      },
      tags: { resource: 'memory' },
    });

    // Add CPU load metric (normalized to percentage)
    const cpuLoadPct = resources.cpu.load * 100;
    metrics.push({
      timestamp: new Date(),
      module: 'system',
      metric: 'cpu_load_pct',
      value: cpuLoadPct,
      unit: 'pct',
      status: cpuLoadPct > 90 ? 'down' :
              cpuLoadPct > 80 ? 'degraded' : 'healthy',
      details: {
        cores: resources.cpu.cores,
        model: resources.cpu.model,
      },
      tags: { resource: 'cpu' },
    });

    // Add disk usage metric
    metrics.push({
      timestamp: new Date(),
      module: 'system',
      metric: 'disk_usage_pct',
      value: resources.disk.usagePct,
      unit: 'pct',
      status: resources.disk.usagePct > 95 ? 'down' :
              resources.disk.usagePct > 90 ? 'degraded' : 'healthy',
      details: {
        total: resources.disk.total,
        used: resources.disk.used,
        free: resources.disk.free,
      },
      tags: { resource: 'disk' },
    });

    // Add uptime metric (in days, but store as hours)
    const uptimeHours = resources.uptime / 3600;
    metrics.push({
      timestamp: new Date(),
      module: 'system',
      metric: 'uptime_hours',
      value: uptimeHours,
      unit: 'count',
      status: 'healthy',
      details: {
        platform: resources.platform,
        nodeVersion: resources.nodeVersion,
      },
      tags: { resource: 'uptime' },
    });

    // Check gateway status
    const gatewayStatus = await checkGatewayStatus();
    metrics.push({
      timestamp: new Date(),
      module: 'system',
      metric: 'gateway_running',
      value: gatewayStatus.running ? 1 : 0,
      unit: 'status',
      status: gatewayStatus.running ? 'healthy' : 'down',
      details: {
        status: gatewayStatus.status,
        error: gatewayStatus.error,
      },
      tags: { service: 'openclaw-gateway' },
    });

    if (!gatewayStatus.running) {
      status = 'down';
      error = gatewayStatus.error || 'OpenClaw gateway is not running';
      summary = 'Gateway is down';
    } else {
      // Determine overall status from metrics
      const worstStatus = metrics
        .filter(m => ['cpu_load_pct', 'memory_usage_pct', 'disk_usage_pct', 'gateway_running'].includes(m.metric))
        .map(m => m.status)
        .reduce((worst, current) => {
          if (current === 'down') return 'down';
          if (current === 'degraded' && worst !== 'down') return 'degraded';
          return worst;
        }, 'healthy');

      status = worstStatus;
      summary = status === 'healthy'
        ? 'All system resources healthy'
        : status === 'degraded'
          ? 'System resources degraded'
          : 'System resources critical';
    }

    return {
      module: 'system',
      status,
      timestamp: new Date(),
      metrics,
      summary,
      error,
    };

  } catch (err: any) {
    console.error('System health check error:', err);
    return {
      module: 'system',
      status: 'down',
      timestamp: new Date(),
      metrics,
      summary: 'System health check failed',
      error: err.message,
    };
  }
}
