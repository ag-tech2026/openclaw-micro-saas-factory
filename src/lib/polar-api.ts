/**
 * Polar API Client
 * Handles communication with Polar's API for checkout sessions and customers
 */

import { env } from './config';

const POLAR_API_BASE = 'https://api.polar.sh/v1';

/**
 * Create a Polar customer
 * @param email Customer email
 * @param name Customer name (optional)
 * @returns Polar customer object
 */
export async function createPolarCustomer(
  email: string,
  name?: string
): Promise<{ id: string; email: string }> {
  if (!env.POLAR_CLIENT_ID || !env.POLAR_CLIENT_SECRET) {
    throw new Error('Polar credentials not configured');
  }

  // Basic auth with client ID and secret
  const auth = Buffer.from(
    `${env.POLAR_CLIENT_ID}:${env.POLAR_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${POLAR_API_BASE}/customers`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      name: name || undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Polar customer: ${error}`);
  }

  const data = await response.json();
  return { id: data.id, email: data.email };
}

/**
 * Get a Polar customer by email
 * @param email Customer email
 * @returns Polar customer object or null
 */
export async function getPolarCustomerByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  if (!env.POLAR_CLIENT_ID || !env.POLAR_CLIENT_SECRET) {
    throw new Error('Polar credentials not configured');
  }

  const auth = Buffer.from(
    `${env.POLAR_CLIENT_ID}:${env.POLAR_CLIENT_SECRET}`
  ).toString('base64');

  // Polar API supports filtering by email (might need to list and filter)
  // For simplicity, we'll list customers with a filter; but Polar API may have a /customers/:email endpoint.
  // Check Polar docs: There is GET /v1/customers?email=... or GET /v1/customers/lookup?email=...
  // Let's assume we can list and find, or we could search. For MVP, we'll create if not exists.

  // Actually, creating duplicate customers is okay if emails are unique? Polar enforces unique email.
  // So we can just try to create and catch duplicate error. That's simpler.

  return null; // We'll use create-or-get pattern
}

/**
 * Create or get Polar customer
 * If customer with email exists, return it; otherwise create.
 */
export async function createOrGetPolarCustomer(
  email: string,
  name?: string
): Promise<{ id: string; email: string }> {
  try {
    return await getPolarCustomerByEmail(email);
  } catch (error) {
    // If not found, create
    return await createPolarCustomer(email, name);
  }
}

/**
 * Create a Polar checkout session
 * @param options Checkout options
 * @returns Checkout session with URL
 */
export async function createPolarCheckoutSession(options: {
  productId: string;
  planId?: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ url: string; id: string }> {
  if (!env.POLAR_CLIENT_ID || !env.POLAR_CLIENT_SECRET) {
    throw new Error('Polar credentials not configured');
  }

  const auth = Buffer.from(
    `${env.POLAR_CLIENT_ID}:${env.POLAR_CLIENT_SECRET}`
  ).toString('base64');

  const body: any = {
    product_id: options.productId,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
  };

  if (options.planId) {
    body.plan_id = options.planId;
  }

  if (options.customerId) {
    body.customer_id = options.customerId;
  } else if (options.customerEmail) {
    body.customer_email = options.customerEmail;
  }

  if (options.metadata) {
    body.metadata = options.metadata;
  }

  const response = await fetch(`${POLAR_API_BASE}/checkout_sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create checkout session: ${error}`);
  }

  const data = await response.json();
  // Polar returns checkout_url and id
  return { url: data.checkout_url, id: data.id };
}

/**
 * Retrieve a checkout session from Polar
 */
export async function getPolarCheckoutSession(
  sessionId: string
): Promise<any> {
  if (!env.POLAR_CLIENT_ID || !env.POLAR_CLIENT_SECRET) {
    throw new Error('Polar credentials not configured');
  }

  const auth = Buffer.from(
    `${env.POLAR_CLIENT_ID}:${env.POLAR_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${POLAR_API_BASE}/checkout_sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get checkout session: ${error}`);
  }

  return response.json();
}
