import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getHealthHistory } from '@/lib/health/collector';

/**
 * GET /api/health/history
 *
 * Returns time-series data for charts.
 * Requires admin authentication.
 *
 * Query parameters:
 * - metric (required): Metric name
 * - module (optional): Module name
 * - range (optional): '1h', '6h', '24h', '7d', '30d' (default: '24h')
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric');
    const module = searchParams.get('module') || undefined;
    const range = (searchParams.get('range') as '1h' | '6h' | '24h' | '7d' | '30d') || '24h';

    if (!metric) {
      return NextResponse.json(
        { error: 'Missing required parameter: metric' },
        { status: 400 }
      );
    }

    const history = await getHealthHistory(metric, module, range);

    return NextResponse.json({
      metric,
      module,
      range,
      data: history.map(point => ({
        timestamp: point.timestamp.toISOString(),
        value: point.value,
        status: point.status,
      })),
    });

  } catch (error: any) {
    console.error('Health history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health history', message: error.message },
      { status: 500 }
    );
  }
}
