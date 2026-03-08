import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';
import fs from 'fs';
import path from 'path';

// GET all subscribers
export async function GET() {
  try {
    const subscribers = await db.getActiveSubscribers();
    return NextResponse.json({ subscribers });
  } catch (error) {
    console.error('Admin GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }
}
