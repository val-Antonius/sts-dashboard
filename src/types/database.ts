// TypeScript types matching product_issue PostgreSQL schema & v2 views

export interface CaseKpiRealtime {
  total_active_cases: number;
  overdue_all_customer: number;
  overdue_ka_nasional: number;
}

export interface ActiveCaseCurrentMonth {
  issue_case_id: string;
  customer_name: string;
  branch_code: string;
  pic_name: string | null;
  product_code: string;
  unit_model_name: string;
  serial_number: string | null;
  solution_time_days: number;
  achievement_threshold_days: number;
  claimable_status_name: string;
  root_cause_name: string | null;
  is_carried_over: boolean;
}

export interface PicBranchWorkloadCurrentMonth {
  pic_id: string | null;
  pic_name: string | null;
  branch_code: string;
  total_active_cases: number;
  total_overdue_cases: number;
  total_carried_over_cases: number;
}

export interface ActiveCaseDimension {
  issue_case_id: string;
  branch_code: string;
  product_code: string;
  claimable_status_name: string;
  root_cause_name: string | null;
  golongan_customer: 'All Customer' | 'KA Nasional';
  complaint_date: string;
  is_carried_over: boolean;
}

export interface SlaPerformanceByGolongan {
  golongan_customer: string;
  achievement: 'Achieved' | 'Not Achieved';
  jumlah_kasus: number;
  avg_solution_time_days: number;
}

export interface ClaimableStatusByRootCause {
  claimable_status: string;
  root_cause_name: string | null;
  jumlah_kasus: number;
  avg_solution_time_days: number;
}

export interface CheckpointDurationRanking {
  checkpoint_code: string;
  n_kejadian: number;
  avg_durasi: number;
  median_durasi: number;
  rank_by_avg_duration: number;
}

export interface MonthlyCaseTrend {
  bulan: string;
  cases_opened: number;
  cases_closed: number;
}

export interface AnomalyCheckpointCount {
  issue_case_id: string;
  customer_name: string;
  branch_code: string;
  recorded_checkpoint_count: number;
  expected_checkpoint_count: number;
  is_anomaly: boolean;
}

export interface AnomalyBottleneckRecorded {
  has_bottleneck_recorded: boolean;
  jumlah_kasus: number;
  pct_of_total: number;
}

export interface CheckpointDuration {
  checkpoint_code: string;
  checkpoint_date: string;
  checkpoint_sequence?: number;
  phase_name?: string | null;
  from_checkpoint_code?: string | null;
  days_since_prev_checkpoint: number | null;
}

export interface CasePartRequirement {
  part_number: string | null;
  part_name: string | null;
  readiness_name: string | null;
  eta_part_date: string | null;
  is_full_supplied: boolean | null;
}

export interface CaseProgressLog {
  log_id?: string;
  issue_case_id?: string;
  log_date: string;
  log_text: string;
  logged_by_pic_id?: string | null;
  pic_name?: string | null;
  created_at?: string;
}

export interface SingleCaseDetail {
  issue_case_id: string;
  customer_name: string;
  branch_code: string;
  branch_city: string | null;
  product_code: string;
  unit_model_name: string;
  serial_number: string | null;
  complaint_date: string;
  hm_value: number | null;
  pic_name: string | null;
  golongan_customer: string;
  claimable_status_name: string;
  root_cause_name: string | null;
  status_wo: string;
  solution_time_days: number;
  achievement: string;
  achievement_threshold_days: number;
  // Extended Technical & ERP Fields
  delivery_date?: string | null;
  unit_condition?: string | null;
  symptom_text?: string | null;
  technical_analysis_text?: string | null;
  corrective_action_text?: string | null;
  preventive_action_text?: string | null;
  wo_checking_number?: string | null;
  wo_warranty_repair_number?: string | null;
  tr_document_ref?: string | null;
  tsr_document_ref?: string | null;
  bottleneck_name?: string | null;
  goodwill_statement_date?: string | null;
  srd_publication_date?: string | null;
  closing_date_wo?: string | null;
  closing_by_rfu_date?: string | null;
}

export interface ProductRootCauseItem {
  product_code: string;
  total: number;
  [root_cause: string]: number | string;
}

export interface ProductClaimableItem {
  product_code: string;
  total: number;
  claimable_count: number;
  non_claimable_count: number;
  claimable_pct: number;
  non_claimable_pct: number;
}

export interface ProductBranchHeatmapData {
  products: string[];
  branches: string[];
  matrix: Record<string, Record<string, number>>; // matrix[product_code][branch_code] = count
  maxCount: number;
}

export interface BranchClaimableItem {
  branch_code: string;
  total: number;
  [status: string]: number | string;
}

export interface PrincipalClaimableData {
  productRootCauses: {
    data: ProductRootCauseItem[];
    rootCauseKeys: string[];
  };
  productClaimable: ProductClaimableItem[];
  productBranchHeatmap: ProductBranchHeatmapData;
  branchClaimable: {
    data: BranchClaimableItem[];
    statusKeys: string[];
  };
}

