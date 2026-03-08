/**
 * Simple in-memory rate limiter with sliding window
 * Stores request timestamps per user/key
 */

interface RateLimitWindow {
  timestamps: number[];
}

export class RateLimiter {
  private windows: Map<string, RateLimitWindow>;
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.windows = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed for the given key
   * Returns true if allowed, false if rate limited
   */
  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const window = this.getOrCreateWindow(key);
    
    // Remove expired timestamps
    window.timestamps = window.timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Check if under limit
    if (window.timestamps.length < this.maxRequests) {
      window.timestamps.push(now);
      return true;
    }

    return false;
  }

  /**
   * Get current usage stats for a key
   */
  async getStats(key: string): Promise<{ used: number; remaining: number; resetAt: number | null }> {
    const window = this.windows.get(key);
    const now = Date.now();
    
    if (!window) {
      return { used: 0, remaining: this.maxRequests, resetAt: null };
    }

    // Clean expired
    const validTimestamps = window.timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    // Update if we cleaned
    if (validTimestamps.length !== window.timestamps.length) {
      window.timestamps = validTimestamps;
    }

    const oldest = validTimestamps.length > 0 ? Math.min(...validTimestamps) : now;
    const resetAt = oldest + this.windowMs;

    return {
      used: validTimestamps.length,
      remaining: Math.max(0, this.maxRequests - validTimestamps.length),
      resetAt: resetAt,
    };
  }

  /**
   * Get all keys with their stats (for admin viewing)
   */
  async getAllStats(): Promise<Map<string, { used: number; remaining: number; resetAt: number | null }>> {
    const allStats = new Map<string, { used: number; remaining: number; resetAt: number | null }>();
    const now = Date.now();
    
    for (const [key, window] of this.windows.entries()) {
      const validTimestamps = window.timestamps.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      // Clean expired entries
      if (validTimestamps.length !== window.timestamps.length) {
        window.timestamps = validTimestamps;
      }

      const oldest = validTimestamps.length > 0 ? Math.min(...validTimestamps) : now;
      const resetAt = oldest + this.windowMs;

      allStats.set(key, {
        used: validTimestamps.length,
        remaining: Math.max(0, this.maxRequests - validTimestamps.length),
        resetAt: resetAt,
      });
    }

    return allStats;
  }

  /**
   * Reset limits for a key (useful for admin/testing)
   */
  async reset(key: string): Promise<void> {
    this.windows.delete(key);
  }

  /**
   * Reset all limits
   */
  async resetAll(): Promise<void> {
    this.windows.clear();
  }

  private getOrCreateWindow(key: string): RateLimitWindow {
    if (!this.windows.has(key)) {
      this.windows.set(key, { timestamps: [] });
    }
    return this.windows.get(key)!;
  }
}

// Singleton instance with default config
// Can be overridden by creating a new instance
export const defaultRateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10) // 1 hour default
);
