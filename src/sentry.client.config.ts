import * as Sentry from '@sentry/nextjs';
import { setupAutomaticBreadcrumbs } from '@/lib/sentry-breadcrumbs';

/**
 * Sentry Client Configuration
 * This file is used by @sentry/nextjs to configure the client-side integration
 */
export const config = {
  // Indicates that the file should be executed in the client environment
  runtime: 'edge' as const,
};

/**
 * Initialize Sentry on the client with performance monitoring
 * This function is called automatically by @sentry/nextjs
 */
export async function init() {
  await Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    enabled: process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING === 'true' || process.env.ENABLE_ERROR_MONITORING === 'true',
    // Performance monitoring - 10% of transactions by default
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
    // Before sending event, add additional context
    beforeSend(event, hint) {
      // Add client-specific context
      event.tags = {
        ...event.tags,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        env: process.env.NODE_ENV,
      };
      return event;
    },
  });

  // Add global error handlers
  if (typeof window !== 'undefined') {
    // Capture unhandled rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason, {
        extra: {
          promise: event.promise,
        },
      });
    });

    // Capture uncaught errors (backup to error boundary)
    window.addEventListener('error', (event) => {
      Sentry.captureException(event.error, {
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Setup automatic breadcrumbs for user actions
    setupAutomaticBreadcrumbs();
  }
}

/**
 * Helper to add client-side breadcrumbs manually
 */
export function addClientBreadcrumb(
  message: string,
  category: 'ui.click' | 'navigation' | 'http' | 'default' = 'default',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}