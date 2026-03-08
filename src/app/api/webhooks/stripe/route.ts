import { NextRequest, NextResponse } from 'next/server';
import { processStripeWebhook } from '@/lib/subscription-analytics';
import { env } from '@/lib/config';

/**
 * Stripe Webhook Handler
 *
 * Configure this endpoint in your Stripe webhook settings:
 * https://dashboard.stripe.com/webhooks
 *
 * Events we handle:
 * - customer.created / updated
 * - subscription.created / updated / deleted
 * - invoice.paid / payment_failed
 * - payment_intent.succeeded / payment_intent.payment_failed
 */

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Get Stripe signature header
    const signature = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature') || '';

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(body);
    } catch (err) {
      console.error('Failed to parse Stripe webhook body as JSON:', err);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    let eventType: string;
    let eventData: Record<string, any>;
    let eventId: string;

    // If secret is set, verify signature to get the event
    if (env.STRIPE_WEBHOOK_SECRET && signature) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(env.STRIPE_WEBHOOK_SECRET, {
          apiVersion: '2023-10-16',
        });
        const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
        eventType = event.type;
        eventData = event.data.object as Record<string, any>;
        eventId = event.id;
      } catch (err: any) {
        console.error('Stripe signature verification failed:', err.message);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (!env.STRIPE_WEBHOOK_SECRET) {
      console.warn('STRIPE_WEBHOOK_SECRET not set; skipping signature verification (dev mode)');
      eventType = parsedBody.type || '';
      eventData = parsedBody.data?.object || {};
      eventId = parsedBody.id || '';
    } else {
      console.error('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    console.log(`Received Stripe webhook: ${eventType}`);

    // Process the event
    const result = await processStripeWebhook(eventType, eventData, eventId);

    if (result.success) {
      return NextResponse.json({ received: true });
    } else {
      // Log error but return 200 to avoid retries for non-critical errors
      // For permanent failures, you could return 400/500 to trigger Stripe retry
      return NextResponse.json(
        { received: true, warning: result.error },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
