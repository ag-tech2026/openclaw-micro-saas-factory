import { NextRequest, NextResponse } from 'next/server';
import { defaultRateLimiter } from '@/lib/rate-limiter';

// Configuration
const RATE_LIMIT_EXCEEDED_MESSAGE = 'Too many requests. Please try again later.';
const ADMIN_SECRET = process.env.RATE_LIMIT_ADMIN_SECRET || 'admin-secret-change-me';
const SKIP_RATE_LIMIT_PATHS = ['/api/admin/usage']; // Admin endpoint handles its own auth

/**
 * Middleware to track API usage and enforce rate limits
 * 
 * Identifies users by:
 * - Authenticated session token (cookie or Authorization header)
 * - IP address for anonymous users
 * 
 * Enforces rate limit: RATE_LIMIT_MAX_REQUESTS per RATE_LIMIT_WINDOW_MS
 * Returns 429 when limit exceeded.
 */

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Skip non-API routes and paths that don't need rate limiting
  if (!pathname.startsWith('/api') || SKIP_RATE_LIMIT_PATHS.includes(pathname)) {
    return;
  }

  // Get user identifier
  const userId = await getUserId(request);
  
  // Check rate limit
  const allowed = await defaultRateLimiter.checkLimit(userId);
  
  if (!allowed) {
    const stats = await defaultRateLimiter.getStats(userId);
    
    // Set Retry-After header (in seconds)
    const retryAfter = stats.resetAt 
      ? Math.ceil((stats.resetAt - Date.now()) / 1000)
      : 3600;

    return NextResponse.json(
      {
        error: 'rate_limit_exceeded',
        message: RATE_LIMIT_EXCEEDED_MESSAGE,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || '100',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  
  // Get current stats for headers
  const stats = await defaultRateLimiter.getStats(userId);
  response.headers.set('X-RateLimit-Limit', process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  response.headers.set('X-RateLimit-Remaining', stats.remaining.toString());
  
  if (stats.resetAt) {
    response.headers.set('X-RateLimit-Reset', new Date(stats.resetAt).toISOString());
  }

  return response;
}

/**
 * Get user identifier from request
 * Priority: session token > Authorization header > IP address
 */
async function getUserId(request: NextRequest): Promise<string> {
  // Try to get from session cookie (common pattern)
  const sessionCookie = request.cookies.get('session_id') 
    || request.cookies.get('session')
    || request.cookies.get('auth_token');
  
  if (sessionCookie?.value) {
    // In a real app, you'd validate the session token here
    // For now, use the token value as identifier (hashed for privacy)
    return `session:${hashString(sessionCookie.value)}`;
  }

  // Try Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return `bearer:${hashString(token)}`;
  }

  // Fallback to IP address
  const ip = getClientIp(request);
  return `ip:${hashString(ip)}`;
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIp(request: NextRequest): string {
  // Check X-Forwarded-For header (common with proxies)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // Check X-Real-IP
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback to Next.js geo/IP info if available
  const ip = request.ip || 'unknown';
  return ip;
}

/**
 * Simple hash function for consistent identifiers
 * (Not cryptographic, just for uniqueness)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Return as hex string with prefix to avoid collisions
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and admin endpoint
     * The admin endpoint will have its own authentication
     */
    '/api/:path*',
  ],
};
