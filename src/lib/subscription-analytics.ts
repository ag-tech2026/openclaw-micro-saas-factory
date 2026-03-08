/**
 * Subscription Analytics Utilities
 * Handles processing of subscription events from Stripe and Polar
 * with idempotency guarantees.
 */

import { subscriptionDb } from './subscription-db';

/**
 * Check if a webhook event has already been processed
 */
export async function isEventProcessed(source: string, providerEventId: string): Promise<boolean> {
  const eventId = `${source}_${providerEventId}`;
  const result = await subscriptionDb.query(
    'SELECT 1 FROM subscription_events WHERE id = $1 AND processed = TRUE LIMIT 1',
    [eventId]
  );
  return result.rows.length > 0;
}

/**
 * Log a webhook event for audit/debugging
 * If providerEventId is provided, it is used to construct a deterministic ID for idempotency.
 * Returns the ID of the inserted event record.
 */
export async function logEvent(
  type: string,
  source: string,
  data: Record<string, any>,
  providerEventId?: string,
  processed: boolean = false,
  error?: string
): Promise<string> {
  const id = providerEventId ? `${source}_${providerEventId}` : `evt_${crypto.randomUUID()}`;
  await subscriptionDb.query(`
    INSERT INTO subscription_events (id, type, source, data, processed, error, created_at, processed_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
    ON CONFLICT (id) DO NOTHING
  `, [
    id,
    type,
    source,
    JSON.stringify(data),
    processed,
    error || null,
    processed ? new Date() : null,
  ]);
  return id;
}

/**
 * Mark an event as processed by its ID (deterministic or random)
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  await subscriptionDb.query(
    'UPDATE subscription_events SET processed = TRUE, processed_at = NOW() WHERE id = $1',
    [eventId]
  );
}

// ============================================================================
// Shared Data Upsertion
// ============================================================================

/**
 * Upsert a customer from webhook data
 * Also attempts to link to BetterAuth user by email
 */
export async function upsertCustomer(customer: {
  id: string;
  email: string;
  name?: string;
  status?: string;
}): Promise<void> {
  let userId: string | null = null;
  try {
    const userResult = await subscriptionDb.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [customer.email]
    );
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    }
  } catch (error) {
    console.log('Users table not accessible or no user found for email:', customer.email);
  }

  await subscriptionDb.query(`
    INSERT INTO customers (id, email, name, status, user_id, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        user_id = EXCLUDED.user_id,
        updated_at = NOW()
  `, [customer.id, customer.email, customer.name || null, customer.status || 'active', userId]);
}

/**
 * Upsert a subscription from webhook data
 */
export async function upsertSubscription(subscription: {
  id: string;
  customer_id: string;
  plan_id: string;
  plan_name?: string;
  billing_interval?: string;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  canceled_at?: Date;
  metadata?: Record<string, any>;
}): Promise<void> {
  await subscriptionDb.query(`
    INSERT INTO subscriptions (id, customer_id, plan_id, plan_name, billing_interval, status, current_period_start, current_period_end, canceled_at, metadata, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (id) DO UPDATE
    SET customer_id = EXCLUDED.customer_id,
        plan_id = EXCLUDED.plan_id,
        plan_name = EXCLUDED.plan_name,
        billing_interval = EXCLUDED.billing_interval,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        canceled_at = EXCLUDED.canceled_at,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
  `, [
    subscription.id,
    subscription.customer_id,
    subscription.plan_id,
    subscription.plan_name || null,
    subscription.billing_interval || null,
    subscription.status,
    subscription.current_period_start,
    subscription.current_period_end,
    subscription.canceled_at || null,
    subscription.metadata ? JSON.stringify(subscription.metadata) : null,
  ]);
}

/**
 * Upsert an invoice from webhook data
 */
