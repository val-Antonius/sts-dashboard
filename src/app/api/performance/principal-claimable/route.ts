import { NextRequest, NextResponse } from 'next/server';
import { getPrincipalClaimableData } from '@/lib/queries/performance';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get('range') || 'last_1_year';
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const data = await getPrincipalClaimableData(range, start, end);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching principal and claimable data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch principal and claimable data' },
      { status: 500 }
    );
  }
}
