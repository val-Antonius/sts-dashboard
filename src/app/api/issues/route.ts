import { NextRequest, NextResponse } from 'next/server';
import { getIssueManagementList, createIssueCase } from '@/lib/queries/issues';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status_wo = searchParams.get('status_wo') || undefined;
    const branch_id = searchParams.get('branch_id') || undefined;
    const product_code = searchParams.get('product_code') || undefined;
    const claimable_status_id = searchParams.get('claimable_status_id') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;

    const data = await getIssueManagementList({
      search,
      status_wo,
      branch_id,
      product_code,
      claimable_status_id,
      limit,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation: only core essentials required
    if (!body.complaint_date) {
      return NextResponse.json({ error: 'Complaint Date is required' }, { status: 400 });
    }
    if (!body.branch_id) {
      return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    }
    if (!body.customer_id) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }
    if (!body.unit_asset_id) {
      return NextResponse.json({ error: 'Unit Asset is required' }, { status: 400 });
    }

    const result = await createIssueCase(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
