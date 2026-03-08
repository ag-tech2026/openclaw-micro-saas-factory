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