import { query } from '@/lib/db';
import {
  MainKpiAchievementItem,
  MainKpiQuantityItem,
  MainKpiAgingItem,
  MainKpiDataPackage,
  MainKpiSummary,
} from '@/types/database';

export async function getMainKpiDataPackage(
  range: string = 'last_1_year',
  customStart?: string,
  customEnd?: string
): Promise<MainKpiDataPackage> {
  let dateClause = "period_month >= date_trunc('month', (CURRENT_DATE - INTERVAL '1 year'))";
  let factDateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
  let queryParams: any[] = [];

  if (range === 'this_month') {
    dateClause = "period_month >= date_trunc('month', CURRENT_DATE)";
    factDateClause = "ic.complaint_date >= date_trunc('month', CURRENT_DATE)::date";
  } else if (range === 'last_3_months') {
    dateClause = "period_month >= date_trunc('month', (CURRENT_DATE - INTERVAL '3 months'))";
    factDateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '3 months')::date";
  } else if (range === 'last_6_months') {
    dateClause = "period_month >= date_trunc('month', (CURRENT_DATE - INTERVAL '6 months'))";
    factDateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '6 months')::date";
  } else if (range === 'last_1_year') {
    dateClause = "period_month >= date_trunc('month', (CURRENT_DATE - INTERVAL '1 year'))";
    factDateClause = "ic.complaint_date >= (CURRENT_DATE - INTERVAL '1 year')::date";
  } else if (range === 'all_time') {
    dateClause = "1=1";
    factDateClause = "1=1";
  } else if (range === 'custom' && customStart && customEnd) {
    dateClause = "period_month BETWEEN date_trunc('month', $1::date) AND date_trunc('month', $2::date)";
    factDateClause = "ic.complaint_date BETWEEN $1::date AND $2::date";
    queryParams = [customStart, customEnd];
  }

  // 1. Overall Summary Metric (Filtered by the 4 claimable statuses)
  const summaryRes = await query<{
    achieve_count: string;
    total_count: string;
    achieve_pct: string;
    case_volume: string;
    avg_days: string;
    n_cases: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE m.achievement = 'Achieved')::int AS achieve_count,
      COUNT(*)::int AS total_count,
      COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE m.achievement = 'Achieved') / NULLIF(COUNT(*), 0), 1), 0)::float AS achieve_pct,
      COUNT(*)::int AS case_volume,
      COALESCE(ROUND(AVG(m.solution_time_days), 1), 0)::float AS avg_days,
      COUNT(*)::int AS n_cases
    FROM product_issue.fact_issue_case ic
    JOIN product_issue.claim c ON c.issue_case_id = ic.issue_case_id
    JOIN product_issue.ref_claimable_status cs ON cs.claimable_status_id = c.claimable_status_id
    JOIN product_issue.v_claim_metrics m ON m.issue_case_id = ic.issue_case_id
    WHERE ${factDateClause}
      AND cs.status_name IN (
        'Claimable Principal',
        'Claimable Vendor (Attachment)',
        'Claimable Vendor (Genset Maker)',
        'Goodwill'
      );
  `, queryParams);

  const rawSummary = summaryRes.rows[0] || {
    achieve_count: '0',
    total_count: '0',
    achieve_pct: '0',
    case_volume: '0',
    avg_days: '0',
    n_cases: '0',
  };

  const summary: MainKpiSummary = {
    overall_achieve_count: Number(rawSummary.achieve_count) || 0,
    overall_total_count: Number(rawSummary.total_count) || 0,
    overall_achieve_pct: Number(rawSummary.achieve_pct) || 0,
    overall_case_volume: Number(rawSummary.case_volume) || 0,
    overall_avg_solution_days: Number(rawSummary.avg_days) || 0,
    overall_n_cases: Number(rawSummary.n_cases) || 0,
  };

  // 2. By Branch Queries
  const [branchAchRes, branchQtyRes, branchAgingRes] = await Promise.all([
    query<{
      period_month: string;
      branch_code: string;
      achieve_count: string;
      total_count: string;
      achieve_pct: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        branch_code AS dimension_key,
        achieve_count::int,
        total_count::int,
        achieve_pct::float
      FROM product_issue.v_main_kpi_achievement_by_branch
      WHERE ${dateClause}
      ORDER BY period_month ASC, branch_code ASC;
    `, queryParams),

    query<{
      period_month: string;
      branch_code: string;
      case_count: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        branch_code AS dimension_key,
        case_count::int
      FROM product_issue.v_main_kpi_case_quantity_by_branch
      WHERE ${dateClause}
      ORDER BY period_month ASC, branch_code ASC;
    `, queryParams),

    query<{
      period_month: string;
      branch_code: string;
      avg_solution_time_days: string;
      n_cases: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        branch_code AS dimension_key,
        avg_solution_time_days::float,
        n_cases::int
      FROM product_issue.v_main_kpi_aging_by_branch
      WHERE ${dateClause}
      ORDER BY period_month ASC, branch_code ASC;
    `, queryParams),
  ]);

  // 3. By Product Queries
  const [productAchRes, productQtyRes, productAgingRes] = await Promise.all([
    query<{
      period_month: string;
      product_code: string;
      achieve_count: string;
      total_count: string;
      achieve_pct: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        product_code AS dimension_key,
        achieve_count::int,
        total_count::int,
        achieve_pct::float
      FROM product_issue.v_main_kpi_achievement_by_product
      WHERE ${dateClause}
      ORDER BY period_month ASC, product_code ASC;
    `, queryParams),

    query<{
      period_month: string;
      product_code: string;
      case_count: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        product_code AS dimension_key,
        case_count::int
      FROM product_issue.v_main_kpi_case_quantity_by_product
      WHERE ${dateClause}
      ORDER BY period_month ASC, product_code ASC;
    `, queryParams),

    query<{
      period_month: string;
      product_code: string;
      avg_solution_time_days: string;
      n_cases: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        product_code AS dimension_key,
        avg_solution_time_days::float,
        n_cases::int
      FROM product_issue.v_main_kpi_aging_by_product
      WHERE ${dateClause}
      ORDER BY period_month ASC, product_code ASC;
    `, queryParams),
  ]);

  // 4. By Segment Queries
  const [segmentAchRes, segmentQtyRes, segmentAgingRes] = await Promise.all([
    query<{
      period_month: string;
      golongan_customer: string;
      achieve_count: string;
      total_count: string;
      achieve_pct: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        golongan_customer AS dimension_key,
        achieve_count::int,
        total_count::int,
        achieve_pct::float
      FROM product_issue.v_main_kpi_achievement_by_segment
      WHERE ${dateClause}
      ORDER BY period_month ASC, golongan_customer ASC;
    `, queryParams),

    query<{
      period_month: string;
      golongan_customer: string;
      case_count: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        golongan_customer AS dimension_key,
        case_count::int
      FROM product_issue.v_main_kpi_case_quantity_by_segment
      WHERE ${dateClause}
      ORDER BY period_month ASC, golongan_customer ASC;
    `, queryParams),

    query<{
      period_month: string;
      golongan_customer: string;
      avg_solution_time_days: string;
      n_cases: string;
    }>(`
      SELECT
        TO_CHAR(period_month, 'YYYY-MM') AS period_month,
        golongan_customer AS dimension_key,
        avg_solution_time_days::float,
        n_cases::int
      FROM product_issue.v_main_kpi_aging_by_segment
      WHERE ${dateClause}
      ORDER BY period_month ASC, golongan_customer ASC;
    `, queryParams),
  ]);

  return {
    summary,
    byBranch: {
      achievement: branchAchRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        achieve_count: Number(r.achieve_count),
        total_count: Number(r.total_count),
        achieve_pct: Number(r.achieve_pct),
      })),
      quantity: branchQtyRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        case_count: Number(r.case_count),
      })),
      aging: branchAgingRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        avg_solution_time_days: Number(r.avg_solution_time_days),
        n_cases: Number(r.n_cases),
      })),
    },
    byProduct: {
      achievement: productAchRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        achieve_count: Number(r.achieve_count),
        total_count: Number(r.total_count),
        achieve_pct: Number(r.achieve_pct),
      })),
      quantity: productQtyRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        case_count: Number(r.case_count),
      })),
      aging: productAgingRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        avg_solution_time_days: Number(r.avg_solution_time_days),
        n_cases: Number(r.n_cases),
      })),
    },
    bySegment: {
      achievement: segmentAchRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        achieve_count: Number(r.achieve_count),
        total_count: Number(r.total_count),
        achieve_pct: Number(r.achieve_pct),
      })),
      quantity: segmentQtyRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        case_count: Number(r.case_count),
      })),
      aging: segmentAgingRes.rows.map((r) => ({
        period_month: r.period_month,
        dimension_key: (r as any).dimension_key,
        avg_solution_time_days: Number(r.avg_solution_time_days),
        n_cases: Number(r.n_cases),
      })),
    },
  };
}
