import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { analytics } from '@/lib/analytics';

/**
 * Example API route demonstrating:
 * - Error monitoring with Sentry
 * - Server-side analytics tracking
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const message = searchParams.get('message') || 'Hello from API';

  return NextResponse.json({
    message,
    timestamp: new Date().toISOString(),
    status: 'ok',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Simulate some processing
    const result = await processSubscription(body);

    // Track conversion server-side
    await analytics.sendManualEvent('subscription', {
      type: 'newsletter',
      email_domain: body.email.split('@')[1],
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription created',
      data: result,
    });
  } catch (error) {
    // Capture error in Sentry
    Sentry.captureException(error, {
      tags: { api: 'subscribe' },
      extra: { requestBody: await request.text() },
    });

    // Also track the error in analytics
    await analytics.sendManualEvent('error', {
      type: 'api_error',
      path: request.url,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processSubscription(data: any) {
  // Simulate async processing
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: Math.random().toString(36).substring(7),
        email: data.email,
        createdAt: new Date().toISOString(),
      });
    }, 100);
  });
}