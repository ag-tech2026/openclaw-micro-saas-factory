import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '@/lib/auth-client';

/**
 * POST /api/auth/sign-out
 * Signs out the current user by clearing the session cookie.
 */
export async function POST() {
  try {
    await authClient.signOut();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}
