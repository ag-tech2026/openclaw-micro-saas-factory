import { inngest } from '@/lib/inngest';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Inngest webhook handler
 *
 * This endpoint receives events from Inngest and triggers background functions.
 * Do not call this directly from your application.
 */
export const POST = async (req: NextRequest) => {
  try {
    // Call the Inngest SDK's handler
    const result = await inngest.handle({
      // Inngest's request body parsing
      body: req.body,
      // Function registry - all functions to expose
      functions: [
        // Import functions dynamically to avoid circular dependencies
        (await import('@/lib/inngest/functions')).processVisionAnalysis,
        (await import('@/lib/inngest/functions')).batchProcessVisionAnalysis,
        (await import('@/lib/inngest/functions')).generateSocialMediaForMvp,
        (await import('@/lib/inngest/functions')).scheduleSocialPost,
        // Priority queue job processor
        (await import('@/lib/inngest/functions')).processPriorityJob,
        (await import('@/lib/inngest/functions')).priorityQueueStatsReporter,
        // Dunning and payment retry functions
        (await import('@/lib/inngest/dunning')).initiatePaymentRetry,
        (await import('@/lib/inngest/dunning')).executePaymentRetry,
        (await import('@/lib/inngest/dunning')).processSuccessfulPayment,
        (await import('@/lib/inngest/dunning')).processDueRetries,
        // Audit retention and archiving
        (await import('@/lib/inngest/audit-retention')).archiveAuditLogs,
        (await import('@/lib/inngest/audit-retention')).triggerAuditArchiveNow,
        // Email DLQ retry
        (await import('@/lib/inngest/email-dlq')).emailDlqRetry,
        // Health monitoring
        (await import('@/lib/inngest/health')).healthCollector,
        (await import('@/lib/inngest/health')).manualHealthCheck,
        (await import('@/lib/inngest/health')).acknowledgeAlert,
      ],
      // Enable event persistence verification
      // This ensures events are only processed once
      eventVerification: {
        // Requires INNGEST_SIGNING_KEY in production
        // In development, you can disable or use a dummy key
        signingKey: process.env.INNGEST_SIGNING_KEY,
      },
      // Process from priority queue on a schedule
      // This worker runs frequently to keep queue moving
      scheduled: {
        // Stats reporter that runs every 30 seconds
        // '*/30 * * * * * *' = every 30 seconds
        'priority-queue-stats-reporter': '*/30 * * * * * *',
        // Health collector runs every 5 minutes
        // '*/5 * * * *' = every 5 minutes
        'health-collector': '*/5 * * * *',
        // Audit log archiver runs daily at 2 AM (server off-peak)
        // '0 2 * * *' = at 2:00 AM every day
        'archive-audit-logs': '0 2 * * *',
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Inngest handler error:', error);
    return NextResponse.json(
      { error: 'Inngest handler failed', message: String(error) },
      { status: 500 }
    );
  }
};
