import React from 'react';
import { getRootCauseData } from '@/lib/queries/performance';
import { RootCauseAnalyticsView } from '@/components/dashboard-analytics/RootCauseAnalyticsView';

export const revalidate = 0;

export default async function RootCauseAnalyticsPage() {
  const initialData = await getRootCauseData('last_1_year', undefined, undefined, 'all');

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <RootCauseAnalyticsView initialData={initialData} />
    </div>
  );
}
