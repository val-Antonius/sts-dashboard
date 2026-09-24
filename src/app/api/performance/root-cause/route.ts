import { NextRequest, NextResponse } from 'next/server';
import { getRootCauseData } from '@/lib/queries/performance';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get('range') || 'last_1_year';
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const segment = searchParams.get('segment') || 'all';

    const data = await getRootCauseData(range, start, end, segment);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching root cause analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch root cause analytics data', details: error.message },
      { status: 500 }
    );
  }
}
