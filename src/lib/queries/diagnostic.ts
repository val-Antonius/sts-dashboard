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

export async function getCaseLogs(issueCaseId: string): Promise<CaseProgressLog[]> {
  const res = await query<CaseProgressLog>(`
    SELECT
      l.log_id,
      l.issue_case_id,
      TO_CHAR(l.log_date, 'YYYY-MM-DD') AS log_date,
      l.log_text,
      l.logged_by_pic_id,
      pic.pic_name,
      l.created_at::text
    FROM product_issue.case_progress_log l
    LEFT JOIN product_issue.dim_pic pic ON pic.pic_id = l.logged_by_pic_id
    WHERE l.issue_case_id = $1
    ORDER BY l.log_date DESC, l.created_at DESC;
  `, [issueCaseId]);
  return res.rows;
}

export async function createCaseLog(
  issueCaseId: string,
  logDate: string,
  logText: string,
  loggedByPicId?: string | null
): Promise<CaseProgressLog> {
  const res = await query<CaseProgressLog>(`
    INSERT INTO product_issue.case_progress_log (
      issue_case_id,
      log_date,
      log_text,
      logged_by_pic_id
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      log_id,
      issue_case_id,
      TO_CHAR(log_date, 'YYYY-MM-DD') AS log_date,
      log_text,
      logged_by_pic_id,
      created_at::text;
  `, [issueCaseId, logDate, logText, loggedByPicId || null]);
  return res.rows[0];
}

export async function updateCaseLog(
  logId: string,
  logDate: string,
  logText: string,
  loggedByPicId?: string | null
): Promise<CaseProgressLog> {
  const res = await query<CaseProgressLog>(`
    UPDATE product_issue.case_progress_log
    SET
      log_date = $2,
      log_text = $3,
      logged_by_pic_id = COALESCE($4, logged_by_pic_id)
    WHERE log_id = $1
    RETURNING
      log_id,
      issue_case_id,
      TO_CHAR(log_date, 'YYYY-MM-DD') AS log_date,
      log_text,
      logged_by_pic_id,
      created_at::text;
  `, [logId, logDate, logText, loggedByPicId || null]);
  return res.rows[0];
}

export async function deleteCaseLog(logId: string): Promise<boolean> {
  const res = await query(`
    DELETE FROM product_issue.case_progress_log
    WHERE log_id = $1;
  `, [logId]);
  return (res.rowCount ?? 0) > 0;
}

export async function getCaseDiagnosticData(issueCaseId: string): Promise<{
  caseDetail: SingleCaseDetail | null;
  checkpoints: CheckpointDuration[];
  parts: CasePartRequirement[];
  logs: CaseProgressLog[];
}> {
  // 1. Header detail + complete technical specifications
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
      m.achievement_threshold_days::int,
      TO_CHAR(ua.delivery_date, 'YYYY-MM-DD') AS delivery_date,
      uc.condition_name AS unit_condition,
      ic.symptom_text,
      ic.technical_analysis_text,
      ic.corrective_action_text,
      ic.preventive_action_text,
      ic.wo_checking_number,
      ic.wo_warranty_repair_number,
      ic.tr_document_ref,
      ic.tsr_document_ref,
      btn.bottleneck_name,
      TO_CHAR(ic.goodwill_statement_date, 'YYYY-MM-DD') AS goodwill_statement_date,
      TO_CHAR(ic.srd_publication_date, 'YYYY-MM-DD') AS srd_publication_date,
      TO_CHAR(cl.closing_date_wo, 'YYYY-MM-DD') AS closing_date_wo,
      TO_CHAR(cl.closing_by_rfu_date, 'YYYY-MM-DD') AS closing_by_rfu_date
    FROM product_issue.v_issue_case_full f
    JOIN product_issue.fact_issue_case ic ON ic.issue_case_id = f.issue_case_id
    JOIN product_issue.dim_unit_asset ua ON ua.unit_asset_id = ic.unit_asset_id
    JOIN product_issue.v_claim_metrics m ON m.issue_case_id = f.issue_case_id
    LEFT JOIN product_issue.claim cl ON cl.issue_case_id = f.issue_case_id
    LEFT JOIN product_issue.ref_unit_condition uc ON uc.unit_condition_id = ic.unit_condition_id
    LEFT JOIN product_issue.ref_bottleneck_reason btn ON btn.bottleneck_id = ic.bottleneck_id
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

  // 4. Progress Logs (Newest to Oldest)
  const logRes = await query<CaseProgressLog>(`
    SELECT
      l.log_id,
      l.issue_case_id,
      TO_CHAR(l.log_date, 'YYYY-MM-DD') AS log_date,
      l.log_text,
      l.logged_by_pic_id,
      pic.pic_name,
      l.created_at::text
    FROM product_issue.case_progress_log l
    LEFT JOIN product_issue.dim_pic pic ON pic.pic_id = l.logged_by_pic_id
    WHERE l.issue_case_id = $1
    ORDER BY l.log_date DESC, l.created_at DESC;
  `, [issueCaseId]);

  return {
    caseDetail: detailRes.rows[0],
    checkpoints: checkpointRes.rows,
    parts: partRes.rows,
    logs: logRes.rows,
  };
}
