import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getProductModels, getUnitAssets } from '@/lib/queries/master';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'models' | 'assets' | null (both)

    if (type === 'models') {
      const models = await getProductModels();
      return NextResponse.json({ models });
    }
    if (type === 'assets') {
      const assets = await getUnitAssets();
      return NextResponse.json({ assets });
    }

    const [models, assets] = await Promise.all([
      getProductModels(),
      getUnitAssets(),
    ]);
    return NextResponse.json({ models, assets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entity, product_code, product_type_name, product_model_id, unit_model_name, serial_number, delivery_date } = body;

    if (entity === 'model') {
      const res = await query(`
        INSERT INTO product_issue.dim_product_model (product_code, product_type_name)
        VALUES ($1, $2)
        RETURNING product_model_id, product_code, product_type_name;
      `, [product_code.trim().toUpperCase(), product_type_name?.trim() || null]);
      return NextResponse.json({ success: true, model: res.rows[0] });
    }

    // Default: Unit Asset
    const res = await query(`
      INSERT INTO product_issue.dim_unit_asset (product_model_id, unit_model_name, serial_number, delivery_date)
      VALUES ($1, $2, $3, $4)
      RETURNING unit_asset_id, unit_model_name, serial_number, delivery_date;
    `, [product_model_id, unit_model_name.trim(), serial_number?.trim() || null, delivery_date || null]);

    return NextResponse.json({ success: true, asset: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { entity, product_model_id, product_code, product_type_name, unit_asset_id, unit_model_name, serial_number, delivery_date } = body;

    if (entity === 'model') {
      const res = await query(`
        UPDATE product_issue.dim_product_model
        SET product_code = $1, product_type_name = $2
        WHERE product_model_id = $3
        RETURNING product_model_id, product_code, product_type_name;
      `, [product_code.trim().toUpperCase(), product_type_name?.trim() || null, product_model_id]);
      return NextResponse.json({ success: true, model: res.rows[0] });
    }

    // Unit Asset
    const res = await query(`
      UPDATE product_issue.dim_unit_asset
      SET product_model_id = $1, unit_model_name = $2, serial_number = $3, delivery_date = $4
      WHERE unit_asset_id = $5
      RETURNING unit_asset_id, unit_model_name, serial_number, delivery_date;
    `, [product_model_id, unit_model_name.trim(), serial_number?.trim() || null, delivery_date || null, unit_asset_id]);

    return NextResponse.json({ success: true, asset: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity') || 'asset'; // 'model' | 'asset'
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (entity === 'model') {
      const check = await query(`
        SELECT COUNT(*)::int AS count FROM product_issue.dim_unit_asset WHERE product_model_id = $1;
      `, [id]);
      if (check.rows[0]?.count > 0) {
        return NextResponse.json(
          { error: `Cannot delete product model: Referenced by ${check.rows[0].count} unit asset(s).` },
          { status: 409 }
        );
      }
      await query(`DELETE FROM product_issue.dim_product_model WHERE product_model_id = $1;`, [id]);
      return NextResponse.json({ success: true });
    }

    // Unit asset delete
    const checkCases = await query(`
      SELECT COUNT(*)::int AS count FROM product_issue.fact_issue_case WHERE unit_asset_id = $1;
    `, [id]);
    if (checkCases.rows[0]?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete unit asset: Referenced in ${checkCases.rows[0].count} issue case(s).` },
        { status: 409 }
      );
    }

    await query(`DELETE FROM product_issue.dim_unit_asset WHERE unit_asset_id = $1;`, [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
