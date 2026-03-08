import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createPolarCheckoutSession, createPolarCustomer } from '@/lib/polar-api';

/**
 * Checkout API endpoint
 *
 * POST /api/checkout
 * Creates a Polar checkout session for the authenticated user
 *
 * Query params or JSON body:
 * - productId: Polar product ID (required)
 * - planId: (alternative) Polar plan ID if product has multiple plans
 *
 * Returns: { checkoutUrl: string }
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await requireAuth(request);

    // 2. Get product and plan IDs from body
    const body = await request.json();
    const { productId, planId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // 3. Ensure user has a Polar customer ID
    let polarCustomerId = user.polarCustomerId;

    if (!polarCustomerId) {
      // Create Polar customer
      try {
        const customer = await createPolarCustomer(user.email, user.name);
        polarCustomerId = customer.id;

        // Save to user record
        await db
          .update(users)
          .set({ polarCustomerId })
          .where(eq(users.id, user.id));
      } catch (error: any) {
        console.error('Failed to create Polar customer:', error);
        return NextResponse.json(
          { error: 'Failed to set up payment profile' },
          { status: 500 }
        );
      }
    }

    // 4. Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/checkout/success?session_id={checkout_session_id}`;
    const cancelUrl = `${baseUrl}/checkout/cancel`;

    // 5. Create Polar checkout session
    try {
      const checkoutSession = await createPolarCheckoutSession({
        productId,
        planId: planId, // optional
        customerId: polarCustomerId,
        successUrl,
        cancelUrl,
        metadata: {
          userId: user.id,
          userEmail: user.email,
        },
      });

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    } catch (error: any) {
      console.error('Failed to create checkout session:', error);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
