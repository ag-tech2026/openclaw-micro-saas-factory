import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const success = await db.unsubscribe(email.toLowerCase().trim());

    if (!success) {
      return NextResponse.json(
        { error: 'Email not found or already unsubscribed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  const subscriber = await db.getSubscriberByEmail(email.toLowerCase().trim());

  if (!subscriber) {
    return NextResponse.json(
      { error: 'Email not found' },
      { status: 404 }
    );
  }

  const isUnsubscribed = subscriber.unsubscribed_at !== null;

  return NextResponse.json({
    email: subscriber.email,
    subscribed_at: subscriber.subscribed_at,
    unsubscribed_at: subscriber.unsubscribed_at,
    is_unsubscribed: isUnsubscribed,
  });
}
