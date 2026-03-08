import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export const emailTemplates = {
  welcome: (email: string, unsubscribeUrl: string): EmailTemplate => ({
    subject: 'Welcome to our newsletter! 🎉',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Welcome!</h1>
        <p>Thank you for subscribing to our newsletter. We're excited to keep you updated with the latest MVPs and news.</p>
        <p>You'll receive our weekly digest featuring new micro-SaaS projects and insights.</p>
        <p>If you no longer wish to receive these emails, you can 
          <a href="${unsubscribeUrl}">unsubscribe</a> at any time.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #666; font-size: 12px;">
          You're receiving this email because you subscribed to our newsletter.
        </p>
      </div>
    `,
    text: `
Welcome!

Thank you for subscribing to our newsletter. We're excited to keep you updated with the latest MVPs and news.

You'll receive our weekly digest featuring new micro-SaaS projects and insights.

If you no longer wish to receive these emails, you can unsubscribe at any time: ${unsubscribeUrl}

---
You're receiving this email because you subscribed to our newsletter.
    `,
  }),

  weeklyDigest: (
    email: string,
    unsubscribeUrl: string,
    mvpCount: number,
    recentMvps: Array<{ title: string; description: string; url: string }>
  ): EmailTemplate => ({
    subject: `📊 Weekly MVP Digest - ${new Date().toLocaleDateString()}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Weekly MVP Digest</h1>
        <p>Here's what we've been building this week:</p>
        <div style="margin: 20px 0;">
          <h2>New MVPs: ${mvpCount}</h2>
          ${recentMvps.map((mvp) => `
            <div style="border: 1px solid #eee; padding: 15px; margin: 10px 0; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0;"><a href="${mvp.url}" style="color: #0066cc; text-decoration: none;">${mvp.title}</a></h3>
              <p style="margin: 0; color: #555;">${mvp.description}</p>
            </div>
          `).join('')}
        </div>
        <p>
          <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe from weekly emails</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #666; font-size: 12px;">
          This email was sent to ${email}
        </p>
      </div>
    `,
    text: `
Weekly MVP Digest
==================

Here's what we've been building this week:

New MVPs: ${mvpCount}

${recentMvps.map((mvp) => `
${mvp.title}
${mvp.description}
${mvp.url}
`).join('\n')}

---
Unsubscribe: ${unsubscribeUrl}

This email was sent to ${email}
    `,
  }),
};

export async function sendEmail(to: string, template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'newsletter@yourdomain.com',
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: process.env.REPLY_TO_EMAIL,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
