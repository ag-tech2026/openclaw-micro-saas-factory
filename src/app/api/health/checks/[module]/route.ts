import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import {
  checkSystemHealth,
  checkDatabaseHealth,
  checkApiHealth,
  checkIngestHealth,
  checkSentryHealth,
  checkBusinessHealth,
  checkIntegrationsHealth,
} from '@/lib/health/modules';

const moduleChecks: Record<string, () => Promise<any>> = {
  system: checkSystemHealth,
  database: checkDatabaseHealth,
  api: checkApiHealth,
  ingest: checkIngestHealth,
  sentry: checkSentryHealth,
  business: checkBusinessHealth,
  integrations: checkIntegrationsHealth,
};

/**
 * GET /api/health/checks/:module
 *
 * Run a specific health check on demand.
 * Requires admin authentication.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    // Require admin authentication
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { module } = await params;
    const checkFunction = moduleChecks[module];

    if (!checkFunction) {
      return NextResponse.json(
        { error: `Unknown module: ${module}. Valid modules: ${Object.keys(moduleChecks).join(', ')}` },
        { status: 400 }
      );
    }

    // Run the check
    const result = await checkFunction();

    // Optionally persist the result
    // await persistHealthMetrics({ ... }); // Could add if needed

    return NextResponse.json({
      module: result.module,
      status: result.status,
      timestamp: result.timestamp.toISOString(),
      summary: result.summary,
      error: result.error,
      metrics: result.metrics.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      })),
    });

  } catch (error: any) {
    console.error(`Health check API error for module ${params.module}:`, error);
    return NextResponse.json(
      { error: 'Health check failed', message: error.message },
      { status: 500 }
    );
  }
}
