import React from 'react';
import { getPerformanceVolumeData } from '@/lib/queries/performance';
import { ClaimStatusAnalyticsView } from '@/components/dashboard-analytics/ClaimStatusAnalyticsView';

export const revalidate = 0;

export default async function ClaimStatusAnalyticsPage() {
  const initialVolumeData = await getPerformanceVolumeData('last_1_year', undefined, undefined, 'all');

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <ClaimStatusAnalyticsView initialVolumeData={initialVolumeData} />
    </div>
  );
}
