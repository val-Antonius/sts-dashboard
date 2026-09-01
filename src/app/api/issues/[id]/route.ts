import { NextRequest, NextResponse } from 'next/server';
import { getIssueDetailFull, updateIssueCase, deleteIssueCase } from '@/lib/queries/issues';

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
    return NextResponse.json({ error: error.message }, { status: 400 });
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
