import { NextRequest, NextResponse } from 'next/server';
import { exportSubscriptionsToCSV } from '@/lib/subscription-analytics';

/**
 * Export all subscriptions as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const csv = await exportSubscriptionsToCSV();

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="subscriptions-export.csv"',
      },
    });
  } catch (error) {
    console.error('Error exporting subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to export subscriptions' },
      { status: 500 }
    );
  }
}
