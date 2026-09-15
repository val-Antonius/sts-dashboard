import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceVolumeData } from '@/lib/queries/performance';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'last_1_year';
  const customStart = searchParams.get('start') || undefined;
  const customEnd = searchParams.get('end') || undefined;
  const segment = searchParams.get('segment') || 'all';

  try {
    const data = await getPerformanceVolumeData(range, customStart, customEnd, segment);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching performance volume data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
