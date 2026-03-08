import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import fs from 'fs';
import path from 'path';

// Helper function to get recent completed MVPs from AUTONOMOUS.md
function getRecentMvPs(days: number = 7) {
  try {
    // Find AUTONOMOUS.md by searching upward from current directory
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

    // Look for done tasks in the last few days
    const recentMvps: Array<{ title: string; description: string; url?: string }> = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Simple heuristic: tasks in "## Recently Completed" section that have been marked done
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
          const title = match[1].trim();
          // In a real system, we'd have dates. For now, include all done items
          recentMvps.push({
            title,
            description: 'Completed MVP project from autonomous task list.',
            url: '#', // Could link to a project page
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

export async function POST() {
  try {
    const subscribers = await db.getActiveSubscribers();
    const recentMvps = getRecentMvPs(7);

    // Create unsubscribe URLs for each subscriber
    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    let successCount = 0;
    let failCount = 0;

    // Send to all active subscribers (consider rate limiting in production)
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
      } else {
        console.error(`Failed to send to ${subscriber.email}:`, result.error);
        failCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      success: true,
      message: 'Newsletter sent',
      total: subscribers.length,
      successCount,
      failed: failCount,
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return NextResponse.json(
      { error: 'Failed to send newsletter' },
      { status: 500 }
    );
  }
}
