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
  ProductClaimableDotPlotItem,
  FaultGroupType,
  ProductFaultAttributionPanel,
  ProductFaultRootCauseItem,
  FaultAttributionGroup,
  FaultAttributionItem,
  BranchOutcomeProfileItem,
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
      checkpoint_code,
      n_kejadian::int,
      avg_durasi::float,
      median_durasi::float,
      rank_by_avg_duration::int
    FROM product_issue.v_checkpoint_duration_ranking
    ORDER BY rank_by_avg_duration ASC;
  `);
  return res.rows;
}

export interface BranchRiskItem {
  branch_code: string;
  branch_city: string;
  total_cases: number;
  unclaimable_cases: number;
  unclaimable_pct: number;
  overdue_cases: number;
  overdue_pct: number;
  avg_solution_days: number;
}

export interface ClaimableHealthData {
  claimable_count: number;
  claimable_pct: number;
  unclaimable_count: number;
  unclaimable_pct: number;
  other_count: number;
  other_pct: number;
  tailBreakdown: { status_name: string; count: number; pct: number }[];
}

export interface MonthlyBacklogFlowItem {
  bulan: string;
  cases_opened: number;
  cases_closed: number;
  net_backlog: number; // opened - closed
}

export interface PerformanceVolumeData {
  segment: string;
  kpiStats: {
    total_cases: number;
    sla_target_days: number;
    unclaimable_pct: number;
    overdue_count: number;
  };
  branchRiskMatrix: BranchRiskItem[];
  claimableHealth: ClaimableHealthData;
  monthlyBacklogFlow: MonthlyBacklogFlowItem[];
  // Retain legacy fields for backward compatibility
  topBranches: { branch_code: string; count: number }[];
  topStatuses: { claimable_status_name: string; count: number }[];
  customerSegments: { golongan_customer: string; count: number }[];
  monthlyTrends: { bulan: string; cases_opened: number; cases_closed: number }[];
}

export async function getPerformanceVolumeData(
  range: string = 'last_1_year',
  customStart?: string,
  customEnd?: string,
  segment: string = 'all'
): Promise<PerformanceVolumeData> {
  let dateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
  let trendStartExpr = "(CURRENT_DATE - INTERVAL '1 year')::date";
  let trendEndExpr = "CURRENT_DATE";
  let queryParams: any[] = [];

  if (range === 'this_month') {
    dateClause = "ic.complaint_date >= date_trunc('month', CURRENT_DATE)::date";
    trendStartExpr = "date_trunc('month', CURRENT_DATE)::date";
  } else if (range === 'last_3_months') {
    dateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '3 months')::date";
    trendStartExpr = "(CURRENT_DATE - INTERVAL '3 months')::date";
  } else if (range === 'last_6_months') {
    dateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '6 months')::date";
    trendStartExpr = "(CURRENT_DATE - INTERVAL '6 months')::date";
  } else if (range === 'last_1_year') {
    dateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
    trendStartExpr = "(CURRENT_DATE - INTERVAL '1 year')::date";
  } else if (range === 'custom' && customStart && customEnd) {
    dateClause = "ic.complaint_date BETWEEN $1::date AND $2::date";
    trendStartExpr = "$1::date";
    trendEndExpr = "$2::date";
    queryParams = [customStart, customEnd];
  }

  // Segment filtering
  let segmentFilter = "";
  if (segment === 'KA Nasional') {
    segmentFilter = "AND m.golongan_customer = 'KA Nasional'";
  } else if (segment === 'All Customer') {
    segmentFilter = "AND m.golongan_customer = 'All Customer'";
  }

  // 1. Branch Risk Matrix (Volume x Unclaimable x Overdue)
  const branchRiskRes = await query<{
    branch_code: string;
    branch_city: string;
    total_cases: string;
    unclaimable_cases: string;
    overdue_cases: string;
    avg_solution_days: string;
  }>(`
    SELECT
      b.branch_code,
      COALESCE(bl.city_name, b.branch_code) AS branch_city,
      COUNT(*)::int AS total_cases,
      COUNT(*) FILTER (WHERE m.is_warranty_scope = false OR m.claimable_status_name = 'Unclaimable')::int AS unclaimable_cases,
      COUNT(*) FILTER (WHERE m.achievement = 'Not Achieved' OR m.solution_time_days > m.achievement_threshold_days)::int AS overdue_cases,
      ROUND(AVG(m.solution_time_days), 1)::float AS avg_solution_days
    FROM product_issue.fact_issue_case ic
    JOIN product_issue.dim_branch b ON b.branch_id = ic.branch_id
    LEFT JOIN product_issue.dim_branch_location bl ON bl.branch_location_id = b.branch_location_id
    JOIN product_issue.v_claim_metrics m ON m.issue_case_id = ic.issue_case_id
    WHERE ${dateClause} ${segmentFilter}
    GROUP BY b.branch_code, COALESCE(bl.city_name, b.branch_code)
    ORDER BY total_cases DESC;
  `, queryParams);

  const branchRiskMatrix: BranchRiskItem[] = branchRiskRes.rows.map((r) => {
    const total = Number(r.total_cases) || 0;
    const unclaim = Number(r.unclaimable_cases) || 0;
    const overdue = Number(r.overdue_cases) || 0;
    return {
      branch_code: r.branch_code,
      branch_city: r.branch_city,
      total_cases: total,
      unclaimable_cases: unclaim,
      unclaimable_pct: total > 0 ? Math.round((unclaim / total) * 1000) / 10 : 0,
      overdue_cases: overdue,
      overdue_pct: total > 0 ? Math.round((overdue / total) * 1000) / 10 : 0,
      avg_solution_days: Number(r.avg_solution_days) || 0,
    };
  });

  // 2. Claimable Health Breakdown
  const claimableRes = await query<{
    claimable_status_name: string;
    is_warranty_scope: boolean;
    count: string;
  }>(`
    SELECT
      COALESCE(m.claimable_status_name, 'Not Recorded') AS claimable_status_name,
      COALESCE(m.is_warranty_scope, false) AS is_warranty_scope,
      COUNT(*)::int AS count
    FROM product_issue.fact_issue_case ic
    JOIN product_issue.v_claim_metrics m ON m.issue_case_id = ic.issue_case_id
    WHERE ${dateClause} ${segmentFilter}
    GROUP BY m.claimable_status_name, m.is_warranty_scope
    ORDER BY count DESC;
  `, queryParams);

  const totalFilteredCases = claimableRes.rows.reduce((sum, r) => sum + Number(r.count), 0) || 1;
  let claimableCount = 0;
  let unclaimableCount = 0;
  let otherCount = 0;

  const tailBreakdown = claimableRes.rows.map((r) => {
    const count = Number(r.count);
    const isClaimable = r.is_warranty_scope || r.claimable_status_name.toLowerCase().includes('claimable') || r.claimable_status_name.toLowerCase().includes('goodwill');
    const isUnclaimable = !r.is_warranty_scope && r.claimable_status_name.toLowerCase().includes('unclaimable');

    if (isUnclaimable) {
      unclaimableCount += count;
    } else if (isClaimable) {
      claimableCount += count;
    } else {
      otherCount += count;
    }

    return {
      status_name: r.claimable_status_name,
      count,
      pct: Math.round((count / totalFilteredCases) * 1000) / 10,
    };
  });

  const claimableHealth: ClaimableHealthData = {
    claimable_count: claimableCount,
    claimable_pct: Math.round((claimableCount / totalFilteredCases) * 1000) / 10,
    unclaimable_count: unclaimableCount,
    unclaimable_pct: Math.round((unclaimableCount / totalFilteredCases) * 1000) / 10,
    other_count: otherCount,
    other_pct: Math.round((otherCount / totalFilteredCases) * 1000) / 10,
    tailBreakdown,
  };

  // 3. Monthly Backlog Flow (Intake vs Closed)
  const flowRes = await query<{
    bulan: string;
    cases_opened: string;
    cases_closed: string;
  }>(`
    WITH months_cohort AS (
      SELECT DISTINCT date_trunc('month', ic.complaint_date)::date AS bulan
      FROM product_issue.fact_issue_case ic
      JOIN product_issue.v_claim_metrics m ON m.issue_case_id = ic.issue_case_id
      WHERE ic.complaint_date >= ${trendStartExpr} AND ic.complaint_date <= ${trendEndExpr} ${segmentFilter}

      UNION

      SELECT DISTINCT date_trunc('month', COALESCE(cl.closing_date_wo, cl.closing_by_rfu_date))::date AS bulan
      FROM product_issue.claim cl
      JOIN product_issue.fact_issue_case ic ON ic.issue_case_id = cl.issue_case_id
      JOIN product_issue.v_claim_metrics m ON m.claim_id = cl.claim_id
      WHERE (cl.closing_date_wo IS NOT NULL OR cl.closing_by_rfu_date IS NOT NULL)
        AND COALESCE(cl.closing_date_wo, cl.closing_by_rfu_date) >= ${trendStartExpr}
        AND COALESCE(cl.closing_date_wo, cl.closing_by_rfu_date) <= ${trendEndExpr} ${segmentFilter}
    ),
    opened_agg AS (
      SELECT date_trunc('month', ic.complaint_date)::date AS bulan, COUNT(*)::int AS cases_opened
      FROM product_issue.fact_issue_case ic
      JOIN product_issue.v_claim_metrics m ON m.issue_case_id = ic.issue_case_id
      WHERE ic.complaint_date >= ${trendStartExpr} AND ic.complaint_date <= ${trendEndExpr} ${segmentFilter}
      GROUP BY 1
    ),
    closed_agg AS (
      SELECT date_trunc('month', COALESCE(cl.closing_date_wo, cl.closing_by_rfu_date))::date AS bulan, COUNT(*)::int AS cases_closed
      FROM product_issue.claim cl
      JOIN product_issue.fact_issue_case ic ON ic.issue_case_id = cl.issue_case_id
      JOIN product_issue.v_claim_metrics m ON m.claim_id = cl.claim_id
      WHERE (cl.closing_date_wo IS NOT NULL OR cl.closing_by_rfu_date IS NOT NULL)
        AND COALESCE(cl.closing_date_wo, cl.closing_by_rfu_date) >= ${trendStartExpr}
        AND COALESCE(cl.closing_date_wo, cl.closing_by_rfu_date) <= ${trendEndExpr} ${segmentFilter}
      GROUP BY 1
    )
    SELECT
      TO_CHAR(mc.bulan, 'YYYY-MM') AS bulan,
      COALESCE(o.cases_opened, 0)::int AS cases_opened,
      COALESCE(c.cases_closed, 0)::int AS cases_closed
    FROM months_cohort mc
    LEFT JOIN opened_agg o ON o.bulan = mc.bulan
    LEFT JOIN closed_agg c ON c.bulan = mc.bulan
    ORDER BY mc.bulan ASC;
  `, queryParams);

  const monthlyBacklogFlow: MonthlyBacklogFlowItem[] = flowRes.rows.map((r) => {
    const opened = Number(r.cases_opened) || 0;
    const closed = Number(r.cases_closed) || 0;
    return {
      bulan: r.bulan,
      cases_opened: opened,
      cases_closed: closed,
      net_backlog: opened - closed,
    };
  });

  // Calculate high-level summary KPIs
  const totalCases = branchRiskMatrix.reduce((sum, b) => sum + b.total_cases, 0);
  const totalOverdue = branchRiskMatrix.reduce((sum, b) => sum + b.overdue_cases, 0);
  const slaTarget = segment === 'KA Nasional' ? 15 : 20;

  return {
    segment,
    kpiStats: {
      total_cases: totalCases,
      sla_target_days: slaTarget,
      unclaimable_pct: claimableHealth.unclaimable_pct,
      overdue_count: totalOverdue,
    },
    branchRiskMatrix,
    claimableHealth,
    monthlyBacklogFlow,
    // Legacy properties for backward compatibility
    topBranches: branchRiskMatrix.slice(0, 10).map((b) => ({ branch_code: b.branch_code, count: b.total_cases })),
    topStatuses: tailBreakdown.slice(0, 10).map((t) => ({ claimable_status_name: t.status_name, count: t.count })),
    customerSegments: [
      { golongan_customer: 'All Customer', count: totalCases },
    ],
    monthlyTrends: monthlyBacklogFlow.map((f) => ({
      bulan: f.bulan,
      cases_opened: f.cases_opened,
      cases_closed: f.cases_closed,
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

  // --- Phase 7 Comprehensive Query ---
  const caseRows = await query<{
    product_code: string;
    branch_code: string;
    root_cause_name: string;
    claimable_status_name: string;
    is_warranty_scope: boolean;
    claim_outcome: 'Covered' | 'Goodwill' | 'Unclaimable';
  }>(`
    SELECT
      product_code,
      branch_code,
      COALESCE(root_cause_name, 'Not Recorded') AS root_cause_name,
      COALESCE(claimable_status_name, 'Unrecorded') AS claimable_status_name,
      COALESCE(is_warranty_scope, false) AS is_warranty_scope,
      CASE
        WHEN claimable_status_name = 'Goodwill' THEN 'Goodwill'
        WHEN is_warranty_scope = true THEN 'Covered'
        ELSE 'Unclaimable'
      END AS claim_outcome
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    ORDER BY product_code, branch_code;
  `, queryParams);

  const rawCases = caseRows.rows;
  const totalFilteredCases = rawCases.length || 1;

  // --- 1. Product Claimable Dot Plot (Pareto Order) ---
  const productStats: Record<string, {
    total: number;
    claimable: number;
    unclaimable: number;
    goodwill: number;
  }> = {};

  rawCases.forEach((r) => {
    const p = r.product_code;
    if (!productStats[p]) {
      productStats[p] = { total: 0, claimable: 0, unclaimable: 0, goodwill: 0 };
    }
    productStats[p].total += 1;
    if (r.is_warranty_scope) {
      productStats[p].claimable += 1;
    } else {
      productStats[p].unclaimable += 1;
    }
    if (r.claim_outcome === 'Goodwill') {
      productStats[p].goodwill += 1;
    }
  });

  const sortedProductCodes = Object.keys(productStats).sort(
    (a, b) => productStats[b].total - productStats[a].total
  );

  const dotPlotData: ProductClaimableDotPlotItem[] = sortedProductCodes.map((p) => {
    const stat = productStats[p];
    const total = stat.total;
    const claimablePct = total > 0 ? Math.round((stat.claimable / total) * 1000) / 10 : 0;
    const unclaimablePct = total > 0 ? Math.round((stat.unclaimable / total) * 1000) / 10 : 0;
    const goodwillPct = total > 0 ? Math.round((stat.goodwill / total) * 1000) / 10 : 0;
    const volumeSharePct = Math.round((total / totalFilteredCases) * 1000) / 10;
    // Scale dot radius between 5px and 18px based on sqrt(total)
    const dotRadius = Math.max(5, Math.min(18, Math.round(Math.sqrt(total) * 2.2 + 2)));

    return {
      product_code: p,
      total_cases: total,
      claimable_cases: stat.claimable,
      unclaimable_cases: stat.unclaimable,
      goodwill_cases: stat.goodwill,
      claimable_pct: claimablePct,
      unclaimable_pct: unclaimablePct,
      goodwill_pct: goodwillPct,
      volume_share_pct: volumeSharePct,
      dot_radius: dotRadius,
    };
  });

  // --- 2. Product Fault Attribution Small Multiples (Panels per Product Code) ---
  const ATTRIBUTION_MAPPING: Record<string, FaultGroupType> = {
    'Material Defect': 'Product-side',
    'Workmanship/Factory Defect': 'Product-side',
    'Attachment/Modification/Local Component': 'Product-side',
    'Miss Maintenance': 'Customer-side',
    'Miss Operation': 'Customer-side',
    'Miss Application': 'Customer-side',
    'Inventory Process/Storage': 'Process-side',
    'Accident': 'External',
    'Natural Disaster': 'External',
  };

  const productFaultPanels: ProductFaultAttributionPanel[] = sortedProductCodes.map((prodCode) => {
    const prodCases = rawCases.filter((r) => r.product_code === prodCode);
    const prodTotal = prodCases.length;

    const rcMap: Record<string, {
      count: number;
      group: FaultGroupType;
      covered: number;
      goodwill: number;
      unclaimable: number;
    }> = {};

    const grpCount: Record<FaultGroupType, number> = {
      'Product-side': 0,
      'Customer-side': 0,
      'Process-side': 0,
      'External': 0,
      'Unrecorded': 0,
    };

    prodCases.forEach((r) => {
      const rc = r.root_cause_name;
      const grp = ATTRIBUTION_MAPPING[rc] || 'Unrecorded';
      grpCount[grp] = (grpCount[grp] || 0) + 1;

      if (!rcMap[rc]) {
        rcMap[rc] = {
          count: 0,
          group: grp,
          covered: 0,
          goodwill: 0,
          unclaimable: 0,
        };
      }
      rcMap[rc].count += 1;
      if (r.claim_outcome === 'Covered') rcMap[rc].covered += 1;
      else if (r.claim_outcome === 'Goodwill') rcMap[rc].goodwill += 1;
      else rcMap[rc].unclaimable += 1;
    });

    let dominantGroup: FaultGroupType = 'Product-side';
    let maxGrpCount = -1;
    const groupBreakdown: Record<FaultGroupType, { count: number; pct: number }> = {
      'Product-side': { count: 0, pct: 0 },
      'Customer-side': { count: 0, pct: 0 },
      'Process-side': { count: 0, pct: 0 },
      'External': { count: 0, pct: 0 },
      'Unrecorded': { count: 0, pct: 0 },
    };

    (Object.keys(grpCount) as FaultGroupType[]).forEach((g) => {
      const cnt = grpCount[g] || 0;
      const pct = prodTotal > 0 ? Math.round((cnt / prodTotal) * 1000) / 10 : 0;
      groupBreakdown[g] = { count: cnt, pct };
      if (cnt > maxGrpCount) {
        maxGrpCount = cnt;
        dominantGroup = g;
      }
    });

    const dominantGroupPct = prodTotal > 0 ? Math.round((maxGrpCount / prodTotal) * 1000) / 10 : 0;

    const items: ProductFaultRootCauseItem[] = Object.keys(rcMap)
      .map((rc) => ({
        root_cause_name: rc,
        attribution_group: rcMap[rc].group,
        count: rcMap[rc].count,
        pct_of_product: prodTotal > 0 ? Math.round((rcMap[rc].count / prodTotal) * 1000) / 10 : 0,
        covered_count: rcMap[rc].covered,
        goodwill_count: rcMap[rc].goodwill,
        unclaimable_count: rcMap[rc].unclaimable,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      product_code: prodCode,
      total_cases: prodTotal,
      dominant_group: dominantGroup,
      dominant_group_pct: dominantGroupPct,
      group_breakdown: groupBreakdown,
      items,
    };
  });

  // --- 3. Heatmap Matrix (Product x Branch) ---
  const branchSet = new Set<string>();
  const heatmapMatrix: Record<string, Record<string, number>> = {};
  let maxHeatmapCount = 0;

  sortedProductCodes.forEach((p) => {
    heatmapMatrix[p] = {};
  });

  rawCases.forEach((r) => {
    const p = r.product_code;
    const b = r.branch_code;
    branchSet.add(b);
    if (!heatmapMatrix[p]) heatmapMatrix[p] = {};
    heatmapMatrix[p][b] = (heatmapMatrix[p][b] || 0) + 1;
    if (heatmapMatrix[p][b] > maxHeatmapCount) {
      maxHeatmapCount = heatmapMatrix[p][b];
    }
  });

  const sortedBranches = Array.from(branchSet).sort();

  const productBranchHeatmap: ProductBranchHeatmapData = {
    products: sortedProductCodes,
    branches: sortedBranches,
    matrix: heatmapMatrix,
    maxCount: maxHeatmapCount,
  };

  // --- 4. Branch Claim Outcome Profile (100% Stacked Bar) ---
  const branchStatsMap: Record<string, {
    total: number;
    covered: number;
    goodwill: number;
    unclaimable: number;
    product_breakdown: Record<string, {
      total: number;
      covered: number;
      goodwill: number;
      unclaimable: number;
    }>;
  }> = {};

  rawCases.forEach((r) => {
    const b = r.branch_code;
    const p = r.product_code;
    if (!branchStatsMap[b]) {
      branchStatsMap[b] = {
        total: 0,
        covered: 0,
        goodwill: 0,
        unclaimable: 0,
        product_breakdown: {},
      };
    }
    branchStatsMap[b].total += 1;

    if (!branchStatsMap[b].product_breakdown[p]) {
      branchStatsMap[b].product_breakdown[p] = { total: 0, covered: 0, goodwill: 0, unclaimable: 0 };
    }
    branchStatsMap[b].product_breakdown[p].total += 1;

    if (r.claim_outcome === 'Covered') {
      branchStatsMap[b].covered += 1;
      branchStatsMap[b].product_breakdown[p].covered += 1;
    } else if (r.claim_outcome === 'Goodwill') {
      branchStatsMap[b].goodwill += 1;
      branchStatsMap[b].product_breakdown[p].goodwill += 1;
    } else {
      branchStatsMap[b].unclaimable += 1;
      branchStatsMap[b].product_breakdown[p].unclaimable += 1;
    }
  });

  const sortedBranchList = Object.keys(branchStatsMap).sort(
    (a, b) => branchStatsMap[b].total - branchStatsMap[a].total
  );

  const branchOutcomeProfile: BranchOutcomeProfileItem[] = sortedBranchList.map((b) => {
    const s = branchStatsMap[b];
    const total = s.total;
    return {
      branch_code: b,
      total,
      covered_count: s.covered,
      covered_pct: total > 0 ? Math.round((s.covered / total) * 1000) / 10 : 0,
      goodwill_count: s.goodwill,
      goodwill_pct: total > 0 ? Math.round((s.goodwill / total) * 1000) / 10 : 0,
      unclaimable_count: s.unclaimable,
      unclaimable_pct: total > 0 ? Math.round((s.unclaimable / total) * 1000) / 10 : 0,
      product_breakdown: s.product_breakdown,
    };
  });

  // --- Legacy Compatibility Data Structures ---
  const rootCauseSet = new Set<string>();
  const productRootCauseMap: Record<string, Record<string, number>> = {};
  rawCases.forEach((r) => {
    const p = r.product_code;
    const rc = r.root_cause_name;
    rootCauseSet.add(rc);
    if (!productRootCauseMap[p]) productRootCauseMap[p] = {};
    productRootCauseMap[p][rc] = (productRootCauseMap[p][rc] || 0) + 1;
  });
  const rootCauseKeys = Array.from(rootCauseSet).sort();
  const legacyProductRootCauseData: ProductRootCauseItem[] = sortedProductCodes.map((p) => {
    const item: ProductRootCauseItem = {
      product_code: p,
      total: productStats[p]?.total || 0,
    };
    rootCauseKeys.forEach((k) => {
      item[k] = productRootCauseMap[p]?.[k] || 0;
    });
    return item;
  });

  const legacyProductClaimableData: ProductClaimableItem[] = dotPlotData.map((d) => ({
    product_code: d.product_code,
    total: d.total_cases,
    claimable_count: d.claimable_cases,
    non_claimable_count: d.unclaimable_cases,
    claimable_pct: Math.round(d.claimable_pct),
    non_claimable_pct: Math.round(d.unclaimable_pct),
  }));

  const statusSet = new Set<string>();
  const branchStatusMap: Record<string, Record<string, number>> = {};
  rawCases.forEach((r) => {
    const b = r.branch_code;
    const s = r.claimable_status_name;
    statusSet.add(s);
    if (!branchStatusMap[b]) branchStatusMap[b] = {};
    branchStatusMap[b][s] = (branchStatusMap[b][s] || 0) + 1;
  });
  const statusKeys = Array.from(statusSet).sort();
  const legacyBranchClaimableData: BranchClaimableItem[] = sortedBranchList.map((b) => {
    const item: BranchClaimableItem = {
      branch_code: b,
      total: branchStatsMap[b]?.total || 0,
    };
    statusKeys.forEach((s) => {
      item[s] = branchStatusMap[b]?.[s] || 0;
    });
    return item;
  });

  return {
    dotPlotData,
    productFaultPanels,
    productBranchHeatmap,
    branchOutcomeProfile,
    rawCaseAttributes: rawCases.map((r) => ({
      product_code: r.product_code,
      branch_code: r.branch_code,
      root_cause_name: r.root_cause_name,
      claim_outcome: r.claim_outcome,
    })),
    productRootCauses: {
      data: legacyProductRootCauseData,
      rootCauseKeys,
    },
    productClaimable: legacyProductClaimableData,
    branchClaimable: {
      data: legacyBranchClaimableData,
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
