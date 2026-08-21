'use client';

import React from 'react';
import {
  SlaPerformanceByGolongan,
  ClaimableStatusByRootCause,
  CheckpointDurationRanking,
} from '@/types/database';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';

interface PerformanceOverviewTabProps {
  slaPerformance: SlaPerformanceByGolongan[];
  claimableByRootCause: ClaimableStatusByRootCause[];
  checkpointRanking: CheckpointDurationRanking[];
}

const CHECKPOINT_LABELS: Record<string, string> = {
  COMPLAINT_DATE: 'Complaint Received',
  WO_CHECKING_CREATED: 'WO Checking Created',
  WO_CHECKING_CLOSED: 'WO Checking Closed',
  PS_APPROVAL: 'PS Approval',
  WO_REPAIR_RELEASED: 'WO Repair Released',
  PART_GI: 'Part GI (Goods Issue)',
  UNIT_RFU: 'Unit RFU (Ready for Use)',
  WO_REPAIR_CLOSED: 'WO Repair Closed',
};

export function PerformanceOverviewTab({
  slaPerformance,
  claimableByRootCause,
  checkpointRanking,
}: PerformanceOverviewTabProps) {
  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  // Prepare SLA grouped data: All Customer & KA Nasional
  const segments = ['All Customer', 'KA Nasional'];
  const slaChartData = segments.map((seg) => {
    const achievedRow = slaPerformance.find(
      (r) => r.golongan_customer === seg && r.achievement === 'Achieved'
    );
    const notAchievedRow = slaPerformance.find(
      (r) => r.golongan_customer === seg && r.achievement === 'Not Achieved'
    );

    return {
      segment: seg,
      achieved: achievedRow?.jumlah_kasus || 0,
      achievedAvgDays: achievedRow?.avg_solution_time_days || 0,
      notAchieved: notAchievedRow?.jumlah_kasus || 0,
      notAchievedAvgDays: notAchievedRow?.avg_solution_time_days || 0,
    };
  });

  // Prepare top 8 Claimable x Root Cause pairs
  const topClaimableRoot = claimableByRootCause.slice(0, 8).map((r) => ({
    label: `${r.claimable_status} • ${r.root_cause_name || 'Not Recorded'}`,
    jumlah_kasus: r.jumlah_kasus,
    avg_days: r.avg_solution_time_days,
  }));

  // Prepare Checkpoint Ranking formatted labels
  const formattedRanking = checkpointRanking.map((r) => ({
    checkpoint_name: CHECKPOINT_LABELS[r.checkpoint_code] || r.checkpoint_code,
    avg_durasi: r.avg_durasi,
    median_durasi: r.median_durasi,
    n_kejadian: r.n_kejadian,
    rank: r.rank_by_avg_duration,
  }));

  return (
    <div className="space-y-6">
      {/* 2-Column Grid: SLA Achievement & Claimable by Root Cause */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. SLA Achievement by Customer Segment */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                SLA Achievement by Customer Segment
              </h3>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              All-time case resolution status by customer segment
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="segment" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: any, item: any) => {
                      const isAchieved = name === 'Achieved';
                      const avgDays = isAchieved
                        ? item.payload.achievedAvgDays
                        : item.payload.notAchievedAvgDays;
                      return [`${value} cases (avg ${avgDays} days)`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="achieved" fill="#3B7A57" name="Achieved" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="notAchieved" fill="#A54B3F" name="Not Achieved" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 2. Top Claimable Status by Root Cause */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Claimable Type by Root Cause
              </h3>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              Top volume distribution of claimable status and root causes
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topClaimableRoot}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tick={{ fontSize: 10, fill: 'var(--ink-muted)' }}
                    width={160}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} cases (avg ${item.payload.avg_days} days)`,
                      'Volume',
                    ]}
                  />
                  <Bar dataKey="jumlah_kasus" fill="#A6763C" radius={[0, 4, 4, 0]} name="Cases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Checkpoint Duration Ranking (Full Width) */}
      <div className="p-5 bg-surface border border-border rounded-lg shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Checkpoint Duration Ranking
          </h3>
        </div>
        <p className="text-xs text-ink-muted mb-4">
          Ranked average checkpoint durations across all cases (with median marker to account for extreme outlier durations)
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedRanking}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                type="number"
                unit=" days"
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
              />
              <YAxis
                dataKey="checkpoint_name"
                type="category"
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                width={170}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(val: any, name: any, item: any) => [
                  `Avg: ${item.payload.avg_durasi} days | Median: ${item.payload.median_durasi} days (n=${item.payload.n_kejadian})`,
                  'Duration',
                ]}
              />
              <Bar
                dataKey="avg_durasi"
                fill="#B8863B"
                radius={[0, 4, 4, 0]}
                name="Avg Duration (days)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
