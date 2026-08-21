import { NextRequest, NextResponse } from 'next/server';
import { getOverviewChartsData } from '@/lib/queries/overview';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'this_month';
  const customStart = searchParams.get('start') || undefined;
  const customEnd = searchParams.get('end') || undefined;

  try {
    const data = await getOverviewChartsData(range, customStart, customEnd);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching overview charts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