// Master Data Types
export interface DimBranch {
  branch_id: string;
  branch_code: string;
  branch_name: string | null;
  branch_location_id: string | null;
  city_name?: string | null;
  created_at?: string;
}

export interface DimBranchLocation {
  branch_location_id: string;
  city_name: string;
}

export interface DimPic {
  pic_id: string;
  pic_name: string;
  pic_role_code: string | null;
}

export interface DimProductModel {
  product_model_id: string;
  product_code: string;
  product_type_name: string | null;
  total_units?: number;
}

export interface DimUnitAsset {
  unit_asset_id: string;
  product_model_id: string;
  unit_model_name: string;
  serial_number: string | null;
  delivery_date: string | null;
  product_code?: string;
  product_type_name?: string | null;
  total_issue_cases?: number;
  created_at?: string;
}

export interface DimCustomerGroup {
  customer_group_id: string;
  group_name: string;
  key_account_type: string | null; // 'KA NASIONAL' | null
  created_at?: string;
}

export interface DimCustomer {
  customer_id: string;
  customer_name: string;
  customer_group_id: string | null;
  group_name?: string | null;
  key_account_type?: string | null;
  golongan_customer?: string;
  total_issue_cases?: number;
  created_at?: string;
}

export interface RefClaimableStatus {
  claimable_status_id: string;
  status_name: string;
  is_warranty_scope: boolean;
}

export interface RefRootCause {
  root_cause_id: string;
  root_cause_name: string;
}

export interface RefBottleneckReason {
  bottleneck_id: string;
  bottleneck_name: string;
}

export interface RefUnitCondition {
  unit_condition_id: string;
  condition_name: string;
}

export interface RefPartReadiness {
  part_readiness_id: string;
  readiness_name: string;
}

// Issue Management Types
export interface IssueManagementItem {
  issue_case_id: string;
  complaint_date: string;
  customer_id: string;
  customer_name: string;
  customer_group_name: string | null;
  golongan_customer: string;
  branch_id: string;
  branch_code: string;
  branch_name: string | null;
  unit_asset_id: string;
  unit_model_name: string;
  serial_number: string | null;
  product_model_id: string;
  product_code: string;
  product_type_name: string | null;
  pic_id: string | null;
  pic_name: string | null;
  pic_role_code: string | null;
  hm_value: number | null;
  unit_condition_id: string | null;
  unit_condition_name: string | null;
  root_cause_id: string | null;
  root_cause_name: string | null;
  symptom_text: string | null;
  technical_analysis_text: string | null;
  corrective_action_text: string | null;
  preventive_action_text: string | null;
  wo_checking_number: string | null;
  wo_warranty_repair_number: string | null;
  tr_document_ref: string | null;
  tsr_document_ref: string | null;
  bottleneck_id: string | null;
  bottleneck_name: string | null;
  goodwill_statement_date: string | null;
  srd_publication_date: string | null;
  old_or_new_issue: string;
  claim_id: string | null;
  claimable_status_id: string | null;
  claimable_status_name: string | null;
  is_warranty_scope: boolean | null;
  closing_date_wo: string | null;
  closing_by_rfu_date: string | null;
  status_wo: string;
  solution_time_days: number;
  achievement_threshold_days: number;
  achievement: string;
  case_row_version?: number;
  claim_row_version?: number;
  created_at: string;
  updated_at: string;
}

export interface IssuePartInput {
  case_part_id?: string;
  part_number: string | null;
  part_name: string | null;
  part_readiness_id: string | null;
  eta_part_date: string | null;
  is_full_supplied: boolean | null;
}

export interface IssueTimelineInput {
  timeline_id?: string;
  checkpoint_code: string;
  checkpoint_date: string;
}

export interface IssueFormData {
  // Concurrency control
  row_version?: number;

  // Step 1: Intake & Unit Info
  branch_id: string;
  customer_id: string;
  unit_asset_id: string;
  pic_id: string | null;
  complaint_date: string;
  hm_value: number | null;
  unit_condition_id: string | null;
  old_or_new_issue: 'New Issue' | 'Old Issue';

  // Step 2: Technical Diagnosis & SAP Docs
  root_cause_id: string | null;
  symptom_text: string | null;
  technical_analysis_text: string | null;
  corrective_action_text: string | null;
  preventive_action_text: string | null;
  wo_checking_number: string | null;
  wo_warranty_repair_number: string | null;
  tr_document_ref: string | null;
  tsr_document_ref: string | null;

  // Step 3: Checkpoint Timelines
  checkpoints: Record<string, string>; // checkpoint_code -> YYYY-MM-DD

  // Step 4: Parts
  parts: IssuePartInput[];

  // Step 5: Claim & Closure
  claimable_status_id: string | null;
  status_wo: 'Belum Closed' | 'Closed';
  closing_date_wo: string | null;
  closing_by_rfu_date: string | null;
  bottleneck_id: string | null;
  goodwill_statement_date: string | null;
  srd_publication_date: string | null;
}
