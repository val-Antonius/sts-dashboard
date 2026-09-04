import React from 'react';
import { getIssueManagementList } from '@/lib/queries/issues';
import {
  getBranches,
  getCustomers,
  getUnitAssets,
  getPics,
  getClaimableStatuses,
  getRootCauses,
  getBottleneckReasons,
  getUnitConditions,
  getPartReadinesses,
} from '@/lib/queries/master';
import { IssueManagementView } from '@/components/issues/IssueManagementView';

export const revalidate = 0;

export default async function IssuesPage() {
  const [
    issuesData,
    branches,
    customers,
    assets,
    pics,
    claimableStatuses,
    rootCauses,
    bottlenecks,
    conditions,
    readinesses,
  ] = await Promise.all([
    getIssueManagementList({ limit: 100 }),
    getBranches(),
    getCustomers(),
    getUnitAssets(),
    getPics(),
    getClaimableStatuses(),
    getRootCauses(),
    getBottleneckReasons(),
    getUnitConditions(),
    getPartReadinesses(),
  ]);

  return (
    <IssueManagementView
      initialItems={issuesData.items}
      initialTotal={issuesData.total}
      initialKpis={issuesData.kpis}
      lookups={{
        branches,
        customers,
        assets,
        pics,
        claimableStatuses,
        rootCauses,
        bottlenecks,
        conditions,
        readinesses,
      }}
    />
  );
}
