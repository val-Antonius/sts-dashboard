import { query, pool } from '@/lib/db';
import {
  IssueManagementItem,
  IssueFormData,
  CasePartRequirement,
  CaseProgressLog,
  CheckpointDuration,
} from '@/types/database';

export interface IssueListFilters {
  search?: string;
  status_wo?: string;
  branch_id?: string;
  product_code?: string;
  claimable_status_id?: string;
  page?: number;
  limit?: number;
}

export async function getIssueManagementList(
  filters: IssueListFilters = {}
): Promise<{ items: IssueManagementItem[]; total: number }> {
  let whereClauses: string[] = [];
  let queryParams: any[] = [];
  let paramIdx = 1;

  if (filters.status_wo && filters.status_wo !== 'ALL') {
    whereClauses.push(`cl.status_wo = $${paramIdx++}`);
    queryParams.push(filters.status_wo);
  }

  if (filters.branch_id && filters.branch_id !== 'ALL') {
    whereClauses.push(`ic.branch_id = $${paramIdx++}`);
    queryParams.push(filters.branch_id);
  }

  if (filters.product_code && filters.product_code !== 'ALL') {
    whereClauses.push(`pm.product_code = $${paramIdx++}`);
    queryParams.push(filters.product_code);
  }

  if (filters.claimable_status_id && filters.claimable_status_id !== 'ALL') {
    whereClauses.push(`cl.claimable_status_id = $${paramIdx++}`);
    queryParams.push(filters.claimable_status_id);
  }

  if (filters.search && filters.search.trim()) {
    const s = `%${filters.search.trim().toLowerCase()}%`;
    whereClauses.push(`(
      LOWER(c.customer_name) LIKE $${paramIdx} OR
      LOWER(COALESCE(ua.serial_number, '')) LIKE $${paramIdx} OR
      LOWER(ua.unit_model_name) LIKE $${paramIdx} OR
      LOWER(b.branch_code) LIKE $${paramIdx} OR
      LOWER(COALESCE(p.pic_name, '')) LIKE $${paramIdx} OR
      LOWER(COALESCE(rc.root_cause_name, '')) LIKE $${paramIdx} OR
      LOWER(COALESCE(ic.wo_checking_number, '')) LIKE $${paramIdx}
    )`);
    queryParams.push(s);
    paramIdx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countRes = await query<{ count: string }>(`
    SELECT COUNT(*)::int AS count
    FROM product_issue.fact_issue_case ic
    JOIN product_issue.dim_branch b ON b.branch_id = ic.branch_id
    JOIN product_issue.dim_customer c ON c.customer_id = ic.customer_id
    JOIN product_issue.dim_unit_asset ua ON ua.unit_asset_id = ic.unit_asset_id
    JOIN product_issue.dim_product_model pm ON pm.product_model_id = ua.product_model_id
    LEFT JOIN product_issue.dim_pic p ON p.pic_id = ic.pic_id
    LEFT JOIN product_issue.ref_root_cause rc ON rc.root_cause_id = ic.root_cause_id
    LEFT JOIN product_issue.claim cl ON cl.issue_case_id = ic.issue_case_id
    ${whereSql};
  `, queryParams);

  const total = Number(countRes.rows[0]?.count || 0);

  // Get data list
  const dataRes = await query<IssueManagementItem>(`
    SELECT
      ic.issue_case_id,
      ic.complaint_date::text,
      c.customer_id,
      c.customer_name,
      cg.group_name AS customer_group_name,
      CASE
        WHEN cg.key_account_type = 'KA NASIONAL' THEN 'KA Nasional'
        ELSE 'All Customer'
      END AS golongan_customer,
      b.branch_id,
      b.branch_code,
      b.branch_name,
      ua.unit_asset_id,
      ua.unit_model_name,
      ua.serial_number,
      pm.product_model_id,
      pm.product_code,
      pm.product_type_name,
      p.pic_id,
      p.pic_name,
      p.pic_role_code,
      ic.hm_value::float,
      uc.unit_condition_id,
      uc.condition_name AS unit_condition_name,
      rc.root_cause_id,
      rc.root_cause_name,
      ic.symptom_text,
      ic.technical_analysis_text,
      ic.corrective_action_text,
      ic.preventive_action_text,
      ic.wo_checking_number,
      ic.wo_warranty_repair_number,
      ic.tr_document_ref,
      ic.tsr_document_ref,
      btn.bottleneck_id,
      btn.bottleneck_name,
      ic.goodwill_statement_date::text,
      ic.srd_publication_date::text,
      ic.old_or_new_issue,
      cl.claim_id,
      cs.claimable_status_id,
      cs.status_name AS claimable_status_name,
      cs.is_warranty_scope,
      cl.closing_date_wo::text,
      cl.closing_by_rfu_date::text,
      COALESCE(cl.status_wo, 'Belum Closed') AS status_wo,
      COALESCE(m.solution_time_days, 0)::int AS solution_time_days,
      COALESCE(m.achievement_threshold_days, 20)::int AS achievement_threshold_days,
      COALESCE(m.achievement, 'Not Achieved') AS achievement,
      ic.created_at::text,
      ic.updated_at::text
    FROM product_issue.fact_issue_case ic
    JOIN product_issue.dim_branch b ON b.branch_id = ic.branch_id
    JOIN product_issue.dim_customer c ON c.customer_id = ic.customer_id
    LEFT JOIN product_issue.dim_customer_group cg ON cg.customer_group_id = c.customer_group_id
    JOIN product_issue.dim_unit_asset ua ON ua.unit_asset_id = ic.unit_asset_id
    JOIN product_issue.dim_product_model pm ON pm.product_model_id = ua.product_model_id
    LEFT JOIN product_issue.dim_pic p ON p.pic_id = ic.pic_id
    LEFT JOIN product_issue.ref_unit_condition uc ON uc.unit_condition_id = ic.unit_condition_id
    LEFT JOIN product_issue.ref_root_cause rc ON rc.root_cause_id = ic.root_cause_id
    LEFT JOIN product_issue.ref_bottleneck_reason btn ON btn.bottleneck_id = ic.bottleneck_id
    LEFT JOIN product_issue.claim cl ON cl.issue_case_id = ic.issue_case_id
    LEFT JOIN product_issue.ref_claimable_status cs ON cs.claimable_status_id = cl.claimable_status_id
    LEFT JOIN product_issue.v_claim_metrics m ON m.issue_case_id = ic.issue_case_id
    ${whereSql}
    ORDER BY ic.complaint_date DESC, ic.created_at DESC
    LIMIT ${filters.limit || 50};
  `, queryParams);

  return { items: dataRes.rows, total };
}

export async function getIssueDetailFull(issueCaseId: string): Promise<{
  caseData: IssueManagementItem | null;
  checkpoints: Record<string, string>;
  parts: CasePartRequirement[];
  logs: CaseProgressLog[];
}> {
  const caseRes = await getIssueManagementList({ search: undefined });
  const singleRes = await query<IssueManagementItem>(`
    SELECT
      ic.issue_case_id,
      ic.complaint_date::text,
      c.customer_id,
      c.customer_name,
      cg.group_name AS customer_group_name,
      CASE
        WHEN cg.key_account_type = 'KA NASIONAL' THEN 'KA Nasional'
        ELSE 'All Customer'
      END AS golongan_customer,
      b.branch_id,
      b.branch_code,
      b.branch_name,
      ua.unit_asset_id,
      ua.unit_model_name,
      ua.serial_number,
      pm.product_model_id,
      pm.product_code,
      pm.product_type_name,
      p.pic_id,
      p.pic_name,
      p.pic_role_code,
      ic.hm_value::float,
      uc.unit_condition_id,
      uc.condition_name AS unit_condition_name,
      rc.root_cause_id,
      rc.root_cause_name,
      ic.symptom_text,
      ic.technical_analysis_text,
      ic.corrective_action_text,
      ic.preventive_action_text,
      ic.wo_checking_number,
      ic.wo_warranty_repair_number,
      ic.tr_document_ref,
      ic.tsr_document_ref,
      btn.bottleneck_id,
      btn.bottleneck_name,
      ic.goodwill_statement_date::text,
      ic.srd_publication_date::text,
      ic.old_or_new_issue,
      cl.claim_id,
      cs.claimable_status_id,
      cs.status_name AS claimable_status_name,
      cs.is_warranty_scope,
      cl.closing_date_wo::text,
      cl.closing_by_rfu_date::text,
      COALESCE(cl.status_wo, 'Belum Closed') AS status_wo,
      COALESCE(m.solution_time_days, 0)::int AS solution_time_days,
      COALESCE(m.achievement_threshold_days, 20)::int AS achievement_threshold_days,
      COALESCE(m.achievement, 'Not Achieved') AS achievement,
      ic.created_at::text,
      ic.updated_at::text
    FROM product_issue.fact_issue_case ic
    JOIN product_issue.dim_branch b ON b.branch_id = ic.branch_id
    JOIN product_issue.dim_customer c ON c.customer_id = ic.customer_id
    LEFT JOIN product_issue.dim_customer_group cg ON cg.customer_group_id = c.customer_group_id
    JOIN product_issue.dim_unit_asset ua ON ua.unit_asset_id = ic.unit_asset_id
    JOIN product_issue.dim_product_model pm ON pm.product_model_id = ua.product_model_id
    LEFT JOIN product_issue.dim_pic p ON p.pic_id = ic.pic_id
    LEFT JOIN product_issue.ref_unit_condition uc ON uc.unit_condition_id = ic.unit_condition_id
    LEFT JOIN product_issue.ref_root_cause rc ON rc.root_cause_id = ic.root_cause_id
    LEFT JOIN product_issue.ref_bottleneck_reason btn ON btn.bottleneck_id = ic.bottleneck_id
    LEFT JOIN product_issue.claim cl ON cl.issue_case_id = ic.issue_case_id
    LEFT JOIN product_issue.ref_claimable_status cs ON cs.claimable_status_id = cl.claimable_status_id
    LEFT JOIN product_issue.v_claim_metrics m ON m.issue_case_id = ic.issue_case_id
    WHERE ic.issue_case_id = $1;
  `, [issueCaseId]);

  const caseData = singleRes.rows[0] || null;

  // Checkpoints map
  const cpRes = await query<{ checkpoint_code: string; checkpoint_date: string }>(`
    SELECT checkpoint_code, checkpoint_date::text
    FROM product_issue.case_timeline
    WHERE issue_case_id = $1;
  `, [issueCaseId]);

  const checkpoints: Record<string, string> = {};
  cpRes.rows.forEach((r) => {
    checkpoints[r.checkpoint_code] = r.checkpoint_date;
  });

  // Parts
  const partsRes = await query<CasePartRequirement>(`
    SELECT
      cp.part_number,
      cp.part_name,
      r.readiness_name,
      cp.eta_part_date::text,
      cp.is_full_supplied
    FROM product_issue.case_part cp
    LEFT JOIN product_issue.ref_part_readiness r ON r.part_readiness_id = cp.part_readiness_id
    WHERE cp.issue_case_id = $1;
  `, [issueCaseId]);

  // Logs
  const logsRes = await query<CaseProgressLog>(`
    SELECT
      l.log_date::text,
      l.log_text,
      p.pic_name
    FROM product_issue.case_progress_log l
    LEFT JOIN product_issue.dim_pic p ON p.pic_id = l.logged_by_pic_id
    WHERE l.issue_case_id = $1
    ORDER BY l.log_date DESC;
  `, [issueCaseId]);

  return {
    caseData,
    checkpoints,
    parts: partsRes.rows,
    logs: logsRes.rows,
  };
}

export async function createIssueCase(formData: IssueFormData): Promise<{ issue_case_id: string }> {
  // 1. Insert into fact_issue_case
  const insertCaseRes = await query<{ issue_case_id: string }>(`
    INSERT INTO product_issue.fact_issue_case (
      branch_id, customer_id, unit_asset_id, pic_id,
      complaint_date, hm_value, unit_condition_id, old_or_new_issue,
      root_cause_id, symptom_text, technical_analysis_text,
      corrective_action_text, preventive_action_text,
      wo_checking_number, wo_warranty_repair_number,
      tr_document_ref, tsr_document_ref,
      bottleneck_id, goodwill_statement_date, srd_publication_date
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11,
      $12, $13,
      $14, $15,
      $16, $17,
      $18, $19, $20
    )
    RETURNING issue_case_id;
  `, [
    formData.branch_id,
    formData.customer_id,
    formData.unit_asset_id,
    formData.pic_id || null,
    formData.complaint_date,
    formData.hm_value || null,
    formData.unit_condition_id || null,
    formData.old_or_new_issue || 'New Issue',
    formData.root_cause_id || null,
    formData.symptom_text || null,
    formData.technical_analysis_text || null,
    formData.corrective_action_text || null,
    formData.preventive_action_text || null,
    formData.wo_checking_number || null,
    formData.wo_warranty_repair_number || null,
    formData.tr_document_ref || null,
    formData.tsr_document_ref || null,
    formData.bottleneck_id || null,
    formData.goodwill_statement_date || null,
    formData.srd_publication_date || null,
  ]);

  const issueCaseId = insertCaseRes.rows[0].issue_case_id;

  // 2. Insert or default into claim
  // Find default claimable status if not selected
  let claimableStatusId = formData.claimable_status_id;
  if (!claimableStatusId) {
    const defStatus = await query<{ claimable_status_id: string }>(`
      SELECT claimable_status_id FROM product_issue.ref_claimable_status LIMIT 1;
    `);
    claimableStatusId = defStatus.rows[0]?.claimable_status_id;
  }

  if (claimableStatusId) {
    await query(`
      INSERT INTO product_issue.claim (
        issue_case_id, claimable_status_id, closing_date_wo, closing_by_rfu_date, status_wo
      ) VALUES ($1, $2, $3, $4, $5);
    `, [
      issueCaseId,
      claimableStatusId,
      formData.closing_date_wo || null,
      formData.closing_by_rfu_date || null,
      formData.status_wo || 'Belum Closed',
    ]);
  }

  // 3. Insert Checkpoints
  if (formData.checkpoints) {
    for (const [code, date] of Object.entries(formData.checkpoints)) {
      if (date && date.trim()) {
        await query(`
          INSERT INTO product_issue.case_timeline (issue_case_id, checkpoint_code, checkpoint_date)
          VALUES ($1, $2, $3)
          ON CONFLICT (issue_case_id, checkpoint_code) DO UPDATE SET checkpoint_date = EXCLUDED.checkpoint_date;
        `, [issueCaseId, code, date]);
      }
    }
  }

  // 4. Insert Parts
  if (formData.parts && formData.parts.length > 0) {
    for (const p of formData.parts) {
      if (p.part_number || p.part_name) {
        await query(`
          INSERT INTO product_issue.case_part (
            issue_case_id, part_number, part_name, part_readiness_id, eta_part_date, is_full_supplied
          ) VALUES ($1, $2, $3, $4, $5, $6);
        `, [
          issueCaseId,
          p.part_number || null,
          p.part_name || null,
          p.part_readiness_id || null,
          p.eta_part_date || null,
          p.is_full_supplied || false,
        ]);
      }
    }
  }

  return { issue_case_id: issueCaseId };
}

export async function updateIssueCase(issueCaseId: string, formData: IssueFormData): Promise<boolean> {
  // 1. Update fact_issue_case
  await query(`
    UPDATE product_issue.fact_issue_case
    SET
      branch_id = $1,
      customer_id = $2,
      unit_asset_id = $3,
      pic_id = $4,
      complaint_date = $5,
      hm_value = $6,
      unit_condition_id = $7,
      old_or_new_issue = $8,
      root_cause_id = $9,
      symptom_text = $10,
      technical_analysis_text = $11,
      corrective_action_text = $12,
      preventive_action_text = $13,
      wo_checking_number = $14,
      wo_warranty_repair_number = $15,
      tr_document_ref = $16,
      tsr_document_ref = $17,
      bottleneck_id = $18,
      goodwill_statement_date = $19,
      srd_publication_date = $20,
      updated_at = now()
    WHERE issue_case_id = $21;
  `, [
    formData.branch_id,
    formData.customer_id,
    formData.unit_asset_id,
    formData.pic_id || null,
    formData.complaint_date,
    formData.hm_value || null,
    formData.unit_condition_id || null,
    formData.old_or_new_issue || 'New Issue',
    formData.root_cause_id || null,
    formData.symptom_text || null,
    formData.technical_analysis_text || null,
    formData.corrective_action_text || null,
    formData.preventive_action_text || null,
    formData.wo_checking_number || null,
    formData.wo_warranty_repair_number || null,
    formData.tr_document_ref || null,
    formData.tsr_document_ref || null,
    formData.bottleneck_id || null,
    formData.goodwill_statement_date || null,
    formData.srd_publication_date || null,
    issueCaseId,
  ]);

  // 2. Update claim
  if (formData.claimable_status_id) {
    await query(`
      INSERT INTO product_issue.claim (
        issue_case_id, claimable_status_id, closing_date_wo, closing_by_rfu_date, status_wo
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (issue_case_id) DO UPDATE SET
        claimable_status_id = EXCLUDED.claimable_status_id,
        closing_date_wo = EXCLUDED.closing_date_wo,
        closing_by_rfu_date = EXCLUDED.closing_by_rfu_date,
        status_wo = EXCLUDED.status_wo,
        updated_at = now();
    `, [
      issueCaseId,
      formData.claimable_status_id,
      formData.closing_date_wo || null,
      formData.closing_by_rfu_date || null,
      formData.status_wo || 'Belum Closed',
    ]);
  }

  // 3. Upsert / Sync Checkpoints
  if (formData.checkpoints) {
    for (const [code, date] of Object.entries(formData.checkpoints)) {
      if (date && date.trim()) {
        await query(`
          INSERT INTO product_issue.case_timeline (issue_case_id, checkpoint_code, checkpoint_date)
          VALUES ($1, $2, $3)
          ON CONFLICT (issue_case_id, checkpoint_code) DO UPDATE SET checkpoint_date = EXCLUDED.checkpoint_date;
        `, [issueCaseId, code, date]);
      } else {
        // If cleared/empty, remove checkpoint
        await query(`
          DELETE FROM product_issue.case_timeline
          WHERE issue_case_id = $1 AND checkpoint_code = $2;
        `, [issueCaseId, code]);
      }
    }
  }

  // 4. Sync Parts
  if (formData.parts) {
    await query(`DELETE FROM product_issue.case_part WHERE issue_case_id = $1;`, [issueCaseId]);
    for (const p of formData.parts) {
      if (p.part_number || p.part_name) {
        await query(`
          INSERT INTO product_issue.case_part (
            issue_case_id, part_number, part_name, part_readiness_id, eta_part_date, is_full_supplied
          ) VALUES ($1, $2, $3, $4, $5, $6);
        `, [
          issueCaseId,
          p.part_number || null,
          p.part_name || null,
          p.part_readiness_id || null,
          p.eta_part_date || null,
          p.is_full_supplied || false,
        ]);
      }
    }
  }

  return true;
}

export async function deleteIssueCase(issueCaseId: string): Promise<boolean> {
  await query(`DELETE FROM product_issue.fact_issue_case WHERE issue_case_id = $1;`, [issueCaseId]);
  return true;
}
