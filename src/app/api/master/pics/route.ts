import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPics } from '@/lib/queries/master';

export async function GET() {
  try {
    const pics = await getPics();
    return NextResponse.json({ pics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pic_name, pic_role_code } = body;

    const res = await query(`
      INSERT INTO product_issue.dim_pic (pic_name, pic_role_code)
      VALUES ($1, $2)
      RETURNING pic_id, pic_name, pic_role_code;
    `, [pic_name.trim(), pic_role_code?.trim() || null]);

    return NextResponse.json({ success: true, pic: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { pic_id, pic_name, pic_role_code } = body;

    const res = await query(`
      UPDATE product_issue.dim_pic
      SET pic_name = $1, pic_role_code = $2
      WHERE pic_id = $3
      RETURNING pic_id, pic_name, pic_role_code;
    `, [pic_name.trim(), pic_role_code?.trim() || null, pic_id]);

    return NextResponse.json({ success: true, pic: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'PIC ID is required' }, { status: 400 });

    const check = await query(`
      SELECT COUNT(*)::int AS count FROM product_issue.fact_issue_case WHERE pic_id = $1;
    `, [id]);

    if (check.rows[0]?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete PIC: Assigned to ${check.rows[0].count} active or historical issue case(s).` },
        { status: 409 }
      );
    }

    await query(`DELETE FROM product_issue.dim_pic WHERE pic_id = $1;`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
