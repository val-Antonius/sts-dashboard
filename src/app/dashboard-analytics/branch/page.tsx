import React from 'react';
import { getBranchAnalyticsData } from '@/lib/queries/performance';
import { BranchAnalyticsView } from '@/components/dashboard-analytics/BranchAnalyticsView';

export const revalidate = 0;

export default async function BranchAnalyticsPage() {
  const initialData = await getBranchAnalyticsData('last_1_year', undefined, undefined, 'all');

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <BranchAnalyticsView initialData={initialData} />
    </div>
  );
}
