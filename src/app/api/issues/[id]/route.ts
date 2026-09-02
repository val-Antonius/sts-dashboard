import { NextRequest, NextResponse } from 'next/server';
import { getIssueDetailFull, updateIssueCase, deleteIssueCase, ConcurrencyConflictError } from '@/lib/queries/issues';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getIssueDetailFull(id);

    if (!data.caseData) {
      return NextResponse.json({ error: 'Issue case not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.complaint_date || !body.branch_id || !body.customer_id || !body.unit_asset_id) {
      return NextResponse.json(
        { error: 'Complaint Date, Branch, Customer, and Unit Asset are required.' },
        { status: 400 }
      );
    }

    await updateIssueCase(id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof ConcurrencyConflictError || error.code === 'CONCURRENCY_CONFLICT') {
      return NextResponse.json(
        {
          error: error.message || 'Konflik Data: Kasus ini telah diubah oleh pengguna lain sejak Anda membuka form.',
          code: 'CONCURRENCY_CONFLICT',
        },
        { status: 409 }
      );
    }

    // PostgreSQL Check Violation
    if (error.code === '23514') {
      return NextResponse.json(
        {
          error: `Validasi Database: ${error.message || 'Nilai yang dimasukkan melanggar batasan logika bisnis.'}`,
          code: 'CHECK_VIOLATION',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to update issue case' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteIssueCase(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
