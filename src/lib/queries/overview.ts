import { query } from '@/lib/db';
import {
  CaseKpiRealtime,
  ActiveCaseCurrentMonth,
  PicBranchWorkloadCurrentMonth,
} from '@/types/database';

export async function getCaseKpiRealtime(): Promise<CaseKpiRealtime> {
  const res = await query<CaseKpiRealtime>(`
    SELECT
      total_active_cases::int,
      overdue_all_customer::int,
      overdue_ka_nasional::int
    FROM product_issue.v_case_kpi_realtime;
  `);
  return res.rows[0] || {
    total_active_cases: 0,
    overdue_all_customer: 0,
    overdue_ka_nasional: 0,
  };
}

export async function getActiveCasesCurrentMonth(): Promise<ActiveCaseCurrentMonth[]> {
  const res = await query<ActiveCaseCurrentMonth>(`
    SELECT
      issue_case_id,
      customer_name,
      branch_code,
      pic_name,
      product_code,
      unit_model_name,
      serial_number,
      solution_time_days::int,
      achievement_threshold_days::int,
      claimable_status_name,
      root_cause_name,
      is_carried_over
    FROM product_issue.v_active_cases_current_month
    ORDER BY solution_time_days DESC;
  `);
  return res.rows;
}

export async function getPicBranchWorkloadCurrentMonth(): Promise<PicBranchWorkloadCurrentMonth[]> {
  const res = await query<PicBranchWorkloadCurrentMonth>(`
    SELECT
      pic_id,
      pic_name,
      branch_code,
      total_active_cases::int,
      total_overdue_cases::int,
      total_carried_over_cases::int
    FROM product_issue.v_pic_branch_workload_current_month;
  `);
  return res.rows;
}

export interface BranchCount {
  branch_code: string;
  count: number;
}

export interface StatusCount {
  claimable_status_name: string;
  count: number;
}

export interface RootCauseCount {
  root_cause_name: string;
  count: number;
}

export interface ProductCodeCount {
  product_code: string;
  count: number;
}

export interface SegmentCount {
  golongan_customer: string;
  count: number;
}

export interface OverviewChartData {
  topBranches: BranchCount[];
  topStatuses: StatusCount[];
  topRootCauses: RootCauseCount[];
  topProductCodes: ProductCodeCount[];
  customerSegments: SegmentCount[];
  carriedOverByBranch: BranchCount[];
}

