import { NextRequest, NextResponse } from 'next/server';
import { getBranchAnalyticsData } from '@/lib/queries/performance';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get('range') || 'last_1_year';
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const segment = searchParams.get('segment') || 'all';

    const data = await getBranchAnalyticsData(range, start, end, segment);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching branch analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch analytics data', details: error.message },
      { status: 500 }
    );
  }
}
