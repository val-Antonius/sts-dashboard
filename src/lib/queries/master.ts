import { query } from '@/lib/db';
import {
  DimBranch,
  DimBranchLocation,
  DimPic,
  DimProductModel,
  DimUnitAsset,
  DimCustomerGroup,
  DimCustomer,
  RefClaimableStatus,
  RefRootCause,
  RefBottleneckReason,
  RefUnitCondition,
  RefPartReadiness,
} from '@/types/database';

// 1. Branches & Locations
export async function getBranches(): Promise<DimBranch[]> {
  const res = await query<DimBranch>(`
    SELECT
      b.branch_id,
      b.branch_code,
      b.branch_name,
      b.branch_location_id,
      bl.city_name,
      b.created_at::text
    FROM product_issue.dim_branch b
    LEFT JOIN product_issue.dim_branch_location bl ON bl.branch_location_id = b.branch_location_id
    ORDER BY b.branch_code ASC;
  `);
  return res.rows;
}

export async function getBranchLocations(): Promise<DimBranchLocation[]> {
  const res = await query<DimBranchLocation>(`
    SELECT branch_location_id, city_name
    FROM product_issue.dim_branch_location
    ORDER BY city_name ASC;
  `);
  return res.rows;
}

// 2. PICs
export async function getPics(): Promise<DimPic[]> {
  const res = await query<DimPic>(`
    SELECT pic_id, pic_name, pic_role_code
    FROM product_issue.dim_pic
    ORDER BY pic_name ASC;
  `);
  return res.rows;
}

// 3. Products & Unit Assets
export async function getProductModels(): Promise<DimProductModel[]> {
  const res = await query<DimProductModel>(`
    SELECT
      pm.product_model_id,
      pm.product_code,
      pm.product_type_name,
      COUNT(ua.unit_asset_id)::int AS total_units
    FROM product_issue.dim_product_model pm
    LEFT JOIN product_issue.dim_unit_asset ua ON ua.product_model_id = pm.product_model_id
    GROUP BY pm.product_model_id, pm.product_code, pm.product_type_name
    ORDER BY pm.product_code ASC;
  `);
  return res.rows;
}

export async function getUnitAssets(): Promise<DimUnitAsset[]> {
  const res = await query<DimUnitAsset>(`
    SELECT
      ua.unit_asset_id,
      ua.product_model_id,
      ua.unit_model_name,
      ua.serial_number,
      ua.delivery_date::text,
      pm.product_code,
      pm.product_type_name,
      COUNT(ic.issue_case_id)::int AS total_issue_cases,
      ua.created_at::text
    FROM product_issue.dim_unit_asset ua
    JOIN product_issue.dim_product_model pm ON pm.product_model_id = ua.product_model_id
    LEFT JOIN product_issue.fact_issue_case ic ON ic.unit_asset_id = ua.unit_asset_id
    GROUP BY ua.unit_asset_id, ua.product_model_id, ua.unit_model_name, ua.serial_number, ua.delivery_date, pm.product_code, pm.product_type_name, ua.created_at
    ORDER BY ua.unit_model_name ASC, ua.serial_number ASC;
  `);
  return res.rows;
}

// 4. Customer Groups & Customers
export async function getCustomerGroups(): Promise<DimCustomerGroup[]> {
  const res = await query<DimCustomerGroup>(`
    SELECT
      customer_group_id,
      group_name,
      key_account_type,
      created_at::text
    FROM product_issue.dim_customer_group
    ORDER BY group_name ASC;
  `);
  return res.rows;
}

export async function getCustomers(): Promise<DimCustomer[]> {
  const res = await query<DimCustomer>(`
    SELECT
      c.customer_id,
      c.customer_name,
      c.customer_group_id,
      cg.group_name,
      cg.key_account_type,
      CASE
        WHEN cg.key_account_type = 'KA NASIONAL' THEN 'KA Nasional'
        ELSE 'All Customer'
      END AS golongan_customer,
      COUNT(ic.issue_case_id)::int AS total_issue_cases,
      c.created_at::text
    FROM product_issue.dim_customer c
    LEFT JOIN product_issue.dim_customer_group cg ON cg.customer_group_id = c.customer_group_id
    LEFT JOIN product_issue.fact_issue_case ic ON ic.customer_id = c.customer_id
    GROUP BY c.customer_id, c.customer_name, c.customer_group_id, cg.group_name, cg.key_account_type, c.created_at
    ORDER BY c.customer_name ASC;
  `);
  return res.rows;
}

// 5. Lookups / References
export async function getClaimableStatuses(): Promise<RefClaimableStatus[]> {
  const res = await query<RefClaimableStatus>(`
    SELECT claimable_status_id, status_name, is_warranty_scope
    FROM product_issue.ref_claimable_status
    ORDER BY status_name ASC;
  `);
  return res.rows;
}

export async function getRootCauses(): Promise<RefRootCause[]> {
  const res = await query<RefRootCause>(`
    SELECT root_cause_id, root_cause_name
    FROM product_issue.ref_root_cause
    ORDER BY root_cause_name ASC;
  `);
  return res.rows;
}

export async function getBottleneckReasons(): Promise<RefBottleneckReason[]> {
  const res = await query<RefBottleneckReason>(`
    SELECT bottleneck_id, bottleneck_name
    FROM product_issue.ref_bottleneck_reason
    ORDER BY bottleneck_name ASC;
  `);
  return res.rows;
}

export async function getUnitConditions(): Promise<RefUnitCondition[]> {
  const res = await query<RefUnitCondition>(`
    SELECT unit_condition_id, condition_name
    FROM product_issue.ref_unit_condition
    ORDER BY condition_name ASC;
  `);
  return res.rows;
}

export async function getPartReadinesses(): Promise<RefPartReadiness[]> {
  const res = await query<RefPartReadiness>(`
    SELECT part_readiness_id, readiness_name
    FROM product_issue.ref_part_readiness
    ORDER BY readiness_name ASC;
  `);
  return res.rows;
}
