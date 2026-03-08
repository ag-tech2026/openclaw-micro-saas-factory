import * as Sentry from '@sentry/nextjs';

/**
 * Sentry Server Configuration
 * This file is executed on the server during server-side rendering and API routes
 */

/**
 * Configure Sentry for server-side
 */
export const config = {
  // Indicates that the file should be executed in the server environment
  runtime: 'nodejs' as const,
};

/**
 * Initialize Sentry on the server with performance monitoring
 * This function is called automatically by @sentry/nextjs
 */
export async function init() {
  await Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: process.env.ENABLE_ERROR_MONITORING === 'true',
    // Performance monitoring - 10% of transactions by default
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    // Send user IP and country
    sendDefaultPii: true,
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
    // Before sending event, add additional context
    beforeSend(event, hint) {
      // Add server-specific context
      event.tags = {
        ...event.tags,
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV,
      };
      return event;
    },
  });
}

/**
 * Add server-specific context to Sentry errors
 */
export function addServerContext(user?: { id: string; email?: string }) {
  if (user) {
    Sentry.setUser(user);
  } else {
    Sentry.setUser(null);
  }

  Sentry.setTags({
    nodeVersion: process.version,
    platform: process.platform,
    env: process.env.NODE_ENV,
  });
}

/**
 * Add breadcrumb for server-side events
 */
export function addServerBreadcrumb(
  message: string,
  category: string = 'default',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}