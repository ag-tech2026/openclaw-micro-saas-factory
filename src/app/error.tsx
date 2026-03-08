'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import { isErrorMonitoringEnabled } from '@/lib/config';

/**
 * Global error component for App Router
 * Renders when an unhandled error occurs in the app
 */
export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  React.useEffect(() => {
    if (isErrorMonitoringEnabled()) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          We apologize for the inconvenience. Our team has been notified and we're working on a fix.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <summary className="cursor-pointer font-semibold mb-2">
              Error Details (Dev Only)
            </summary>
            <pre className="text-sm text-red-600 dark:text-red-400 overflow-auto max-h-96">
              {error.toString()}
            </pre>
          </details>
        )}
        <button
          onClick={() => reset()}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}