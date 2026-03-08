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
