#!/usr/bin/env node

/**
 * Sentry Connectivity Verification Script
 * 
 * Run this script to verify your Sentry configuration is working correctly.
 * This script attempts to initialize Sentry and send a test event.
 * 
 * Usage: node scripts/verify-sentry.js
 * 
 * Make sure your environment variables are set (in .env.local or shell).
 */

// Load .env if dotenv is available (optional)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, ignore
}

const Sentry = require('@sentry/nextjs');

// Check required environment variables
const requiredVars = ['SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease set these in your .env.local file or export them in your shell.');
  process.exit(1);
}

console.log('🔍 Verifying Sentry configuration...\n');

// Initialize Sentry with debug mode
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: true,
  debug: true,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Mark test events
    if (hint?.['test-event']) {
      event.tags = { ...event.tags, test: true };
    }
    return event;
  },
});

// Verify DSN format
let dsnString;
try {
  const dsn = new URL(process.env.SENTRY_DSN);
  dsnString = `${dsn.hostname}/${dsn.pathname}`;
  console.log(`✅ DSN looks valid: ${dsnString}`);
} catch (e) {
  console.error('❌ Invalid DSN format:', process.env.SENTRY_DSN);
  process.exit(1);
}

// Test capture exception
console.log('📤 Sending test exception to Sentry...');
try {
  throw new Error('SENTRY-VERIFICATION-TEST: This is a test error to verify connectivity.');
} catch (error) {
  Sentry.captureException(error, {
    tags: { verification: 'test' },
    extra: { timestamp: new Date().toISOString() },
    contexts: {
      verification: {
        source: 'verify-sentry.js',
        env: process.env.NODE_ENV,
      },
    },
  });
}

// Flush and close
Sentry.flush(5000).then(() => {
  console.log('\n✅ Test event sent successfully!');
  console.log('📊 Check your Sentry dashboard:');
  const baseUrl = process.env.SENTRY_DSN.replace(/\/.*$/, '');
  console.log(`   ${baseUrl}/organizations/${process.env.SENTRY_ORG}/issues/?project=${process.env.SENTRY_PROJECT}&query=test:true`);
  Sentry.close();
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed to send test event:', error.message);
  Sentry.close();
  process.exit(1);
});
