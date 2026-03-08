'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

/**
 * Checkout Success Page
 * User is redirected here after successful payment via Polar
 */
export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Optionally: fetch session status from Polar to confirm
    // For now, just show success message
    // Could also refresh user's subscription status

    // In a real app, you might verify the checkout session with Polar API
    // and then update local state accordingly.
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome aboard!
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          Your subscription is now active. You now have full access to all premium features.
        </p>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A confirmation email has been sent to your inbox.
          </p>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Session ID: {sessionId || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
