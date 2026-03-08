import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/config';

const ADMIN_SECRET = env.RATE_LIMIT_ADMIN_SECRET || 'admin-secret-change-me';

/**
 * Simple admin authentication for analytics
 * Expects a query parameter ?token=<admin-secret>
 *
 * In production, use a proper auth system (BetterAuth, etc.)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Token required' },
      { status: 401 }
    );
  }

  if (token === ADMIN_SECRET) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json(
    { error: 'Invalid token' },
    { status: 401 }
  );
}
