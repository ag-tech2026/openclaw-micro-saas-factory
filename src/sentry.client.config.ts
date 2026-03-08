import * as Sentry from '@sentry/nextjs';

/**
 * Sentry Client Configuration
 * This file is used by @sentry/nextjs to configure the client-side integration
 */
export const config = {
  // Indicates that the file should be executed in the client environment
  runtime: 'edge' as const, // or 'nodejs' depending on your runtime
};

/**
 * Initialize Sentry on the client
 */
export default function initSentry() {
  if (typeof window !== 'undefined') {
    // You can configure additional client-side settings here
    // For example:
    // Sentry.setTag('environment', process.env.NODE_ENV);
  }
}