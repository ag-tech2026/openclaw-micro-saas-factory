import { getStatus, isDegrading, isDown } from '@/lib/health/thresholds';

describe('Health Thresholds', () => {
  describe('getStatus', () => {
    it('should return healthy when value is well below threshold', () => {
      expect(getStatus(50, 'cpuPct')).toBe('healthy'); // threshold 80
      expect(getStatus(30, 'dbLatencyMs')).toBe('healthy'); // threshold 200
    });

    it('should return degraded when value is slightly above threshold', () => {
      expect(getStatus(90, 'cpuPct')).toBe('degraded'); // 90 > 80 but <= 100
      expect(getStatus(250, 'dbLatencyMs')).toBe('degraded'); // 250 > 200 but <= 2000
    });

    it('should return down when value exceeds double threshold or high threshold', () => {
      expect(getStatus(150, 'cpuPct')).toBe('down'); // > 100 (effectively)
      expect(getStatus(2500, 'dbLatencyMs')).toBe('down'); // > 2000
    });

    it('should return down for null/undefined values', () => {
      expect(getStatus(NaN, 'cpuPct')).toBe('down');
      expect(getStatus(undefined as any, 'cpuPct')).toBe('down');
    });

    it('should treat higher-is-better metrics correctly', () => {
      // For metrics where higher is better (like hit rate)
      expect(getStatus(95, 'errorRatePct', false)).toBe('healthy');
      expect(getStatus(50, 'errorRatePct', false)).toBe('degraded');
    });
  });

  describe('isDegrading', () => {
    it('should return true for degraded or down states', () => {
      expect(isDegrading(90, 'cpuPct')).toBe(true); // degraded
      expect(isDegrading(150, 'cpuPct')).toBe(true); // down
      expect(isDegrading(50, 'cpuPct')).toBe(false); // healthy
    });
  });

  describe('isDown', () => {
    it('should return true only for down state', () => {
      expect(isDown(150, 'cpuPct')).toBe(true);
      expect(isDown(90, 'cpuPct')).toBe(false);
      expect(isDown(50, 'cpuPct')).toBe(false);
    });
  });
});
