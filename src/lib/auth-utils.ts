import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sessions, users, customers, subscriptions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get the current authenticated user from a request
 * Returns null if not authenticated
 */
export async function getCurrentUser(request: NextRequest): Promise<any | null> {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get('better-auth.session');

    if (!sessionCookie?.value) {
      return null;
    }

    // The session ID is stored in the cookie value (BetterAuth uses session token)
    // We need to find the session by its ID (the cookie value is the session ID)
    // Actually, BetterAuth stores session token as the cookie value which is the session ID (UUID)
    const sessionId = sessionCookie.value;

    // Look up session in database
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || user.banned) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current user's subscription status
 * Returns true if user has an active subscription
 */
export async function getSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    // Find the customer linked to this user
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);

    if (!customer) {
      return false;
    }

    // Check for active subscriptions
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.customerId, customer.id),
          eq(subscriptions.status, 'active')
        )
      )
      .limit(1);

    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

/**
 * Require authentication middleware
 * Throws error if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<any> {
  const user = await getCurrentUser(request);

  if (!user) {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('callbackUrl', request.url);
    throw new Response('Unauthorized', {
      status: 401,
      headers: {
        Location: url.toString(),
        'Content-Type': 'text/plain',
      },
    });
  }

  return user;
}

/**
 * Require admin middleware
 * Throws error if user is not an admin
 */
export async function requireAdmin(request: NextRequest): Promise<any> {
  const user = await requireAuth(request);

  if (user.role !== 'admin') {
    throw new Response('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return user;
}

/**
 * Require active subscription middleware
 * Throws error if user doesn't have an active subscription
 */
export async function requireSubscription(request: NextRequest): Promise<any> {
  const user = await requireAuth(request);

  const hasSubscription = await getSubscriptionStatus(user.id);

  if (!hasSubscription) {
    throw new Response('Subscription required', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return user;
}
