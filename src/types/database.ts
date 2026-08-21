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
  log_date: string;
  log_text: string;
  pic_name: string | null;
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
}
