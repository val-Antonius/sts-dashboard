import { query } from '@/lib/db';
import {
  SingleCaseDetail,
  CheckpointDuration,
  CasePartRequirement,
  CaseProgressLog,
} from '@/types/database';

export interface CaseOption {
  issue_case_id: string;
  customer_name: string;
  branch_code: string;
  serial_number: string | null;
  unit_model_name: string;
  status_wo: string;
}

export async function getAllCaseOptions(): Promise<CaseOption[]> {
  const res = await query<CaseOption>(`
    SELECT
      issue_case_id,
      customer_name,
      branch_code,
      serial_number,
      unit_model_name,
      status_wo
    FROM product_issue.v_issue_case_full
    ORDER BY complaint_date DESC;
  `);
  return res.rows;
}

export async function getCaseDiagnosticData(issueCaseId: string): Promise<{
  caseDetail: SingleCaseDetail | null;
  checkpoints: CheckpointDuration[];
  parts: CasePartRequirement[];
  logs: CaseProgressLog[];
}> {
  // 1. Header detail
  const detailRes = await query<SingleCaseDetail>(`
    SELECT
      f.issue_case_id,
      f.customer_name,
      f.branch_code,
      f.branch_city,
      f.product_code,
      f.unit_model_name,
      f.serial_number,
      TO_CHAR(f.complaint_date, 'YYYY-MM-DD') AS complaint_date,
      f.hm_value,
      f.pic_name,
      f.golongan_customer,
      f.claimable_status_name,
      f.root_cause_name,
      f.status_wo,
      f.solution_time_days::int,
      f.achievement,
      m.achievement_threshold_days::int
    FROM product_issue.v_issue_case_full f
    JOIN product_issue.v_claim_metrics m ON m.issue_case_id = f.issue_case_id
    WHERE f.issue_case_id = $1;
  `, [issueCaseId]);

  if (!detailRes.rows.length) {
    return {
      caseDetail: null,
      checkpoints: [],
      parts: [],
      logs: [],
    };
  }

  // 2. Checkpoints
  const checkpointRes = await query<CheckpointDuration>(`
    SELECT
      checkpoint_code,
      TO_CHAR(checkpoint_date, 'YYYY-MM-DD') AS checkpoint_date,
      days_since_prev_checkpoint::int
    FROM product_issue.v_checkpoint_duration
    WHERE issue_case_id = $1
    ORDER BY checkpoint_date;
  `, [issueCaseId]);

  // 3. Spare Parts
  const partRes = await query<CasePartRequirement>(`
    SELECT
      p.part_number,
      p.part_name,
      r.readiness_name,
      TO_CHAR(p.eta_part_date, 'YYYY-MM-DD') AS eta_part_date,
      p.is_full_supplied
    FROM product_issue.case_part p
    LEFT JOIN product_issue.ref_part_readiness r ON r.part_readiness_id = p.part_readiness_id
    WHERE p.issue_case_id = $1;
  `, [issueCaseId]);

  // 4. Progress Logs
  const logRes = await query<CaseProgressLog>(`
    SELECT
      TO_CHAR(l.log_date, 'YYYY-MM-DD') AS log_date,
      l.log_text,
      pic.pic_name
    FROM product_issue.case_progress_log l
    LEFT JOIN product_issue.dim_pic pic ON pic.pic_id = l.logged_by_pic_id
    WHERE l.issue_case_id = $1
    ORDER BY l.log_date;
  `, [issueCaseId]);

  return {
    caseDetail: detailRes.rows[0],
    checkpoints: checkpointRes.rows,
    parts: partRes.rows,
    logs: logRes.rows,
  };
}
