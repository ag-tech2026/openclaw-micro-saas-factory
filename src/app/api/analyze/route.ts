import { NextRequest, NextResponse } from 'next/server';
import { inngest, EVENTS } from '@/lib/inngest';
import { env } from '@/lib/config';

/**
 * API route to trigger async vision analysis
 *
 * POST /api/analyze
 * Body: {
 *   imageUrl: string;        // Required: URL of the image to analyze
 *   prompt?: string;         // Optional: Custom prompt (uses default if omitted)
 *   requestId?: string;      // Optional: Custom request ID (auto-generated if omitted)
 *   batch?: false;           // Optional: Set to true for batch processing with multiple URLs
 *   imageUrls?: string[];    // Required if batch=true: Array of image URLs
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { imageUrl, imageUrls, prompt, requestId, batch = false } = body;

    // Validate input
    if (batch) {
      if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        return NextResponse.json(
          { error: 'imageUrls array is required for batch processing' },
          { status: 400 }
        );
      }
    } else {
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'imageUrl is required' },
          { status: 400 }
        );
      }
    }

    // Generate unique request ID if not provided
    const uniqueRequestId = requestId || `vision-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Prepare event payload
    const eventData = {
      requestId: uniqueRequestId,
      prompt: prompt || null, // null means use default in function
      timestamp: new Date().toISOString(),
      sourceUrl: request.headers.get('origin') || request.headers.get('referer') || 'unknown',
      ...(batch ? { imageUrls } : { imageUrl }),
    };

    // Determine which function to trigger
    const functionId = batch ? 'batch-process-vision-analysis' : 'process-vision-analysis';

    // Send event to Inngest
    const result = await inngest.send({
      name: batch ? EVENTS.VISION_ANALYSIS_REQUESTED : EVENTS.VISION_ANALYSIS_REQUESTED,
      data: eventData,
      // This ensures the event is routed to the correct function
      fnId: functionId,
    });

    return NextResponse.json({
      success: true,
      message: batch ? 'Batch analysis queued' : 'Analysis queued',
      requestId: uniqueRequestId,
      function: functionId,
      enqueuedAt: new Date().toISOString(),
      // Inngest event ID for tracking
      eventId: result.id,
      // Provide a way to check status later
      statusUrl: `/api/analyze/status/${uniqueRequestId}`,
    }, { status: 202 }); // 202 Accepted

  } catch (error) {
    console.error('Analyze API error:', error);

    // Track error with Sentry if available
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(error, {
        tags: { api: 'analyze' },
        extra: { body: await request.text() },
      });
    } catch (sentryError) {
      console.error('Failed to capture error in Sentry:', sentryError);
    }

    return NextResponse.json(
      {
        error: 'Failed to queue analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
