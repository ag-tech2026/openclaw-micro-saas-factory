/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: true,
  // swcMinify is deprecated in Next.js 15 (Turbopack uses its own minification)
  // Environment variables available at build time
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    // Expose Sentry release for source maps
    SENTRY_RELEASE: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_URL || 'development',
  },
};

const moduleExports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Automatically upload source maps during build
  widenClientFileUpload: true,
  // Silent mode (set to false to see upload logs)
  silent: false,
  // Release name - use git SHA on Vercel or fallback
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_URL,
});

module.exports = moduleExports;