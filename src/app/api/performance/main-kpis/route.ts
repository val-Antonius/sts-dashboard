import { NextRequest, NextResponse } from 'next/server';
import { getMainKpiDataPackage } from '@/lib/queries/main-kpis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'last_1_year';
    const customStart = searchParams.get('start') || undefined;
    const customEnd = searchParams.get('end') || undefined;

    const data = await getMainKpiDataPackage(range, customStart, customEnd);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching main KPI data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch main KPI data', details: error.message },
      { status: 500 }
    );
  }
}
