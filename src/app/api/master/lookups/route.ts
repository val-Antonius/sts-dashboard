import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  getClaimableStatuses,
  getRootCauses,
  getBottleneckReasons,
  getUnitConditions,
  getPartReadinesses,
} from '@/lib/queries/master';

export async function GET() {
  try {
    const [
      claimableStatuses,
      rootCauses,
      bottlenecks,
      conditions,
      readinesses,
    ] = await Promise.all([
      getClaimableStatuses(),
      getRootCauses(),
      getBottleneckReasons(),
      getUnitConditions(),
      getPartReadinesses(),
    ]);

    return NextResponse.json({
      claimableStatuses,
      rootCauses,
      bottlenecks,
      conditions,
      readinesses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, is_warranty_scope } = body;

    if (type === 'root_cause') {
      const res = await query(`
        INSERT INTO product_issue.ref_root_cause (root_cause_name)
        VALUES ($1)
        RETURNING root_cause_id, root_cause_name;
      `, [name.trim()]);
      return NextResponse.json({ success: true, item: res.rows[0] });
    }

    if (type === 'claimable_status') {
      const res = await query(`
        INSERT INTO product_issue.ref_claimable_status (status_name, is_warranty_scope)
        VALUES ($1, $2)
        RETURNING claimable_status_id, status_name, is_warranty_scope;
      `, [name.trim(), Boolean(is_warranty_scope)]);
      return NextResponse.json({ success: true, item: res.rows[0] });
    }

    if (type === 'bottleneck') {
      const res = await query(`
        INSERT INTO product_issue.ref_bottleneck_reason (bottleneck_name)
        VALUES ($1)
        RETURNING bottleneck_id, bottleneck_name;
      `, [name.trim()]);
      return NextResponse.json({ success: true, item: res.rows[0] });
    }

    return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, name, is_warranty_scope } = body;

    if (type === 'root_cause') {
      const res = await query(`
        UPDATE product_issue.ref_root_cause
        SET root_cause_name = $1
        WHERE root_cause_id = $2
        RETURNING root_cause_id, root_cause_name;
      `, [name.trim(), id]);
      return NextResponse.json({ success: true, item: res.rows[0] });
    }

    if (type === 'claimable_status') {
      const res = await query(`
        UPDATE product_issue.ref_claimable_status
        SET status_name = $1, is_warranty_scope = $2
        WHERE claimable_status_id = $3
        RETURNING claimable_status_id, status_name, is_warranty_scope;
      `, [name.trim(), Boolean(is_warranty_scope), id]);
      return NextResponse.json({ success: true, item: res.rows[0] });
    }

    if (type === 'bottleneck') {
      const res = await query(`
        UPDATE product_issue.ref_bottleneck_reason
        SET bottleneck_name = $1
        WHERE bottleneck_id = $2
        RETURNING bottleneck_id, bottleneck_name;
      `, [name.trim(), id]);
      return NextResponse.json({ success: true, item: res.rows[0] });
    }

    return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id || !type) return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });

    if (type === 'root_cause') {
      const check = await query(`
        SELECT COUNT(*)::int AS count FROM product_issue.fact_issue_case WHERE root_cause_id = $1;
      `, [id]);
      if (check.rows[0]?.count > 0) {
        return NextResponse.json(
          { error: `Cannot delete Root Cause: Referenced in ${check.rows[0].count} case(s).` },
          { status: 409 }
        );
      }
      await query(`DELETE FROM product_issue.ref_root_cause WHERE root_cause_id = $1;`, [id]);
      return NextResponse.json({ success: true });
    }

    if (type === 'claimable_status') {
      const check = await query(`
        SELECT COUNT(*)::int AS count FROM product_issue.claim WHERE claimable_status_id = $1;
      `, [id]);
      if (check.rows[0]?.count > 0) {
        return NextResponse.json(
          { error: `Cannot delete Claim Status: Referenced in ${check.rows[0].count} case claim(s).` },
          { status: 409 }
        );
      }
      await query(`DELETE FROM product_issue.ref_claimable_status WHERE claimable_status_id = $1;`, [id]);
      return NextResponse.json({ success: true });
    }

    if (type === 'bottleneck') {
      const check = await query(`
        SELECT COUNT(*)::int AS count FROM product_issue.fact_issue_case WHERE bottleneck_id = $1;
      `, [id]);
      if (check.rows[0]?.count > 0) {
        return NextResponse.json(
          { error: `Cannot delete Bottleneck Reason: Referenced in ${check.rows[0].count} case(s).` },
          { status: 409 }
        );
      }
      await query(`DELETE FROM product_issue.ref_bottleneck_reason WHERE bottleneck_id = $1;`, [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid lookup type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