export async function upsertInvoice(invoice: {
  id: string;
  customer_id: string;
  subscription_id?: string;
  number?: string;
  status: string;
  amount_due: number;
  amount_paid?: number;
  currency?: string;
  due_date?: Date;
  paid_at?: Date;
}): Promise<void> {
  await subscriptionDb.query(`
    INSERT INTO invoices (id, customer_id, subscription_id, number, status, amount_due, amount_paid, currency, due_date, paid_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (id) DO UPDATE
    SET customer_id = EXCLUDED.customer_id,
        subscription_id = EXCLUDED.subscription_id,
        number = EXCLUDED.number,
        status = EXCLUDED.status,
        amount_due = EXCLUDED.amount_due,
        amount_paid = EXCLUDED.amount_paid,
        currency = EXCLUDED.currency,
        due_date = EXCLUDED.due_date,
        paid_at = EXCLUDED.paid_at
  `, [
    invoice.id,
    invoice.customer_id,
    invoice.subscription_id || null,
    invoice.number || null,
    invoice.status,
    invoice.amount_due,
    invoice.amount_paid || 0,
    invoice.currency || 'usd',
    invoice.due_date || null,
    invoice.paid_at || null,
  ]);
}

/**
 * Record a payment from webhook data
 */
export async function upsertPayment(payment: {
  id: string;
  customer_id: string;
  invoice_id?: string;
  amount: number;
  currency?: string;
  status: string;
  payment_method_type?: string;
}): Promise<void> {
  await subscriptionDb.query(`
    INSERT INTO payments (id, customer_id, invoice_id, amount, currency, status, payment_method_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE
    SET customer_id = EXCLUDED.customer_id,
        invoice_id = EXCLUDED.invoice_id,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        payment_method_type = EXCLUDED.payment_method_type
  `, [
    payment.id,
    payment.customer_id,
    payment.invoice_id || null,
    payment.amount,
    payment.currency || 'usd',
    payment.status,
    payment.payment_method_type || null,
  ]);
}

// ============================================================================
// Polar Webhook Processing
// ============================================================================

/**
 * Process a Polar webhook event
 */
