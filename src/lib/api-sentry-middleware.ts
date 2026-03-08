import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Middleware to add Sentry breadcrumbs for incoming API requests
 * 
 * Usage in API route:
 *   import { withSentryBreadcrumbs } from '@/lib/api-sentry-middleware';
 *   export const GET = withSentryBreadcrumbs(async (req) => { ... });
 *   export const POST = withSentryBreadcrumbs(async (req) => { ... });
 */

export interface ApiHandler<T extends (...args: any[]) => any> {
  (req: NextRequest, ...args: any[]): Promise<ReturnType<T>>;
}

/**
 * Wrap an API route handler to automatically add breadcrumbs for requests
 */
export function withSentryBreadcrumbs<T extends (...args: any[]) => any>(
  handler: T
): ApiHandler<T> {
  return async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const url = req.url || '';
    const method = req.method;

    try {
      const response = await handler(req, ...args);
      const duration = Date.now() - startTime;

      // Add breadcrumb for successful request
      Sentry.addBreadcrumb({
        message: `${method} ${url}`,
        category: 'http',
        level: 'info',
        data: {
          url,
          method,
          statusCode: (response as any).status || (response as any).statusCode,
          responseTimeMs: duration,
        },
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Add breadcrumb for failed request
      Sentry.addBreadcrumb({
        message: `${method} ${url}`,
        category: 'http',
        level: 'error',
        data: {
          url,
          method,
          error: error instanceof Error ? error.message : String(error),
          responseTimeMs: duration,
        },
      });

      throw error;
    }
  };
}

/**
 * Utility to add custom breadcrumbs in API routes without wrapper
 */
export function addApiRequestBreadcrumb(
  req: NextRequest,
  statusCode: number,
  responseTimeMs?: number
) {
  Sentry.addBreadcrumb({
    message: `${req.method} ${req.url}`,
    category: 'http',
    level: statusCode >= 400 ? 'error' : 'info',
    data: {
      url: req.url,
      method: req.method,
      statusCode,
      responseTimeMs,
    },
  });
}
