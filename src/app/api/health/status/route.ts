import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { runAllChecks } from '@/lib/health/collector';

/**
 * GET /api/health/status
 *
 * Returns comprehensive health status for all modules.
 * Requires admin authentication.
 *
 * Query parameters:
 * - force (boolean): Run fresh checks instead of cached
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';

    // If force=false, we could implement caching with Redis
    // For now, always run fresh checks
    const healthResponse = await runAllChecks(process.env.NEXT_PUBLIC_APP_URL);

    // Serialize dates to ISO strings
    const serialized = {
      overall: healthResponse.overall,
      timestamp: healthResponse.timestamp.toISOString(),
      checks: Object.fromEntries(
        Object.entries(healthResponse.checks).map(([module, check]) => [
          module,
          {
            ...check,
            timestamp: check.timestamp.toISOString(),
          },
        ])
      ),
      summary: healthResponse.summary,
    };

    return NextResponse.json(serialized, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('Health status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health status', message: error.message },
      { status: 500 }
    );
  }
}
