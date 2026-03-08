/**
 * Email Service
 * Handles sending dunning-related emails using Resend
 */

import { Resend } from 'resend';
import { env } from '@/lib/config';

interface EmailTemplateProps {
  customer: {
    email: string;
    name?: string;
  };
  subscription: {
    planName: string;
    amount: number;
    currency: string;
  };
  invoice: {
    amountDue: number;
    dueDate: string;
    numberOfAttempts: number;
  };
  retryDate?: string;
  actionUrl?: string;
}

const resend = new Resend(env.RESEND_API_KEY);

const emailTemplates = {
  paymentFailed: (props: EmailTemplateProps) => ({
    subject: `Payment Failed - Action Required`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Failed</h2>
        <p>Hello ${props.customer.name || 'there'},</p>
        <p>We were unable to process your payment for your <strong>${props.subscription.planName}</strong> subscription.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Amount:</strong> ${props.subscription.currency.toUpperCase()} ${props.invoice.amountDue}</p>
          <p><strong>Due Date:</strong> ${new Date(props.invoice.dueDate).toLocaleDateString()}</p>
          <p><strong>Attempts:</strong> ${props.invoice.numberOfAttempts}</p>
        </div>
        <p>Please update your payment method to avoid service interruption.</p>
        <p>
          <a href="${props.actionUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Payment Method
          </a>
        </p>
        <p>If you need assistance, please contact our support team.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `,
    text: `
      Payment Failed

      Hello ${props.customer.name || 'there'},

      We were unable to process your payment for your ${props.subscription.planName} subscription.

      Invoice Amount: ${props.subscription.currency.toUpperCase()} ${props.invoice.amountDue}
      Due Date: ${new Date(props.invoice.dueDate).toLocaleDateString()}
      Attempts: ${props.invoice.numberOfAttempts}

      Please update your payment method to avoid service interruption.
      ${props.actionUrl ? `\n\nUpdate Payment Method: ${props.actionUrl}` : ''}

      If you need assistance, please contact our support team.

      Best regards,
      The Team
    `,
  }),

  retryScheduled: (props: EmailTemplateProps & { retryDate: string }) => ({
    subject: `Payment Retry Scheduled`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Retry Scheduled</h2>
        <p>Hello ${props.customer.name || 'there'},</p>
        <p>We've scheduled an automatic retry for your failed payment on <strong>${new Date(props.retryDate).toLocaleString()}</strong>.</p>
        <p>If the payment succeeds, your subscription will remain active without any interruption.</p>
        <p>No action is needed on your part unless you want to update your payment method.</p>
        <p>
          <a href="${props.actionUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Subscription
          </a>
        </p>
        <p>Best regards,<br>The Team</p>
      </div>
    `,
    text: `
      Retry Scheduled

      Hello ${props.customer.name || 'there'},

      We've scheduled an automatic retry for your failed payment on ${new Date(props.retryDate).toLocaleString()}.

      If the payment succeeds, your subscription will remain active without any interruption.

      No action is needed on your part unless you want to update your payment method.

      View Subscription: ${props.actionUrl}

      Best regards,
      The Team
    `,
  }),

  finalNotice: (props: EmailTemplateProps & { retryDate: string }) => ({
    subject: `Final Notice - Subscription at Risk`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Final Notice</h2>
        <p>Hello ${props.customer.name || 'there'},</p>
        <p>This is your final notice. We have attempted to collect payment multiple times without success.</p>
        <p><strong>Final retry scheduled:</strong> ${new Date(props.retryDate).toLocaleString()}</p>
        <p>If this payment fails, your subscription will be canceled to avoid accumulating unpaid invoices.</p>
        <p>Please ensure your payment method is up to date to avoid losing access to your service.</p>
        <p>
          <a href="${props.actionUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Payment Method Now
          </a>
        </p>
        <p>If you have questions, please contact support immediately.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `,
    text: `
      Final Notice - Subscription at Risk

      Hello ${props.customer.name || 'there'},

      This is your final notice. We have attempted to collect payment multiple times without success.

      Final retry scheduled: ${new Date(props.retryDate).toLocaleString()}

      If this payment fails, your subscription will be canceled to avoid accumulating unpaid invoices.

      Please ensure your payment method is up to date to avoid losing access to your service.

      Update Payment Method Now: ${props.actionUrl}

      If you have questions, please contact support immediately.

      Best regards,
      The Team
    `,
  }),

  subscriptionCanceled: (props: EmailTemplateProps) => ({
    subject: `Subscription Canceled`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription Canceled</h2>
        <p>Hello ${props.customer.name || 'there'},</p>
        <p>Your subscription to <strong>${props.subscription.planName}</strong> has been canceled due to repeated payment failures.</p>
        <p>We're sorry to see you go. If you'd like to reactivate your subscription, you can do so by updating your payment method and resubscribing.</p>
        <p>
          <a href="${props.actionUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reactivate Subscription
          </a>
        </p>
        <p>Your access will remain active until <strong>${new Date(props.subscription.currentPeriodEnd).toLocaleDateString()}</strong>.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `,
    text: `
      Subscription Canceled

      Hello ${props.customer.name || 'there'},

      Your subscription to ${props.subscription.planName} has been canceled due to repeated payment failures.

      We're sorry to see you go. If you'd like to reactivate your subscription, you can do so by updating your payment method and resubscribing.

      Reactivate Subscription: ${props.actionUrl}

      Your access will remain active until ${new Date(props.subscription.currentPeriodEnd).toLocaleDateString()}.

      Best regards,
      The Team
    `,
  }),
};

export async function sendDunningEmail(
  template: keyof typeof emailTemplates,
  props: EmailTemplateProps & { retryDate?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  const templateFn = emailTemplates[template];
  if (!templateFn) {
    return { success: false, error: `Unknown email template: ${template}` };
  }

  const { subject, html, text } = templateFn(props);

  try {
    const { data, error } = await resend.emails.send({
      from: encodeURIComponent(env.EMAIL_FROM || 'noreply@yourdomain.com'),
      to: [props.customer.email],
      subject,
      html,
      text,
      replyTo: env.EMAIL_REPLY_TO,
    });

    if (error) {
      console.error('Failed to send dunning email:', error);
      return { success: false, error: error.message };
    }

    console.log(`Sent ${template} email to ${props.customer.email}:`, data.id);
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

export type { EmailTemplateProps };
