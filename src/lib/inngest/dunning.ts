/**
 * Payment Retry and Dunning Management
 * Inngest functions for handling failed payments with exponential backoff
 */

import { inngest } from '@/lib/inngest';
import { subscriptionDb } from '@/lib/subscription-db';
import { sendDunningEmail } from '@/lib/email-service';
import { env } from '@/lib/config';

// ============================================================================
// Configuration
// ============================================================================

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMinutes: 60, // Start with 1 hour
  maxDelayHours: 72, // Max 3 days between retries
  backoffFactor: 2, // Exponential backoff multiplier
  // Email reminders configuration
  emailReminders: [
    { attempt: 1, delayHours: 24 }, // Send email 24h after first failure
    { attempt: 2, delayHours: 48 }, // Send email 48h after second failure
    { attempt: 3, delayHours: 12 }, // Final notice 12h before final retry
  ],
  // When to cancel subscription
  cancelAfterFailedRetries: true,
  maxDunningDays: 15, // Cancel if no successful payment after 15 days
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate next retry time using exponential backoff
 */
function calculateNextRetry(attemptNumber: number): Date {
  const delayMinutes = Math.min(
    RETRY_CONFIG.baseDelayMinutes * Math.pow(RETRY_CONFIG.backoffFactor, attemptNumber - 1),
    RETRY_CONFIG.maxDelayHours * 60
  );
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

/**
 * Record a retry attempt in the database
 */
async function recordRetryAttempt(
  customerId: string,
  invoiceId: string | null,
  subscriptionId: string | null,
  attemptNumber: number,
  status: 'scheduled' | 'in_progress' | 'succeeded' | 'failed' | 'canceled',
  scheduledFor: Date,
  error?: { message: string; code?: string }
) {
  const id = `retry_${customerId}_${invoiceId || 'noinv'}_${attemptNumber}`;

  await subscriptionDb.query(`
    INSERT INTO payment_retry_attempts (
      id, customer_id, invoice_id, subscription_id, attempt_number,
      status, scheduled_for, started_at, completed_at,
      error_message, error_code, retryable, next_retry_at, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        error_message = EXCLUDED.error_message,
        error_code = EXCLUDED.error_code,
        retryable = EXCLUDED.retryable,
        next_retry_at = EXCLUDED.next_retry_at
  `, [
    id,
    customerId,
    invoiceId,
    subscriptionId,
    attemptNumber,
    status,
    scheduledFor,
    status === 'in_progress' ? new Date() : null,
    status === 'succeeded' || status === 'failed' || status === 'canceled' ? new Date() : null,
    error?.message || null,
    error?.code || null,
    status === 'failed' && attemptNumber < RETRY_CONFIG.maxAttempts,
    status === 'failed' ? calculateNextRetry(attemptNumber + 1) : null,
  ]);
}

/**
 * Record a dunning event
 */
async function recordDunningEvent(
  customerId: string,
  invoiceId: string | null,
  eventType: string,
  attemptNumber?: number,
  metadata?: Record<string, any>
) {
  const id = `dunning_${crypto.randomUUID()}`;
  await subscriptionDb.query(`
    INSERT INTO dunning_events (
      id, customer_id, invoice_id, event_type, attempt_number, metadata, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [id, customerId, invoiceId, eventType, attemptNumber || null, metadata ? JSON.stringify(metadata) : null]);
}

/**
 * Handle max retry attempts exceeded - either cancel subscription or mark as past_due
 */
async function handleMaxRetriesExceeded(
  invoice: any,
  subscription: any | undefined,
  customer: any,
  attemptNumber: number
) {
  console.log(`Max retries exceeded for customer ${customer.id}, invoice ${invoice?.id}`);

  // Update customer dunning status
  await subscriptionDb.query(
    'UPDATE customers SET dunning_status = $1, updated_at = NOW() WHERE id = $2',
    ['active', customer.id]
  );

  // Mark subscription as past_due or canceled based on config
  if (RETRY_CONFIG.cancelAfterFailedRetries && subscription) {
    // Cancel subscription
    await subscriptionDb.query(
      'UPDATE subscriptions SET status = $1, canceled_due_to_dunning = TRUE, canceled_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['canceled', subscription.id]
    );

    await recordDunningEvent(customer.id, invoice?.id, 'subscription_canceled', attemptNumber, {
      reason: 'max_retries_exceeded',
      totalAttempts: attemptNumber,
    });

    // Send cancellation email
    if (env.RESEND_API_KEY) {
      const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendDunningEmail('subscriptionCanceled', {
        customer: { email: customer.email, name: customer.name },
        subscription: {
          planName: subscription.plan_name || 'your subscription',
          amount: invoice?.amount_due || 0,
          currency: invoice?.currency || 'usd',
          currentPeriodEnd: subscription.current_period_end,
        },
        actionUrl: `${baseUrl}/billing`,
      });
    }
  } else if (subscription) {
    // Keep subscription active but mark as past_due
    await subscriptionDb.query(
      'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2',
      ['past_due', subscription.id]
    );
  }

  // Send final notice email
  if (env.RESEND_API_KEY) {
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const template = attemptNumber >= RETRY_CONFIG.maxAttempts ? 'finalNotice' : 'paymentFailed';

    await sendDunningEmail(template, {
      customer: { email: customer.email, name: customer.name },
      subscription: {
        planName: subscription?.plan_name || 'your subscription',
        amount: invoice?.amount_due || 0,
        currency: invoice?.currency || 'usd',
      },
      invoice: {
        amountDue: invoice?.amount_due || 0,
        dueDate: invoice?.due_date || invoice?.created_at || new Date(),
        numberOfAttempts: attemptNumber,
      },
      retryDate: attemptNumber < RETRY_CONFIG.maxAttempts ? calculateNextRetry(attemptNumber + 1).toISOString() : undefined,
      actionUrl: `${baseUrl}/billing`,
    });

    await recordDunningEvent(customer.id, invoice?.id, 'email_sent', attemptNumber, {
      template: 'finalNotice',
    });
  }
}

// ============================================================================
// Inngest Functions
// ============================================================================

/**
 * Initiate retry process when a payment fails
 * Triggered by payment_intent.payment_failed or invoice.payment_failed webhooks
 */
export const initiatePaymentRetry = inngest.createFunction(
  {
    id: 'initiate-payment-retry',
    name: 'Initiate Payment Retry',
    description: 'Start automated retry process for a failed payment',
    triggers: [
      { event: 'payment/failed' },
    ],
    retry: {
      limit: 3,
      minInterval: 1000,
      maxInterval: 30000,
      backoff: 'exponential',
    },
    timeout: '5m',
  },
  async ({ event, step }) => {
    const { invoiceId, customerId, subscriptionId: providedSubscriptionId, amount, currency, provider, eventId } = event.data;

    if (!customerId) {
      throw new Error('customerId is required');
    }

    console.log(`Initiating retry for customer ${customerId}, invoice ${invoiceId || 'none'}`);

    try {
      // Step: Get customer, invoice, and subscription details
      const { customer, invoice, subscription } = await step.run('fetch-details', async () => {
        const [custRes, invRes, subRes] = await Promise.all([
          subscriptionDb.query('SELECT * FROM customers WHERE id = $1', [customerId]),
          invoiceId
            ? subscriptionDb.query('SELECT * FROM invoices WHERE id = $1', [invoiceId])
            : Promise.resolve({ rows: [] }),
          providedSubscriptionId
            ? subscriptionDb.query('SELECT * FROM subscriptions WHERE id = $1', [providedSubscriptionId])
            : invoiceId
            ? subscriptionDb.query(
                'SELECT s.* FROM subscriptions s JOIN invoices i ON s.id = i.subscription_id WHERE i.id = $1',
                [invoiceId]
              )
            : Promise.resolve({ rows: [] }),
        ]);

        const customer = custRes.rows[0];
        const invoice = invRes.rows[0];
        const subscription = subRes.rows[0];

        if (!customer) {
          throw new Error(`Customer not found: ${customerId}`);
        }

        return { customer, invoice, subscription };
      });

      // Use the invoice from the database if we didn't have it
      const finalInvoice = invoice;
      const finalSubscription = subscription || { id: providedSubscriptionId };

      // If we still don't have an invoice, we need amount from the event
      const invoiceAmount = finalInvoice?.amount_due || amount;

      // Determine current retry attempt number for this customer/invoice
      const existingRetriesRes = await subscriptionDb.query(
        'SELECT COALESCE(MAX(attempt_number), 0) as max_attempt FROM payment_retry_attempts WHERE customer_id = $1 AND invoice_id = $2',
        [customerId, finalInvoice?.id || null]
      );
      const currentAttempt = (existingRetriesRes.rows[0]?.max_attempt || 0) + 1;

      // Check if we've exceeded max attempts
      if (currentAttempt > RETRY_CONFIG.maxAttempts) {
        console.log(`Max retry attempts (${RETRY_CONFIG.maxAttempts}) exceeded for invoice ${finalInvoice?.id}`);
        await handleMaxRetriesExceeded(finalInvoice, finalSubscription, customer, currentAttempt);
        return { success: true, action: 'max_retries_exceeded' };
      }

      // Calculate when to schedule the retry
      const scheduledFor = calculateNextRetry(currentAttempt);

      // Record the retry attempt
      await recordRetryAttempt(
        customerId,
        finalInvoice?.id || null,
        finalSubscription?.id || null,
        currentAttempt,
        'scheduled',
        scheduledFor
      );

      // Log dunning event
      await recordDunningEvent(customerId, finalInvoice?.id || null, 'retry_scheduled', currentAttempt, {
        scheduledFor: scheduledFor.toISOString(),
        invoiceAmount: invoiceAmount,
        provider,
        eventId,
      });

      // Send email reminder if configured
      if (env.RESEND_API_KEY) {
        const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const template = currentAttempt >= RETRY_CONFIG.maxAttempts ? 'finalNotice' : 'paymentFailed';

        // Determine email delay based on attempt
        const emailSchedule = RETRY_CONFIG.emailReminders.find(e => e.attempt === currentAttempt);
        const emailDelayHours = emailSchedule?.delayHours || 24;

        // We'll send the email with a delay using a separate Inngest scheduled event
        // For simplicity, we send it now with appropriate template based on attempt
        // In production, you'd schedule it for the right time using Inngest's delay

        await sendDunningEmail(template, {
          customer: { email: customer.email, name: customer.name },
          subscription: {
            planName: finalSubscription?.plan_name || subscription?.plan_name || 'your subscription',
            amount: invoiceAmount,
            currency: finalInvoice?.currency || 'usd',
            currentPeriodEnd: finalSubscription?.current_period_end,
          },
          invoice: {
            amountDue: invoiceAmount,
            dueDate: finalInvoice?.due_date || finalInvoice?.created_at || new Date(),
            numberOfAttempts: currentAttempt,
          },
          retryDate: scheduledFor.toISOString(),
          actionUrl: `${baseUrl}/billing`,
        });

        await recordDunningEvent(customerId, finalInvoice?.id || null, 'email_sent', currentAttempt, {
          template,
        });
      }

      // Send the execute-payment-retry event
      const { inngest: inngestClient } = await import('@/lib/inngest');
      await inngestClient.send('execute-payment-retry', {
        invoiceId: finalInvoice?.id || null,
        customerId: customerId,
        subscriptionId: finalSubscription?.id || null,
        attemptNumber: currentAttempt,
        amount: invoiceAmount,
        currency: currency || finalInvoice?.currency || 'usd',
        scheduledFor: scheduledFor.toISOString(),
      });

      return {
        success: true,
        action: 'retry_scheduled',
        attemptNumber: currentAttempt,
        scheduledFor: scheduledFor.toISOString(),
      };
    } catch (error: any) {
      console.error('Failed to initiate payment retry:', error);
      throw error;
    }
  }
);

/**
 * Execute a payment retry attempt
 * This function is scheduled to run at specific times
 */
export const executePaymentRetry = inngest.createFunction(
  {
    id: 'execute-payment-retry',
    name: 'Execute Payment Retry',
    description: 'Attempt to collect payment using Stripe/Polar retry APIs',
    triggers: [
      { event: 'execute-payment-retry' },
    ],
    retry: {
      limit: 2,
      minInterval: 5000,
      maxInterval: 60000,
      backoff: 'exponential',
    },
    timeout: '5m',
  },
  async ({ event, step }) => {
    const { invoiceId, customerId, subscriptionId, attemptNumber, amount, currency } = event.data;

    console.log(`Executing retry attempt ${attemptNumber} for invoice ${invoiceId || 'none'}, customer ${customerId}`);

    try {
      // Mark as in progress
      await recordRetryAttempt(
        customerId,
        invoiceId,
        subscriptionId,
        attemptNumber,
        'in_progress',
        new Date()
      );

      // Step: Attempt payment via payment processor
      const result = await step.run('process-payment', async () => {
        // STRIPE PATH
        if (env.STRIPE_WEBHOOK_SECRET && env.NEXT_PUBLIC_STRIPE_RETRY_KEY) {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
          });

          // Get the customer's default payment method
          const customer = await stripe.customers.retrieve(customerId);
          const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null;

          // Create a new payment intent for the invoice
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency || 'usd',
            customer: customerId,
            payment_method: customer.default_payment_method as string,
            off_session: true,
            confirm: true,
            metadata: {
              invoice_id: invoiceId || '',
              retry_attempt: attemptNumber.toString(),
            },
          });

          return {
            success: paymentIntent.status === 'succeeded',
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            error: paymentIntent.last_payment_error?.message,
            errorCode: paymentIntent.last_payment_error?.code,
          };
        }

        // POLAR PATH
        if (env.POLAR_CLIENT_ID && env.POLAR_CLIENT_SECRET) {
          // Polar handles retries automatically; manual retry not typically needed
          return {
            success: false,
            error: 'Polar automatic retries enabled; manual retry not needed',
            skipped: true,
          };
        }

        throw new Error('No payment provider configured');
      });

      // Record the outcome
      const success = result.success && !result.skipped;
      await recordRetryAttempt(
        customerId,
        invoiceId,
        subscriptionId,
        attemptNumber,
        success ? 'succeeded' : 'failed',
        new Date(),
        result.error ? { message: result.error, code: result.errorCode } : undefined
      );

      if (success) {
        await recordDunningEvent(customerId, invoiceId, 'retry_attempt', attemptNumber, {
          status: 'succeeded',
          paymentIntentId: result.paymentIntentId,
        });

        // Update customer's failed payment count
        await subscriptionDb.query(
          'UPDATE customers SET failed_payment_count = 0, dunning_status = $1, updated_at = NOW() WHERE id = $2',
          ['none', customerId]
        );

        // Update subscription retry attempts
        if (subscriptionId) {
          await subscriptionDb.query(
            'UPDATE subscriptions SET retry_attempts = retry_attempts + 1, last_retry_at = NOW(), updated_at = NOW() WHERE id = $1',
            [subscriptionId]
          );
        }

        // Trigger successful payment processing to clear any other dunning state
        try {
          const { inngest: inngestClient } = await import('@/lib/inngest');
          await inngestClient.send('payment/succeeded', {
            invoiceId: invoiceId,
            customerId: customerId,
            subscriptionId: subscriptionId,
            amount: amount,
            currency: currency,
          });
        } catch (err) {
          console.error('Failed to trigger successful payment processing:', err);
        }

        return { success: true, action: 'payment_succeeded' };
      } else {
        // Payment failed again
        await recordDunningEvent(customerId, invoiceId, 'retry_attempt', attemptNumber, {
          status: 'failed',
          error: result.error,
        });

        // Update customer's failed payment count
        await subscriptionDb.query(
          'UPDATE customers SET failed_payment_count = failed_payment_count + 1, last_payment_failed_at = NOW(), updated_at = NOW() WHERE id = $2',
          [customerId]
        );

        // Update subscription retry attempts
        if (subscriptionId) {
          await subscriptionDb.query(
            'UPDATE subscriptions SET retry_attempts = retry_attempts + 1, last_retry_at = NOW(), updated_at = NOW() WHERE id = $1',
            [subscriptionId]
          );
        }

        // Check if we should schedule another retry or cancel
        if (attemptNumber < RETRY_CONFIG.maxAttempts) {
          // Schedule next retry
          const nextRetry = calculateNextRetry(attemptNumber + 1);
          await recordRetryAttempt(
            customerId,
            invoiceId,
            subscriptionId,
            attemptNumber + 1,
            'scheduled',
            nextRetry
          );

          return { success: true, action: 'retry_scheduled', nextRetryAt: nextRetry.toISOString() };
        } else {
          // Max attempts reached - handle cancellation or final notice
          // Fetch customer and invoice for the email
          const [custRes] = await subscriptionDb.query('SELECT * FROM customers WHERE id = $1', [customerId]);
          const [subRes] = subscriptionId ? await subscriptionDb.query('SELECT * FROM subscriptions WHERE id = $1', [subscriptionId]) : { rows: [] };
          const [invRes] = invoiceId ? await subscriptionDb.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]) : { rows: [] };

          await handleMaxRetriesExceeded(invRes.rows[0], subRes.rows[0], custRes.rows[0], attemptNumber);
          return { success: true, action: 'max_retries_exceeded' };
        }
      }
    } catch (error: any) {
      console.error(`Payment retry ${attemptNumber} failed:`, error);
      await recordRetryAttempt(
        customerId,
        invoiceId,
        subscriptionId,
        attemptNumber,
        'failed',
        new Date(),
        { message: error.message }
      );
      throw error;
    }
  }
);

/**
 * Process a successful payment and clear dunning status
 * Triggered by invoice.paid or payment_intent.succeeded
 */
export const processSuccessfulPayment = inngest.createFunction(
  {
    id: 'process-successful-payment',
    name: 'Process Successful Payment',
    description: 'Clear dunning status when payment is finally successful',
    triggers: [
      { event: 'payment/succeeded' },
    ],
    retry: {
      limit: 2,
    },
    timeout: '2m',
  },
  async ({ event, step }) => {
    const { invoiceId, customerId, subscriptionId } = event.data;

    console.log(`Processing successful payment for invoice ${invoiceId}`);

    try {
      // Clear all pending retry attempts for this invoice/customer
      await subscriptionDb.query(
        'UPDATE payment_retry_attempts SET status = $1, completed_at = NOW() WHERE customer_id = $2 AND invoice_id = $3 AND status IN ($4, $5)',
        ['canceled', customerId, invoiceId, 'scheduled', 'in_progress']
      );

      // Reset customer dunning counters
      await subscriptionDb.query(
        'UPDATE customers SET failed_payment_count = 0, dunning_status = $1, updated_at = NOW() WHERE id = $2',
        ['none', customerId]
      );

      // Update subscription if it was past_due
      if (subscriptionId) {
        await subscriptionDb.query(
          'UPDATE subscriptions SET status = $1, retry_attempts = 0, last_retry_at = NULL, updated_at = NOW() WHERE id = $2',
          ['active', subscriptionId]
        );
      }

      await recordDunningEvent(customerId, invoiceId, 'payment_succeeded', undefined, {
        clearedDunning: true,
      });

      return { success: true, action: 'dunning_cleared' };
    } catch (error: any) {
      console.error('Failed to process successful payment:', error);
      throw error;
    }
  }
);

// ============================================================================
// Scheduled Function: Process Due Retries
// ============================================================================

/**
 * Scheduled function to process retry attempts that are due
 * Runs every 15 minutes via cron
 */
export const processDueRetries = inngest.createFunction(
  {
    id: 'process-due-retries',
    name: 'Process Due Retries',
    description: 'Process scheduled retry attempts that are due',
    retry: {
      limit: 2,
    },
    timeout: '10m',
    schedule: {
      interval: '15m', // Run every 15 minutes
    },
  },
  async ({ event, step }) => {
    console.log('Processing due retry attempts');

    const now = new Date();

    try {
      // Find all scheduled retry attempts that are due
      const dueRes = await subscriptionDb.query(`
        SELECT r.*, c.email as customer_email, c.name as customer_name, i.amount_due, i.currency, i.due_date, s.plan_name
        FROM payment_retry_attempts r
        JOIN customers c ON r.customer_id = c.id
        JOIN invoices i ON r.invoice_id = i.id
        LEFT JOIN subscriptions s ON r.subscription_id = s.id
        WHERE r.status = 'scheduled' AND r.scheduled_for <= $1
        ORDER BY r.scheduled_for ASC
        LIMIT 50
      `, [now]);

      const dueAttempts = dueRes.rows;

      console.log(`Found ${dueAttempts.length} due retry attempts`);

      for (const attempt of dueAttempts) {
        try {
          // Send each retry as a separate Inngest event
          await step.send('execute-payment-retry', {
            invoiceId: attempt.invoice_id,
            customerId: attempt.customer_id,
            subscriptionId: attempt.subscription_id,
            attemptNumber: attempt.attempt_number,
            amount: parseFloat(attempt.amount_due),
            currency: attempt.currency,
          });
        } catch (err) {
          console.error(`Failed to schedule retry execution for ${attempt.id}:`, err);
        }
      }

      return {
        success: true,
        processed: dueAttempts.length,
        attempts: dueAttempts.map(a => ({
          id: a.id,
          invoiceId: a.invoice_id,
          customerId: a.customer_id,
        })),
      };
    } catch (error: any) {
      console.error('Error processing due retries:', error);
      throw error;
    }
  }
);
