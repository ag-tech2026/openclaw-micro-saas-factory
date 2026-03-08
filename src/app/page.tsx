'use client';

import { useEffect } from 'react';
import { useAnalytics } from '@/lib/analytics';

/**
 * Homepage with example analytics tracking
 */
export default function HomePage() {
  const { trackEvent, isEnabled } = useAnalytics();

  useEffect(() => {
    // Track initial pageview
    if (isEnabled()) {
      trackEvent('page_view', {
        path: window.location.pathname,
        title: document.title,
      });
    }
  }, [trackEvent, isEnabled]);

  const handleCTAClick = () => {
    trackEvent('button_click', {
      button_name: 'get_started',
      location: 'hero',
    });
  };

  const handleSignupClick = () => {
    trackEvent('conversion', {
      type: 'signup',
      method: 'email',
      source: 'hero',
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            MVP Boilerplate
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            A production-ready Next.js boilerplate with environment configuration,
            error monitoring, analytics, and comprehensive documentation.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={handleCTAClick}
              className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Get started
            </button>
            <button
              onClick={handleSignupClick}
              className="text-sm font-semibold leading-6 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 px-3.5 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Sign up for updates
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-8 bg-white dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Environment Config
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Type-safe environment variable loading and validation with Zod.
              Clear error messages for missing or invalid configuration.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-8 bg-white dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Error Monitoring
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Integrated Sentry for production error tracking with global error
              boundaries for both client and server-side errors.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-8 bg-white dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Privacy-Friendly Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Built-in support for Plausible Analytics with easy event tracking
              for conversions and user interactions.
            </p>
          </div>
        </div>

        {/* Analytics Status */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analytics: {isEnabled() ? (
              <span className="text-green-600 dark:text-green-400">Enabled</span>
            ) : (
              <span className="text-yellow-600 dark:text-yellow-400">Disabled (no domain configured)</span>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}