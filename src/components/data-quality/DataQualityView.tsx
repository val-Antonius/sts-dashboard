'use client';

import React from 'react';
import Link from 'next/link';
import {
  AnomalyCheckpointCount,
  AnomalyBottleneckRecorded,
} from '@/types/database';
import {
  ResponsiveContainer,
  BarChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { AlertCircle, Stethoscope } from 'lucide-react';

interface DataQualityViewProps {
  anomalies: {
    checkpointAnomalies: AnomalyCheckpointCount[];
    bottleneckStats: AnomalyBottleneckRecorded[];
  };
}

export function DataQualityView({ anomalies }: DataQualityViewProps) {
  const customTooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--ink-primary)',
    borderRadius: '6px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  // Checkpoint Count Anomaly Distribution (0 to 8)
  const checkpointBuckets = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((count) => {
    const matchingCases = anomalies.checkpointAnomalies.filter(
      (a) => a.recorded_checkpoint_count === count
    );
    return {
      checkpoint_count: count === 0 ? '0 (None)' : `${count} Checkpoints`,
      cases_count: matchingCases.length,
      is_anomaly: count < 8,
    };
  });

  const anomalousCases = anomalies.checkpointAnomalies.filter((a) => a.is_anomaly);

  // Bottleneck Donut Data
  const bottleneckDonutData = anomalies.bottleneckStats.map((s) => ({
    name: s.has_bottleneck_recorded ? 'Recorded Bottleneck' : 'No Bottleneck Recorded (NULL)',
    value: s.jumlah_kasus,
    pct: s.pct_of_total,
  }));

  const DONUT_COLORS = ['#3B7A57', '#A54B3F'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly 1: Checkpoint Count (< 8 Checkpoints on Closed Cases) */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#A54B3F]" />
                <span>Closed Cases Checkpoint Count Distribution</span>
              </h4>
              <span className="text-[11px] font-mono bg-[#A54B3F]/10 text-[#A54B3F] px-2 py-0.5 rounded">
                {anomalousCases.length} anomalous cases (&lt;8)
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Closed cases with fewer than 8 standard checkpoints recorded are flagged as anomalies.
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkpointBuckets} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="checkpoint_count" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="cases_count" name="Closed Cases" radius={[4, 4, 0, 0]}>
                    {checkpointBuckets.map((b, idx) => (
                      <Cell
                        key={`bucket-${idx}`}
                        fill={b.is_anomaly ? '#A54B3F' : '#3B7A57'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sample Anomalous Cases List */}
            {anomalousCases.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-[11px] font-medium text-ink-muted block mb-2">
                  Quick Diagnostic for Anomalous Cases:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {anomalousCases.slice(0, 10).map((ac) => (
                    <Link
                      key={ac.issue_case_id}
                      href={`/operations/diagnostic?id=${ac.issue_case_id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-base border border-border hover:border-accent-brass hover:text-accent-brass transition-colors"
                    >
                      <Stethoscope className="w-3 h-3" />
                      <span>{ac.customer_name} ({ac.recorded_checkpoint_count}/8)</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Anomaly 2: Bottleneck Recorded vs Not Recorded */}
        <div className="p-5 bg-surface border border-border rounded-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold text-ink-primary">
                Bottleneck Reason Recording Rate
              </h4>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Proportion of cases with recorded bottleneck reason vs unrecorded (NULL)
            </p>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bottleneckDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {bottleneckDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(val: any, name: any, item: any) => [`${val} cases (${item.payload.pct}%)`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border text-center text-xs">
              {bottleneckDonutData.map((d, i) => (
                <div key={i} className="p-2 rounded bg-base/50 border border-border">
                  <span className="text-[11px] text-ink-muted block truncate">{d.name}</span>
                  <span className="text-sm font-bold text-ink-primary tabular-nums">{d.value} cases ({d.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
