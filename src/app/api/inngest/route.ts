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
        // Dunning and payment retry functions
        (await import('@/lib/inngest/dunning')).initiatePaymentRetry,
        (await import('@/lib/inngest/dunning')).executePaymentRetry,
        (await import('@/lib/inngest/dunning')).processSuccessfulPayment,
        (await import('@/lib/inngest/dunning')).processDueRetries,
      ],
      // Enable event persistence verification
      // This ensures events are only processed once
      eventVerification: {
        // Requires INNGEST_SIGNING_KEY in production
        // In development, you can disable or use a dummy key
        signingKey: process.env.INNGEST_SIGNING_KEY,
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
