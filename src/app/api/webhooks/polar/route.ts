import { NextRequest, NextResponse } from 'next/server';
import { processPolarWebhook } from '@/lib/subscription-analytics';
import { env } from '@/lib/config';

/**
 * Polar Webhook Handler
 *
 * Configure this endpoint in your Polar webhook settings:
 * https://polar.sh/webhooks
 *
 * Events we handle:
 * - customer.created / updated
 * - subscription.created / updated / canceled / deleted
 * - invoice.created / updated / paid
 * - payment.succeeded / failed
 */

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-polar-signature') || request.headers.get('x-polar-webhook-signature') || '';

    // Verify webhook signature if secret is configured
    if (env.POLAR_WEBHOOK_SECRET && signature) {
      const expectedSignature = await verifyPolarSignature(body, env.POLAR_WEBHOOK_SECRET);
      if (signature !== expectedSignature) {
        console.error('Invalid Polar webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse the JSON payload
    const payload = JSON.parse(body);

    // Polar sends events in a format with event type
    // Consult Polar's webhook docs for exact structure
    const eventType = request.headers.get('x-polar-event') || payload.event_type || payload.type || 'unknown';

    console.log(`Received Polar webhook: ${eventType}`);

    // Process the event
    const result = await processPolarWebhook(eventType, payload);

    if (result.success) {
      return NextResponse.json({ received: true });
    } else {
      // Log error but return 200 to avoid retries (we already logged the event)
      // For permanent failures, you'd return 400/500 and Polar would retry
      return NextResponse.json(
        { received: true, warning: result.error },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error('Polar webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify Polar webhook signature
 * Polar uses HMAC-SHA256 with the webhook secret
 */
async function verifyPolarSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    encoder.encode(body)
  );
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return signatureHex;
}