export async function processPolarWebhook(eventType: string, payload: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract event ID for idempotency (Polar includes 'id' field)
    const providerEventId = payload.id || payload.event_id || payload.eventId;
    if (!providerEventId) {
      console.warn('Polar webhook missing event ID; idempotency not guaranteed');
    }

    // Check if already processed
    if (providerEventId && await isEventProcessed('polar', providerEventId)) {
      console.log(`Polar event ${providerEventId} already processed, skipping`);
      return { success: true };
    }

    // Log the raw event (with providerEventId if available)
    const eventRecordId = await logEvent(eventType, 'polar', payload, providerEventId, false);

    // Process based on event type
    const eventData = payload as any;
    let processed = false;

    try {
      switch (eventType) {
        case 'customer.created':
        case 'customer.updated': {
          const customer = eventData.customer || eventData;
          await upsertCustomer({
            id: customer.id,
            email: customer.email,
            name: customer.name,
            status: customer.status,
          });
          processed = true;
          break;
        }

        case 'subscription.created':
        case 'subscription.updated': {
          const sub = eventData.subscription || eventData;
          if (sub.customer) {
            await upsertCustomer({
              id: sub.customer.id,
              email: sub.customer.email,
              name: sub.customer.name,
            });
          }
          await upsertSubscription({
            id: sub.id,
            customer_id: sub.customer_id || sub.customer?.id,
            plan_id: sub.plan_id || sub.plan?.id,
            plan_name: sub.plan?.name || sub.plan_name,
            billing_interval: sub.billing_interval,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start),
            current_period_end: new Date(sub.current_period_end),
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at) : undefined,
            metadata: sub.metadata,
          });
          processed = true;
          break;
        }

        case 'subscription.canceled':
        case 'subscription.deleted': {
          const sub = eventData.subscription || eventData;
          await upsertSubscription({
            id: sub.id,
            customer_id: sub.customer_id,
            plan_id: sub.plan_id,
            status: 'canceled',
            current_period_start: new Date(sub.current_period_start),
            current_period_end: new Date(sub.current_period_end),
            canceled_at: new Date(),
          });
          processed = true;
          break;
        }

        case 'invoice.created':
        case 'invoice.updated': {
          const inv = eventData.invoice || eventData;
          if (inv.customer) {
            await upsertCustomer({
              id: inv.customer.id,
              email: inv.customer.email,
              name: inv.customer.name,
            });
          }
          await upsertInvoice({
            id: inv.id,
            customer_id: inv.customer_id || inv.customer?.id,
            subscription_id: inv.subscription_id || inv.subscription?.id,
            number: inv.number,
            status: inv.status,
            amount_due: inv.amount_due / 100,
            amount_paid: inv.amount_paid / 100,
            currency: inv.currency,
            due_date: inv.due_date ? new Date(inv.due_date) : undefined,
            paid_at: inv.paid_at ? new Date(inv.paid_at) : undefined,
          });
          processed = true;
          break;
        }

        case 'invoice.paid': {
          const inv = eventData.invoice || eventData;
          await upsertInvoice({
            id: inv.id,
            customer_id: inv.customer_id,
            status: 'paid',
            amount_due: inv.amount_due / 100,
            amount_paid: inv.amount_paid / 100,
            paid_at: new Date(inv.paid_at || inv.created_at),
          });
          processed = true;
          break;
        }

        case 'payment.succeeded':
        case 'payment.failed': {
          const payment = eventData.payment || eventData;
          await upsertPayment({
            id: payment.id,
            customer_id: payment.customer_id,
            invoice_id: payment.invoice_id,
            amount: payment.amount / 100,
            status: eventType === 'payment.succeeded' ? 'succeeded' : 'failed',
            payment_method_type: payment.payment_method?.type,
          });
          processed = true;

          if (eventType === 'payment.failed') {
            // Trigger payment retry process
            try {
              const { inngest } = await import('@/lib/inngest');
              await inngest.send('payment/failed', {
                invoiceId: payment.invoice_id || null,
                customerId: payment.customer_id,
                subscriptionId: null, // Will be looked up from invoice
                amount: payment.amount / 100,
                currency: payment.currency || 'usd',
                provider: 'polar',
                eventId: providerEventId || undefined,
              });
              console.log(`Triggered payment retry for Polar payment ${payment.id}`);
            } catch (err) {
              console.error('Failed to trigger retry initiation:', err);
            }
          } else if (eventType === 'payment.succeeded') {
            // Trigger successful payment processing (clear dunning)
            try {
              const { inngest } = await import('@/lib/inngest');
              await inngest.send('payment/succeeded', {
                invoiceId: payment.invoice_id || null,
                customerId: payment.customer_id,
                subscriptionId: null,
                amount: payment.amount / 100,
                currency: payment.currency || 'usd',
              });
              console.log(`Triggered successful payment processing for Polar payment ${payment.id}`);
            } catch (err) {
              console.error('Failed to trigger successful payment processing:', err);
            }
          }
          break;
        }

        default:
          console.log(`Unhandled Polar event type: ${eventType}`);
          // Still mark as processed since we logged it
          processed = true;
      }

      if (processed && providerEventId) {
        await markEventProcessed(eventRecordId);
      } else if (processed) {
        // If no providerEventId, update by random ID
        await subscriptionDb.query(
          'UPDATE subscription_events SET processed = TRUE, processed_at = NOW() WHERE id = $1',
          [eventRecordId]
        );
      }

      return { success: true };
    } catch (processingError: any) {
      // Log error to the event record
      await subscriptionDb.query(
        'UPDATE subscription_events SET error = $1 WHERE id = $2',
        [processingError.message, eventRecordId]
      );
      throw processingError;
    }
  } catch (error: any) {
    console.error('Failed to process Polar webhook:', error);
    // Ensure we have a log entry for the failure
    if (!error.message.includes('already processed')) {
      await logEvent(eventType, 'polar', payload, undefined, false, error.message);
    }
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Stripe Webhook Processing
// ============================================================================

/**
 * Process a Stripe webhook event
 * Assumes event ID has been extracted and signature verified.
 */
export async function processStripeWebhook(
  eventType: string,
  eventData: Record<string, any>,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already processed
    if (await isEventProcessed('stripe', eventId)) {
      console.log(`Stripe event ${eventId} already processed, skipping`);
      return { success: true };
    }

    // Log the raw event
    const recordId = await logEvent(eventType, 'stripe', eventData, eventId, false);

    let processed = false;

    try {
      switch (eventType) {
        case 'customer.created':
        case 'customer.updated':
        case 'customer.deleted': {
          const customer = eventData as any;
          await upsertCustomer({
            id: customer.id,
            email: customer.email || '',
            name: customer.name || undefined,
            status: eventType === 'customer.deleted' ? 'churned' : 'active',
          });
          processed = true;
          break;
        }

        case 'subscription.created':
        case 'subscription.updated': {
          const sub = eventData as any;
          // Ensure customer exists
          if (sub.customer) {
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
            await upsertCustomer({
              id: customerId,
              email: '', // Not available directly; will be updated later
              status: 'active',
            });
          }
          const customer_id = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
          const currentPeriodStart = sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : new Date();
          const currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : new Date();
          const canceledAt = sub.canceled_at
            ? new Date(sub.canceled_at * 1000)
            : undefined;

          await upsertSubscription({
            id: sub.id,
            customer_id: customer_id,
            plan_id: sub.plan?.id || sub.items?.data?.[0]?.price?.product || 'unknown',
            plan_name: sub.plan?.nickname || sub.plan?.product || undefined,
            billing_interval: sub.plan?.interval || sub.items?.data?.[0]?.price?.recurring?.interval,
            status: sub.status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            canceled_at: canceledAt,
            metadata: sub.metadata,
          });
          processed = true;
          break;
        }

        case 'subscription.deleted': {
          const sub = eventData as any;
          const customer_id = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
          const currentPeriodStart = sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : new Date();
          const currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : new Date();
          const canceledAt = sub.canceled_at
            ? new Date(sub.canceled_at * 1000)
            : new Date();

          await upsertSubscription({
            id: sub.id,
            customer_id: customer_id,
            plan_id: sub.plan?.id || '',
            status: 'canceled',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            canceled_at: canceledAt,
          });
          processed = true;
          break;
        }

        case 'invoice.paid': {
          const invoice = eventData as any;
          if (invoice.customer) {
            const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
            await upsertCustomer({
              id: customerId,
              email: invoice.customer_email || '',
              name: invoice.customer_name || undefined,
            });
          }
          const customer_id = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
          const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : invoice.amount_due / 100;
          const amountDue = invoice.amount_due / 100;
          const paidAt = invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date();

          await upsertInvoice({
            id: invoice.id,
            customer_id: customer_id,
            subscription_id: invoice.subscription || undefined,
            number: invoice.number || undefined,
            status: 'paid',
            amount_due: amountDue,
            amount_paid: amountPaid,
            currency: invoice.currency,
            due_date: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
            paid_at: paidAt,
          });

          if (invoice.payment_intent) {
            await upsertPayment({
              id: invoice.payment_intent as string,
              customer_id: customer_id,
              invoice_id: invoice.id,
              amount: amountPaid,
              currency: invoice.currency,
              status: 'succeeded',
              payment_method_type: invoice.payment_method_types?.[0],
            });
          }
          processed = true;

          // Trigger successful payment processing (clear dunning)
          try {
            const { inngest } = await import('@/lib/inngest');
            await inngest.send('payment/succeeded', {
              invoiceId: invoice.id,
              customerId: customer_id,
              subscriptionId: invoice.subscription || null,
              amount: amountPaid,
              currency: invoice.currency,
            });
            console.log(`Triggered successful payment processing for invoice ${invoice.id}`);
          } catch (err) {
            console.error('Failed to trigger successful payment processing:', err);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = eventData as any;
          if (invoice.customer) {
            const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
            await upsertCustomer({
              id: customerId,
              email: invoice.customer_email || '',
            });
          }
          const customer_id = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
          const amountDue = invoice.amount_due / 100;

          await upsertInvoice({
            id: invoice.id,
            customer_id: customer_id,
            subscription_id: invoice.subscription || undefined,
            number: invoice.number || undefined,
            status: 'open',
            amount_due: amountDue,
            amount_paid: 0,
            currency: invoice.currency,
            due_date: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
          });

          if (invoice.payment_intent) {
            await upsertPayment({
              id: invoice.payment_intent as string,
              customer_id: customer_id,
              invoice_id: invoice.id,
              amount: amountDue,
              currency: invoice.currency,
              status: 'failed',
              payment_method_type: invoice.payment_method_types?.[0],
            });
          }
          processed = true;

          // Trigger payment retry process
          try {
            const { inngest } = await import('@/lib/inngest');
            await inngest.send('payment/failed', {
              invoiceId: invoice.id,
              customerId: customer_id,
              subscriptionId: invoice.subscription || null,
              amount: amountDue,
              currency: invoice.currency,
              provider: 'stripe',
              eventId: eventId,
            });
            console.log(`Triggered payment retry for invoice ${invoice.id}`);
          } catch (err) {
            console.error('Failed to trigger retry initiation:', err);
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const pi = eventData as any;
          await upsertPayment({
            id: pi.id,
            customer_id: pi.customer as string,
            amount: pi.amount_received ? pi.amount_received / 100 : pi.amount / 100,
            currency: pi.currency,
            status: 'succeeded',
            payment_method_type: pi.payment_method_types?.[0],
          });
          processed = true;

          // Trigger successful payment processing (clear dunning)
          try {
            const { inngest } = await import('@/lib/inngest');
            await inngest.send('payment/succeeded', {
              invoiceId: pi.metadata?.invoice_id || null,
              customerId: pi.customer as string,
              subscriptionId: pi.metadata?.subscription_id || null,
              amount: pi.amount / 100,
              currency: pi.currency,
            });
            console.log(`Triggered successful payment processing for payment intent ${pi.id}`);
          } catch (err) {
            console.error('Failed to trigger successful payment processing:', err);
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const pi = eventData as any;
          await upsertPayment({
            id: pi.id,
            customer_id: pi.customer as string,
            amount: pi.amount / 100,
            currency: pi.currency,
            status: 'failed',
            payment_method_type: pi.payment_method_types?.[0],
          });
          processed = true;

          // Trigger payment retry process (infer invoice from metadata if available)
          try {
            const { inngest } = await import('@/lib/inngest');
            await inngest.send('payment/failed', {
              invoiceId: pi.metadata?.invoice_id || null,
              customerId: pi.customer as string,
              subscriptionId: pi.metadata?.subscription_id || null,
              amount: pi.amount / 100,
              currency: pi.currency,
              provider: 'stripe',
              eventId: eventId,
            });
            console.log(`Triggered payment retry for payment intent ${pi.id}`);
          } catch (err) {
            console.error('Failed to trigger retry initiation:', err);
          }
          break;
        }

        default:
          console.log(`Unhandled Stripe event type: ${eventType}`);
          processed = true;
      }

      if (processed) {
        await markEventProcessed(recordId);
      }

      return { success: true };
    } catch (processingError: any) {
      await subscriptionDb.query(
        'UPDATE subscription_events SET error = $1 WHERE id = $2',
        [processingError.message, recordId]
      );
      throw processingError;
    }
  } catch (error: any) {
    console.error('Failed to process Stripe webhook:', error);
    if (!error.message.includes('already processed')) {
      await logEvent(eventType, 'stripe', eventData, eventId, false, error.message);
    }
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Analytics & Metrics
// ============================================================================

/**
 * Calculate MRR for a date range
 */
export async function calculateMRR(
  startDate: Date,
  endDate: Date
): Promise<Array<{
  date: string;
  mrr: number;
  newSubscriptions: number;
  churnedSubscriptions: number;
}>> {
  const result = await subscriptionDb.query(`
    SELECT
      date_trunc('day', s.current_period_start)::date as day,
      COUNT(*) FILTER (WHERE s.status = 'active' AND s.current_period_end > $1) as active_count,
      COUNT(*) FILTER (WHERE s.status = 'active' AND date_trunc('day', s.created_at)::date = date_trunc('day', s.current_period_start)::date) as new_subs,
      COUNT(*) FILTER (WHERE s.status = 'canceled' AND s.canceled_at >= $1 AND s.canceled_at <= $2) as churned_subs
    FROM subscriptions s
    WHERE s.current_period_start <= $2 AND (s.current_period_end >= $1 OR s.current_period_end IS NULL)
    GROUP BY day
    ORDER BY day
  `, [startDate, endDate]);

  // Generate date range
  const days = [];
  const mrrByDay = new Map<string, number>();
  result.rows.forEach((row: any) => {
    const day = row.day.toISOString().split('T')[0];
    // Placeholder MRR calculation: multiply active count by an average price. In production, sum actual subscription amounts.
    mrrByDay.set(day, row.active_count * 29.99);
  });

  const current = new Date(startDate);
  while (current <= endDate) {
    const dayStr = current.toISOString().split('T')[0];
    const row = result.rows.find((r: any) => r.day.toISOString().split('T')[0] === dayStr);
    days.push({
      date: dayStr,
      mrr: mrrByDay.get(dayStr) || 0,
      newSubscriptions: row ? parseInt(row.new_subs) : 0,
      churnedSubscriptions: row ? parseInt(row.churned_subs) : 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Get current metrics (MRR, churn rate, new subscriptions, etc.)
 */
export async function getCurrentMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const metrics = await subscriptionDb.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active') as active_subscribers,
      COUNT(*) FILTER (WHERE created_at >= $1) as new_subscribers_30d,
      COUNT(*) FILTER (WHERE status = 'canceled' AND canceled_at >= $1) as churned_subscribers_30d,
      COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) * 29.99, 0) as mrr_estimate
    FROM subscriptions
  `, [thirtyDaysAgo]);

  const row: any = metrics.rows[0];

  const churnRate = row.active_subscribers > 0
    ? (row.churned_subscribers_30d / (row.active_subscribers + row.churned_subscribers_30d)) * 100
    : 0;

  return {
    mrr: parseFloat(row.mrr_estimate),
    activeSubscribers: parseInt(row.active_subscribers),
    newSubscribers30d: parseInt(row.new_subscribers_30d),
    churnedSubscribers30d: parseInt(row.churned_subscribers_30d),
    churnRate: parseFloat(churnRate.toFixed(2)),
    asOf: new Date().toISOString(),
  };
}

/**
 * Export subscription data as CSV
 */
export async function exportSubscriptionsToCSV(): Promise<string> {
  const result = await subscriptionDb.query(`
    SELECT
      s.id as subscription_id,
      c.email as customer_email,
      c.name as customer_name,
      s.plan_name,
      s.billing_interval,
      s.status,
      s.current_period_start,
      s.current_period_end,
      s.canceled_at,
      s.created_at
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    ORDER BY s.created_at DESC
  `);

  const headers = [
    'subscription_id',
    'customer_email',
    'customer_name',
    'plan_name',
    'billing_interval',
    'status',
    'current_period_start',
    'current_period_end',
    'canceled_at',
    'created_at',
  ];

  const csvRows: string[] = [headers.join(',')];

  result.rows.forEach((row: any) => {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') ? `"${str}"` : str;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}
