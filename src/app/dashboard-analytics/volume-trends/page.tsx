import React from 'react';
import { getPerformanceVolumeData } from '@/lib/queries/performance';
import { VolumeTrendsAnalyticsView } from '@/components/dashboard-analytics/VolumeTrendsAnalyticsView';

export const revalidate = 0;

export default async function VolumeTrendsAnalyticsPage() {
  const initialData = await getPerformanceVolumeData('last_1_year', undefined, undefined, 'all');

  return (
    <div className="max-w-7xl mx-auto">
      <VolumeTrendsAnalyticsView initialData={initialData} />
    </div>
  );
}
