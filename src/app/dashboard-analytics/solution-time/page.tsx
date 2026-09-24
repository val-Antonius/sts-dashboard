import React from 'react';
import { getSolutionTimeData } from '@/lib/queries/performance';
import { SolutionTimeAnalyticsView } from '@/components/dashboard-analytics/SolutionTimeAnalyticsView';

export const revalidate = 0;

export default async function SolutionTimeAnalyticsPage() {
  const initialData = await getSolutionTimeData('last_1_year', undefined, undefined, 'all');

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <SolutionTimeAnalyticsView initialData={initialData} />
    </div>
  );
}
