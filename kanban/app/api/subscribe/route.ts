import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const subscriber = await db.subscribe(email.toLowerCase().trim(), source);

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Failed to subscribe email' },
        { status: 500 }
      );
    }

    // Send welcome email (only if newly subscribed, not re-subscribed)
    if (!subscriber.sent_welcome_email) {
      const unsubscribeUrl = `${request.headers.get('origin')}/api/unsubscribe?email=${encodeURIComponent(email)}`;
      const welcomeResult = await sendEmail(email, emailTemplates.welcome(email, unsubscribeUrl));

      if (welcomeResult.success) {
        await db.markWelcomeSent(email);
      } else {
        console.error('Welcome email failed:', welcomeResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed',
      subscriber: {
        email: subscriber.email,
        subscribed_at: subscriber.subscribed_at,
      },
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
