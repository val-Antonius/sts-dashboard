import { query } from '@/lib/db';
import {
  SlaPerformanceByGolongan,
  ClaimableStatusByRootCause,
  CheckpointDurationRanking,
  MonthlyCaseTrend,
  AnomalyCheckpointCount,
  AnomalyBottleneckRecorded,
  PrincipalClaimableData,
  ProductRootCauseItem,
  ProductClaimableItem,
  ProductBranchHeatmapData,
  BranchClaimableItem,
} from '@/types/database';

export async function getSlaPerformanceByGolongan(): Promise<SlaPerformanceByGolongan[]> {
  const res = await query<SlaPerformanceByGolongan>(`
    SELECT
      golongan_customer,
      achievement,
      jumlah_kasus::int,
      avg_solution_time_days::float
    FROM product_issue.v_sla_performance_by_golongan;
  `);
  return res.rows;
}

export async function getClaimableStatusByRootCause(): Promise<ClaimableStatusByRootCause[]> {
  const res = await query<ClaimableStatusByRootCause>(`
    SELECT
      claimable_status,
      COALESCE(root_cause_name, 'Not Recorded') AS root_cause_name,
      jumlah_kasus::int,
      avg_solution_time_days::float
    FROM product_issue.v_claimable_status_by_root_cause
    ORDER BY jumlah_kasus DESC;
  `);
  return res.rows;
}

export async function getCheckpointDurationRanking(): Promise<CheckpointDurationRanking[]> {
  const res = await query<CheckpointDurationRanking>(`
    SELECT
      checkpoint_name,
      avg_duration_days::float,
      median_duration_days::float,
      p90_duration_days::float,
      sla_status,
      rank_by_avg_duration::int
    FROM product_issue.v_checkpoint_duration_ranking
    ORDER BY rank_by_avg_duration ASC;
  `);
  return res.rows;
}

export interface PerformanceVolumeData {
  topBranches: { branch_code: string; count: number }[];
  topStatuses: { claimable_status_name: string; count: number }[];
  customerSegments: { golongan_customer: string; count: number }[];
  monthlyTrends: { bulan: string; cases_opened: number; cases_closed: number }[];
}

export async function getPerformanceVolumeData(
  range: string = 'last_1_year',
  customStart?: string,
  customEnd?: string
): Promise<PerformanceVolumeData> {
  let dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
  let trendStartExpr = "(CURRENT_DATE - INTERVAL '1 year')::date";
  let trendEndExpr = "CURRENT_DATE";
  let queryParams: any[] = [];

  if (range === 'this_month') {
    dateClause = "complaint_date >= date_trunc('month', CURRENT_DATE)::date";
    trendStartExpr = "date_trunc('month', CURRENT_DATE)::date";
  } else if (range === 'last_3_months') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '3 months')::date";
    trendStartExpr = "(CURRENT_DATE - INTERVAL '3 months')::date";
  } else if (range === 'last_6_months') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '6 months')::date";
    trendStartExpr = "(CURRENT_DATE - INTERVAL '6 months')::date";
  } else if (range === 'last_1_year') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
    trendStartExpr = "(CURRENT_DATE - INTERVAL '1 year')::date";
  } else if (range === 'custom' && customStart && customEnd) {
    dateClause = "complaint_date BETWEEN $1::date AND $2::date";
    trendStartExpr = "$1::date";
    trendEndExpr = "$2::date";
    queryParams = [customStart, customEnd];
  }

  // 1. Top 10 Branches
  const branchRes = await query<{ branch_code: string; count: string }>(`
    SELECT branch_code, COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY branch_code
    ORDER BY count DESC
    LIMIT 10;
  `, queryParams);

  // 2. Top 10 Claimable Statuses
  const statusRes = await query<{ claimable_status_name: string; count: string }>(`
    SELECT claimable_status_name, COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY claimable_status_name
    ORDER BY count DESC
    LIMIT 10;
  `, queryParams);

  // 3. Customer Segments
  const segmentRes = await query<{ golongan_customer: string; count: string }>(`
    SELECT golongan_customer, COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY golongan_customer
    ORDER BY count DESC;
  `, queryParams);

  // 4. Cases Opened vs Closed per Month
  const trendRes = await query<{ bulan: string; cases_opened: string; cases_closed: string }>(`
    SELECT
      TO_CHAR(bulan, 'YYYY-MM') AS bulan,
      cases_opened::int,
      cases_closed::int
    FROM product_issue.v_monthly_case_trend
    WHERE bulan >= ${trendStartExpr} AND bulan <= ${trendEndExpr}
    ORDER BY bulan ASC;
  `, queryParams);

  return {
    topBranches: branchRes.rows.map((r) => ({ branch_code: r.branch_code, count: Number(r.count) })),
    topStatuses: statusRes.rows.map((r) => ({ claimable_status_name: r.claimable_status_name, count: Number(r.count) })),
    customerSegments: segmentRes.rows.map((r) => ({ golongan_customer: r.golongan_customer, count: Number(r.count) })),
    monthlyTrends: trendRes.rows.map((r) => ({
      bulan: r.bulan,
      cases_opened: Number(r.cases_opened),
      cases_closed: Number(r.cases_closed),
    })),
  };
}

