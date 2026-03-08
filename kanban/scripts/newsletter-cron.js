/**
 * Newsletter Cron Service
 *
 * This runs a cron job to automatically send the weekly digest.
 * Run this in a separate terminal or as a background service.
 *
 * Usage:
 *   node scripts/newsletter-cron.js
 *
 * The schedule is set to every Monday at 9:00 AM UTC by default.
 * Adjust the cron expression as needed.
 */

import cron from 'node-cron';
import { sendNewsletter } from './send-newsletter.js';

// Run weekly on Monday at 9:00 AM UTC
const schedule = '0 9 * * 1';

console.log(`📅 Newsletter cron started. Schedule: ${schedule} (UTC)`);

const job = cron.schedule(schedule, async () => {
  console.log('\n⏰ Scheduled newsletter run triggered');
  try {
    await sendNewsletter();
  } catch (error) {
    console.error('Scheduled run failed:', error);
  }
}, {
  timezone: 'UTC',
});

job.on('error', (error) => {
  console.error('Cron job error:', error);
});

console.log(' newsletter cron service is running...');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping newsletter cron...');
  job.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping newsletter cron...');
  job.stop();
  process.exit(0);
});
