import { NextRequest, NextResponse } from 'next/server';
import { getCaseDiagnosticData } from '@/lib/queries/diagnostic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await getCaseDiagnosticData(id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching diagnostic data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
