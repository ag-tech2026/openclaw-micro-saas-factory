/**
 * Weekly Newsletter Scheduler
 *
 * This script sends the weekly digest to all active subscribers.
 * It should be run on a schedule (e.g., every Monday at 9 AM).
 *
 * Usage:
 *   node scripts/send-newsletter.js
 *
 * For production, set up a cron job or use a scheduler like:
 * - Vercel Cron Jobs
 * - GitHub Actions (workflow_dispatch or schedule)
 * - AWS EventBridge
 * - Railway Cron
 */

import { db } from '../lib/db';
import { sendEmail, emailTemplates } from '../lib/email';
import fs from 'fs';
import path from 'path';

// Helper function to get recent MVPs from AUTONOMOUS.md
function getRecentMvPs(days: number = 7) {
  try {
    let dir = process.cwd();
    let autonomousPath: string | null = null;
    for (let i = 0; i < 5; i++) {
      const testPath = path.join(dir, 'AUTONOMOUS.md');
      if (fs.existsSync(testPath)) {
        autonomousPath = testPath;
        break;
      }
      dir = path.join(dir, '..');
    }
    if (!autonomousPath) {
      return [];
    }

    const content = fs.readFileSync(autonomousPath, 'utf-8');
    const lines = content.split('\n');
    const recentMvps: Array<{ title: string; description: string; url?: string }> = [];

    // Look for done tasks in the recently completed section
    let inDoneSection = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '## Recently Completed') {
        inDoneSection = true;
        continue;
      }
      if (line.startsWith('##') && inDoneSection) {
        inDoneSection = false;
        break;
      }

      if (inDoneSection && line.startsWith('- [')) {
        const match = line.match(/^-\s*\[x\]\s+(.+)$/);
        if (match) {
          recentMvps.push({
            title: match[1].trim(),
            description: 'Completed MVP project from autonomous task list.',
            url: '#',
          });
        }
      }
    }

    return recentMvps;
  } catch (error) {
    console.error('Error reading AUTONOMOUS.md:', error);
    return [];
  }
}

async function sendNewsletter() {
  console.log('Starting newsletter dispatch...');

  try {
    // Initialize DB first
    await db.init();

    const subscribers = await db.getActiveSubscribers();
    const recentMvps = getRecentMvPs(7);

    console.log(`Found ${subscribers.length} active subscribers`);
    console.log(`Including ${recentMvps.length} recent MVPs in digest`);

    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let successCount = 0;
    let failCount = 0;

    for (const subscriber of subscribers) {
      const unsubscribeUrl = `${origin}/api/unsubscribe?email=${encodeURIComponent(subscriber.email)}`;
      const template = emailTemplates.weeklyDigest(
        subscriber.email,
        unsubscribeUrl,
        recentMvps.length,
        recentMvps
      );

      const result = await sendEmail(subscriber.email, template);

      if (result.success) {
        successCount++;
        console.log(`✓ Sent to ${subscriber.email}`);
      } else {
        failCount++;
        console.error(`✗ Failed to send to ${subscriber.email}:`, result.error);
      }

      // Rate limiting: 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\nNewsletter completed!');
    console.log(`Total: ${subscribers.length}, Success: ${successCount}, Failed: ${failCount}`);

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  sendNewsletter();
}

export { sendNewsletter };
