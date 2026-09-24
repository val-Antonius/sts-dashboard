import React from 'react';
import { getPerformanceVolumeData, getPrincipalClaimableData } from '@/lib/queries/performance';
import { UnitAnalyticsView } from '@/components/dashboard-analytics/UnitAnalyticsView';

export const revalidate = 0;

export default async function UnitAnalyticsPage() {
  const [initialVolumeData, initialPrincipalData] = await Promise.all([
    getPerformanceVolumeData('last_1_year', undefined, undefined, 'all'),
    getPrincipalClaimableData('last_1_year', undefined, undefined, 'all'),
  ]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <UnitAnalyticsView
        initialVolumeData={initialVolumeData}
        initialPrincipalData={initialPrincipalData}
      />
    </div>
  );
}