export async function getPrincipalClaimableData(
  range: string = 'last_1_year',
  customStart?: string,
  customEnd?: string
): Promise<PrincipalClaimableData> {
  let dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
  let queryParams: any[] = [];

  if (range === 'this_month') {
    dateClause = "complaint_date >= date_trunc('month', CURRENT_DATE)::date";
  } else if (range === 'last_3_months') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '3 months')::date";
  } else if (range === 'last_6_months') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '6 months')::date";
  } else if (range === 'last_1_year') {
    dateClause = "complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
  } else if (range === 'custom' && customStart && customEnd) {
    dateClause = "complaint_date BETWEEN $1::date AND $2::date";
    queryParams = [customStart, customEnd];
  }

  // 1. Total Case vs Product Code by Root Cause
  const rootCauseRows = await query<{ product_code: string; root_cause_name: string; count: string }>(`
    SELECT
      product_code,
      COALESCE(root_cause_name, 'Not Recorded') AS root_cause_name,
      COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY product_code, COALESCE(root_cause_name, 'Not Recorded')
    ORDER BY product_code, count DESC;
  `, queryParams);

  // 2. Total Case vs Product Code by Claimable Status (Claimable vs Non-Claimable)
  const claimableRows = await query<{
    product_code: string;
    claimable_count: string;
    non_claimable_count: string;
    total: string;
  }>(`
    SELECT
      product_code,
      COUNT(CASE WHEN claimable_status_name LIKE 'Claimable%' THEN 1 END)::int AS claimable_count,
      COUNT(CASE WHEN claimable_status_name NOT LIKE 'Claimable%' THEN 1 END)::int AS non_claimable_count,
      COUNT(*)::int AS total
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY product_code
    ORDER BY total DESC;
  `, queryParams);

  // 3. Total Case vs Product Code by Branch (Heatmap)
  const heatmapRows = await query<{ product_code: string; branch_code: string; count: string }>(`
    SELECT
      product_code,
      branch_code,
      COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY product_code, branch_code;
  `, queryParams);

  // 4. Total Case vs Claimable Status by Branch (Grouped Column Chart)
  const branchClaimableRows = await query<{
    branch_code: string;
    claimable_status_name: string;
    count: string;
  }>(`
    SELECT
      branch_code,
      claimable_status_name,
      COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY branch_code, claimable_status_name
    ORDER BY branch_code, count DESC;
  `, queryParams);

  // --- Transform 1: Product Code by Root Cause (Stacked Horizontal Bar) ---
  const productTotals: Record<string, number> = {};
  const productRootCauseMap: Record<string, Record<string, number>> = {};
  const rootCauseSet = new Set<string>();

  rootCauseRows.rows.forEach((r) => {
    const p = r.product_code;
    const rc = r.root_cause_name;
    const c = Number(r.count);

    productTotals[p] = (productTotals[p] || 0) + c;
    if (!productRootCauseMap[p]) productRootCauseMap[p] = {};
    productRootCauseMap[p][rc] = c;
    rootCauseSet.add(rc);
  });

  const rootCauseKeys = Array.from(rootCauseSet).sort();

  // Order products descending by total cases
  const sortedProducts = Object.keys(productTotals).sort(
    (a, b) => productTotals[b] - productTotals[a]
  );

  const productRootCauseData: ProductRootCauseItem[] = sortedProducts.map((p) => {
    const item: ProductRootCauseItem = {
      product_code: p,
      total: productTotals[p],
    };
    rootCauseKeys.forEach((k) => {
      item[k] = productRootCauseMap[p]?.[k] || 0;
    });
    return item;
  });

  // --- Transform 2: Product Code by Claimable Status (100% Stacked Bar) ---
  const productClaimableData: ProductClaimableItem[] = claimableRows.rows.map((r) => {
    const total = Number(r.total);
    const claimable = Number(r.claimable_count);
    const nonClaimable = Number(r.non_claimable_count);
    const claimablePct = total > 0 ? Math.round((claimable / total) * 100) : 0;
    const nonClaimablePct = total > 0 ? 100 - claimablePct : 0;

    return {
      product_code: r.product_code,
      total,
      claimable_count: claimable,
      non_claimable_count: nonClaimable,
      claimable_pct: claimablePct,
      non_claimable_pct: nonClaimablePct,
    };
  });

  // --- Transform 3: Product Code by Branch (Heatmap) ---
  const branchSet = new Set<string>();
  const heatmapMatrix: Record<string, Record<string, number>> = {};
  let maxHeatmapCount = 0;

  sortedProducts.forEach((p) => {
    heatmapMatrix[p] = {};
  });

  heatmapRows.rows.forEach((r) => {
    const p = r.product_code;
    const b = r.branch_code;
    const c = Number(r.count);

    branchSet.add(b);
    if (!heatmapMatrix[p]) heatmapMatrix[p] = {};
    heatmapMatrix[p][b] = c;
    if (c > maxHeatmapCount) maxHeatmapCount = c;
  });

  const sortedBranches = Array.from(branchSet).sort();

  const productBranchHeatmap: ProductBranchHeatmapData = {
    products: sortedProducts,
    branches: sortedBranches,
    matrix: heatmapMatrix,
    maxCount: maxHeatmapCount,
  };

  // --- Transform 4: Branch by Claimable Status (Grouped Column Chart) ---
  const branchTotals: Record<string, number> = {};
  const branchStatusMap: Record<string, Record<string, number>> = {};
  const statusSet = new Set<string>();

  branchClaimableRows.rows.forEach((r) => {
    const b = r.branch_code;
    const s = r.claimable_status_name;
    const c = Number(r.count);

    branchTotals[b] = (branchTotals[b] || 0) + c;
    if (!branchStatusMap[b]) branchStatusMap[b] = {};
    branchStatusMap[b][s] = c;
    statusSet.add(s);
  });

  const statusKeys = Array.from(statusSet).sort();
  const sortedBranchList = Object.keys(branchTotals).sort(
    (a, b) => branchTotals[b] - branchTotals[a]
  );

  const branchClaimableData: BranchClaimableItem[] = sortedBranchList.map((b) => {
    const item: BranchClaimableItem = {
      branch_code: b,
      total: branchTotals[b],
    };
    statusKeys.forEach((s) => {
      item[s] = branchStatusMap[b]?.[s] || 0;
    });
    return item;
  });

  return {
    productRootCauses: {
      data: productRootCauseData,
      rootCauseKeys,
    },
    productClaimable: productClaimableData,
    productBranchHeatmap,
    branchClaimable: {
      data: branchClaimableData,
      statusKeys,
    },
  };
}

export async function getAnomalyData(): Promise<{
  checkpointAnomalies: AnomalyCheckpointCount[];
  bottleneckStats: AnomalyBottleneckRecorded[];
}> {
  const checkpointRes = await query<AnomalyCheckpointCount>(`
    SELECT
      issue_case_id,
      customer_name,
      branch_code,
      recorded_checkpoint_count::int,
      expected_checkpoint_count::int,
      is_anomaly
    FROM product_issue.v_anomaly_checkpoint_count
    ORDER BY recorded_checkpoint_count ASC;
  `);

  const bottleneckRes = await query<AnomalyBottleneckRecorded>(`
    SELECT
      has_bottleneck_recorded,
      jumlah_kasus::int,
      pct_of_total::float
    FROM product_issue.v_anomaly_bottleneck_recorded;
  `);

  return {
    checkpointAnomalies: checkpointRes.rows,
    bottleneckStats: bottleneckRes.rows,
  };
}
