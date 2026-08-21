import { query } from '@/lib/db';
import {
  SlaPerformanceByGolongan,
  ClaimableStatusByRootCause,
  CheckpointDurationRanking,
  MonthlyCaseTrend,
  AnomalyCheckpointCount,
  AnomalyBottleneckRecorded,
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

export interface PerformanceVolumeData {
  topBranches: { branch_code: string; count: number }[];
  topStatuses: { claimable_status_name: string; count: number }[];
  customerSegments: { golongan_customer: string; count: number }[];
  monthlyTrends: MonthlyCaseTrend[];
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

  // 1. Top 10 Total Cases by Branch
  const branchRes = await query<{ branch_code: string; count: string }>(`
    SELECT branch_code, COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY branch_code
    ORDER BY count DESC
    LIMIT 10;
  `, queryParams);

  // 2. Top 10 Total Cases by Claimable Status
  const statusRes = await query<{ claimable_status_name: string; count: string }>(`
    SELECT claimable_status_name, COUNT(*)::int AS count
    FROM product_issue.v_issue_case_full
    WHERE ${dateClause}
    GROUP BY claimable_status_name
    ORDER BY count DESC
    LIMIT 10;
  `, queryParams);

  // 3. Total Cases by Customer Segment
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
