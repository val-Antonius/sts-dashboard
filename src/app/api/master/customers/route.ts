import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCustomerGroups, getCustomers } from '@/lib/queries/master';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'groups' | 'customers' | null (both)

    if (type === 'groups') {
      const groups = await getCustomerGroups();
      return NextResponse.json({ groups });
    }
    if (type === 'customers') {
      const customers = await getCustomers();
      return NextResponse.json({ customers });
    }

    const [groups, customers] = await Promise.all([
      getCustomerGroups(),
      getCustomers(),
    ]);
    return NextResponse.json({ groups, customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entity, group_name, key_account_type, customer_name, customer_group_id } = body;

    if (entity === 'group') {
      const res = await query(`
        INSERT INTO product_issue.dim_customer_group (group_name, key_account_type)
        VALUES ($1, $2)
        RETURNING customer_group_id, group_name, key_account_type;
      `, [group_name.trim(), key_account_type?.trim() || null]);
      return NextResponse.json({ success: true, group: res.rows[0] });
    }

    // Customer
    const res = await query(`
      INSERT INTO product_issue.dim_customer (customer_name, customer_group_id)
      VALUES ($1, $2)
      RETURNING customer_id, customer_name, customer_group_id;
    `, [customer_name.trim(), customer_group_id || null]);

    return NextResponse.json({ success: true, customer: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { entity, customer_group_id, group_name, key_account_type, customer_id, customer_name } = body;

    if (entity === 'group') {
      const res = await query(`
        UPDATE product_issue.dim_customer_group
        SET group_name = $1, key_account_type = $2, updated_at = now()
        WHERE customer_group_id = $3
        RETURNING customer_group_id, group_name, key_account_type;
      `, [group_name.trim(), key_account_type?.trim() || null, customer_group_id]);
      return NextResponse.json({ success: true, group: res.rows[0] });
    }

    // Customer
    const res = await query(`
      UPDATE product_issue.dim_customer
      SET customer_name = $1, customer_group_id = $2, updated_at = now()
      WHERE customer_id = $3
      RETURNING customer_id, customer_name, customer_group_id;
    `, [customer_name.trim(), customer_group_id || null, customer_id]);

    return NextResponse.json({ success: true, customer: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity') || 'customer';
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (entity === 'group') {
      const check = await query(`
        SELECT COUNT(*)::int AS count FROM product_issue.dim_customer WHERE customer_group_id = $1;
      `, [id]);
      if (check.rows[0]?.count > 0) {
        return NextResponse.json(
          { error: `Cannot delete customer group: Linked to ${check.rows[0].count} customer(s).` },
          { status: 409 }
        );
      }
      await query(`DELETE FROM product_issue.dim_customer_group WHERE customer_group_id = $1;`, [id]);
      return NextResponse.json({ success: true });
    }

    // Customer delete
    const checkCases = await query(`
      SELECT COUNT(*)::int AS count FROM product_issue.fact_issue_case WHERE customer_id = $1;
    `, [id]);
    if (checkCases.rows[0]?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete customer: Referenced in ${checkCases.rows[0].count} issue case(s).` },
        { status: 409 }
      );
    }

    await query(`DELETE FROM product_issue.dim_customer WHERE customer_id = $1;`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
