import React from 'react';
import {
  getBranches,
  getBranchLocations,
  getPics,
  getProductModels,
  getUnitAssets,
  getCustomerGroups,
  getCustomers,
  getClaimableStatuses,
  getRootCauses,
  getBottleneckReasons,
} from '@/lib/queries/master';
import { MasterDataTabs } from '@/components/master/MasterDataTabs';

export const revalidate = 0;

export default async function MasterDataPage() {
  const [
    branches,
    locations,
    pics,
    models,
    assets,
    customerGroups,
    customers,
    claimableStatuses,
    rootCauses,
    bottlenecks,
  ] = await Promise.all([
    getBranches(),
    getBranchLocations(),
    getPics(),
    getProductModels(),
    getUnitAssets(),
    getCustomerGroups(),
    getCustomers(),
    getClaimableStatuses(),
    getRootCauses(),
    getBottleneckReasons(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-ink-primary tracking-tight">Master Data Management</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Centralized administration for operational dimensions: branches, engineers, product models, unit assets, customer accounts, and reference lookups
        </p>
      </div>

      {/* 4 Tabs with CRUD tables */}
      <MasterDataTabs
        initialData={{
          branches,
          locations,
          pics,
          models,
          assets,
          customerGroups,
          customers,
          claimableStatuses,
          rootCauses,
          bottlenecks,
        }}
      />
    </div>
  );
}
