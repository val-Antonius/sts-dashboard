import React from 'react';
import { getAnomalyData } from '@/lib/queries/performance';
import { DataQualityView } from '@/components/data-quality/DataQualityView';

export const revalidate = 0;

export default async function DataQualityAnomalyPage() {
  const anomalies = await getAnomalyData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-ink-primary tracking-tight">
          Data Quality & Anomaly Detection
        </h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Whole-dataset data health audit: closed cases checkpoint sequence completeness and bottleneck recording rates
        </p>
      </div>

      {/* Anomaly Detection View */}
      <DataQualityView anomalies={anomalies} />
    </div>
  );
}
