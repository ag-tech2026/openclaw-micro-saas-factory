import { NextRequest, NextResponse } from 'next/server';
import { defaultRateLimiter } from '@/lib/rate-limiter';

const ADMIN_SECRET = process.env.RATE_LIMIT_ADMIN_SECRET || 'admin-secret-change-me';

/**
 * Admin endpoint to view usage statistics
 * 
 * Authentication: Provide secret via header or query param:
 * - Header: Authorization: Bearer <secret>
 * - Query: ?secret=<secret>
 * 
 * Returns: JSON with all tracked users and their rate limit stats
 */

export async function GET(request: NextRequest) {
  // Authenticate
  const { authorized, error } = await authenticateAdmin(request);
  
  if (!authorized) {
    return NextResponse.json(
      { error: 'unauthorized', message: error || 'Authentication required' },
      { status: 401 }
    );
  }

  // Get all stats
  const allStats = await defaultRateLimiter.getAllStats();
  
  // Convert to array for easier consumption
  const users = Array.from(allStats.entries()).map(([key, stats]) => ({
    id: key,
    used: stats.used,
    remaining: stats.remaining,
    resetAt: stats.resetAt ? new Date(stats.resetAt).toISOString() : null,
  }));

  // Summary stats
  const totalRequests = users.reduce((sum, user) => sum + user.used, 0);
  const uniqueUsers = users.length;
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

  return NextResponse.json({
    success: true,
    data: {
      users,
      summary: {
        totalRequests,
        uniqueUsers,
        limitPerUser: maxRequests,
        windowHours: (parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10) / 3600000),
      },
      generatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Authenticate admin request
 */
async function authenticateAdmin(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  // Check header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === ADMIN_SECRET) {
      return { authorized: true };
    }
    return { authorized: false, error: 'Invalid bearer token' };
  }

  // Check query param
  const url = request.nextUrl;
  const secret = url.searchParams.get('secret');
  if (secret) {
    if (secret === ADMIN_SECRET) {
      return { authorized: true };
    }
    return { authorized: false, error: 'Invalid secret parameter' };
  }

  return { authorized: false, error: 'No authentication provided' };
}
