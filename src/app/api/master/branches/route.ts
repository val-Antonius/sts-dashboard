import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getBranches, getBranchLocations } from '@/lib/queries/master';

export async function GET() {
  try {
    const [branches, locations] = await Promise.all([
      getBranches(),
      getBranchLocations(),
    ]);
    return NextResponse.json({ branches, locations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { branch_code, branch_name, branch_location_id, city_name } = body;

    let locationId = branch_location_id;
    // If a new city name was provided
    if (!locationId && city_name) {
      const locRes = await query<{ branch_location_id: string }>(`
        INSERT INTO product_issue.dim_branch_location (city_name)
        VALUES ($1)
        ON CONFLICT (city_name) DO UPDATE SET city_name = EXCLUDED.city_name
        RETURNING branch_location_id;
      `, [city_name.trim()]);
      locationId = locRes.rows[0]?.branch_location_id;
    }

    const res = await query(`
      INSERT INTO product_issue.dim_branch (branch_code, branch_name, branch_location_id)
      VALUES ($1, $2, $3)
      RETURNING branch_id, branch_code, branch_name;
    `, [branch_code.trim().toUpperCase(), branch_name?.trim() || null, locationId || null]);

    return NextResponse.json({ success: true, branch: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { branch_id, branch_code, branch_name, branch_location_id } = body;

    const res = await query(`
      UPDATE product_issue.dim_branch
      SET branch_code = $1, branch_name = $2, branch_location_id = $3
      WHERE branch_id = $4
      RETURNING branch_id, branch_code, branch_name;
    `, [branch_code.trim().toUpperCase(), branch_name?.trim() || null, branch_location_id || null, branch_id]);

    return NextResponse.json({ success: true, branch: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });

    // Check foreign key references
    const check = await query(`
      SELECT COUNT(*)::int AS count FROM product_issue.fact_issue_case WHERE branch_id = $1;
    `, [id]);

    if (check.rows[0]?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete branch: It is currently referenced in ${check.rows[0].count} issue case(s).` },
        { status: 409 }
      );
    }

    await query(`DELETE FROM product_issue.dim_branch WHERE branch_id = $1;`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