export async function getOverviewChartsData(
  range: string = 'this_month',
  customStart?: string,
  customEnd?: string
): Promise<OverviewChartData> {
  let dateClause = "complaint_date >= date_trunc('month', CURRENT_DATE)::date";
  let queryParams: any[] = [];

  if (range === 'last_3_months') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '3 months')::date";
  } else if (range === 'last_6_months') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '6 months')::date";
  } else if (range === 'last_1_year') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
  } else if (range === 'custom' && customStart && customEnd) {
    dateClause = "complaint_date BETWEEN $1::date AND $2::date";
    queryParams = [customStart, customEnd];
  }

  // 1. Top 5 Active Cases by Branch
  const branchRes = await query<{ branch_code: string; count: string }>(`
    SELECT branch_code, COUNT(*)::int AS count
    FROM product_issue.v_active_case_dimensions
    WHERE ${dateClause}
    GROUP BY branch_code
    ORDER BY count DESC
    LIMIT 5;
  `, queryParams);

  // 2. Top 5 Active Cases by Claimable Status
  const statusRes = await query<{ claimable_status_name: string; count: string }>(`
    SELECT claimable_status_name, COUNT(*)::int AS count
    FROM product_issue.v_active_case_dimensions
    WHERE ${dateClause}
    GROUP BY claimable_status_name
    ORDER BY count DESC
    LIMIT 5;
  `, queryParams);

  // 3. Top 5 Active Cases by Root Cause
  const rootCauseRes = await query<{ root_cause_name: string; count: string }>(`
    SELECT COALESCE(root_cause_name, 'Not Recorded') AS root_cause_name, COUNT(*)::int AS count
    FROM product_issue.v_active_case_dimensions
    WHERE ${dateClause}
    GROUP BY COALESCE(root_cause_name, 'Not Recorded')
    ORDER BY count DESC
    LIMIT 5;
  `, queryParams);

  // 4. Top 5 Active Cases by Product Code
  const productCodeRes = await query<{ product_code: string; count: string }>(`
    SELECT product_code, COUNT(*)::int AS count
    FROM product_issue.v_active_case_dimensions
    WHERE ${dateClause}
    GROUP BY product_code
    ORDER BY count DESC
    LIMIT 5;
  `, queryParams);

  // 5. Active Case Volume by Customer Segment (All Customer vs KA Nasional)
  const segmentRes = await query<{ golongan_customer: string; count: string }>(`
    SELECT golongan_customer, COUNT(*)::int AS count
    FROM product_issue.v_active_case_dimensions
    WHERE ${dateClause}
    GROUP BY golongan_customer
    ORDER BY count DESC;
  `, queryParams);

  // 6. Carried-Over Backlog by Branch
  let carriedRes;
  if (range === 'this_month') {
    carriedRes = await query<{ branch_code: string; count: string }>(`
      SELECT branch_code, COUNT(*)::int AS count
      FROM product_issue.v_active_case_dimensions
      WHERE ${dateClause} AND is_carried_over = true
      GROUP BY branch_code
      ORDER BY count DESC
      LIMIT 8;
    `, queryParams);
  } else {
    // For ranges wider than this month, query fn_carried_over_cases for the range
    let startMonthExpr = "date_trunc('month', (CURRENT_DATE - INTERVAL '3 months'))::date";
    if (range === 'last_6_months') {
      startMonthExpr = "date_trunc('month', (CURRENT_DATE - INTERVAL '6 months'))::date";
    } else if (range === 'last_1_year') {
      startMonthExpr = "date_trunc('month', (CURRENT_DATE - INTERVAL '1 year'))::date";
    } else if (range === 'custom' && customStart) {
      startMonthExpr = "$1::date";
    }

    carriedRes = await query<{ branch_code: string; count: string }>(`
      WITH months AS (
        SELECT generate_series(
          ${range === 'custom' ? "$1::date" : startMonthExpr},
          ${range === 'custom' ? "$2::date" : "CURRENT_DATE"},
          '1 month'::interval
        )::date AS m
      ),
      co_eval AS (
        SELECT DISTINCT m.m, co.issue_case_id, ic.branch_id
        FROM months m
        CROSS JOIN LATERAL product_issue.fn_carried_over_cases(m.m) co
        JOIN product_issue.fact_issue_case ic ON ic.issue_case_id = co.issue_case_id
        WHERE co.is_carried_over = true
      )
      SELECT b.branch_code, COUNT(DISTINCT co_eval.issue_case_id)::int AS count
      FROM co_eval
      JOIN product_issue.dim_branch b ON b.branch_id = co_eval.branch_id
      GROUP BY b.branch_code
      ORDER BY count DESC
      LIMIT 8;
    `, range === 'custom' ? [customStart, customEnd] : []);
  }

  return {
    topBranches: branchRes.rows.map((r) => ({ branch_code: r.branch_code, count: Number(r.count) })),
    topStatuses: statusRes.rows.map((r) => ({ claimable_status_name: r.claimable_status_name, count: Number(r.count) })),
    topRootCauses: rootCauseRes.rows.map((r) => ({ root_cause_name: r.root_cause_name, count: Number(r.count) })),
    topProductCodes: productCodeRes.rows.map((r) => ({ product_code: r.product_code, count: Number(r.count) })),
    customerSegments: segmentRes.rows.map((r) => ({ golongan_customer: r.golongan_customer, count: Number(r.count) })),
    carriedOverByBranch: carriedRes.rows.map((r) => ({ branch_code: r.branch_code, count: Number(r.count) })),
  };
}
