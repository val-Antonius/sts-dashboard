'use client';

import React, { useState } from 'react';
import {
  DimBranch,
  DimBranchLocation,
  DimPic,
  DimProductModel,
  DimUnitAsset,
  DimCustomerGroup,
  DimCustomer,
  RefClaimableStatus,
  RefRootCause,
  RefBottleneckReason,
} from '@/types/database';
import { MasterDataTable, Column } from './MasterDataTable';
import { Building2, Package, Users, Bookmark, X, Loader2, AlertTriangle, Check } from 'lucide-react';

interface MasterDataTabsProps {
  initialData: {
    branches: DimBranch[];
    locations: DimBranchLocation[];
    pics: DimPic[];
    models: DimProductModel[];
    assets: DimUnitAsset[];
    customerGroups: DimCustomerGroup[];
    customers: DimCustomer[];
    claimableStatuses: RefClaimableStatus[];
    rootCauses: RefRootCause[];
    bottlenecks: RefBottleneckReason[];
  };
}

export function MasterDataTabs({ initialData }: MasterDataTabsProps) {
  const [activeTab, setActiveTab] = useState<'branch_pic' | 'product' | 'customer' | 'references'>('branch_pic');

  // State for all entities
  const [branches, setBranches] = useState<DimBranch[]>(initialData.branches);
  const [locations, setLocations] = useState<DimBranchLocation[]>(initialData.locations);
  const [pics, setPics] = useState<DimPic[]>(initialData.pics);
  const [models, setModels] = useState<DimProductModel[]>(initialData.models);
  const [assets, setAssets] = useState<DimUnitAsset[]>(initialData.assets);
  const [customerGroups, setCustomerGroups] = useState<DimCustomerGroup[]>(initialData.customerGroups);
  const [customers, setCustomers] = useState<DimCustomer[]>(initialData.customers);
  const [claimableStatuses, setClaimableStatuses] = useState<RefClaimableStatus[]>(initialData.claimableStatuses);
  const [rootCauses, setRootCauses] = useState<RefRootCause[]>(initialData.rootCauses);
  const [bottlenecks, setBottlenecks] = useState<RefBottleneckReason[]>(initialData.bottlenecks);

  // Modal State
  const [modalType, setModalType] = useState<string | null>(null); // e.g. 'branch', 'pic', 'model', 'asset', 'group', 'customer', 'root_cause', etc.
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Delete Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: string;
    item: any;
    label: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const openModal = (type: string, item: any = null) => {
    setModalType(type);
    setEditItem(item);
    setErrorMsg(null);

    if (item) {
      setFormData({ ...item });
    } else {
      // Default empty form
      if (type === 'branch') {
        setFormData({ branch_code: '', branch_name: '', branch_location_id: locations[0]?.branch_location_id || '' });
      } else if (type === 'pic') {
        setFormData({ pic_name: '', pic_role_code: 'SDH' });
      } else if (type === 'model') {
        setFormData({ product_code: '', product_type_name: '' });
      } else if (type === 'asset') {
        setFormData({
          product_model_id: models[0]?.product_model_id || '',
          unit_model_name: '',
          serial_number: '',
          delivery_date: '',
        });
      } else if (type === 'group') {
        setFormData({ group_name: '', key_account_type: 'KA NASIONAL' });
      } else if (type === 'customer') {
        setFormData({ customer_name: '', customer_group_id: '' });
      } else if (type === 'root_cause') {
        setFormData({ name: '' });
      } else if (type === 'claimable_status') {
        setFormData({ name: '', is_warranty_scope: true });
      } else if (type === 'bottleneck') {
        setFormData({ name: '' });
      }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditItem(null);
    setFormData({});
    setErrorMsg(null);
  };

  // Submit Handler for all CRUD operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (modalType === 'branch') {
        const isEdit = Boolean(editItem?.branch_id);
        const res = await fetch('/api/master/branches', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save branch');

        // Refetch branches
        const refreshed = await fetch('/api/master/branches').then((r) => r.json());
        setBranches(refreshed.branches);
        showToast(isEdit ? 'Branch updated successfully' : 'Branch created successfully');
        closeModal();
      } else if (modalType === 'pic') {
        const isEdit = Boolean(editItem?.pic_id);
        const res = await fetch('/api/master/pics', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save PIC');

        const refreshed = await fetch('/api/master/pics').then((r) => r.json());
        setPics(refreshed.pics);
        showToast(isEdit ? 'PIC updated successfully' : 'PIC created successfully');
        closeModal();
      } else if (modalType === 'model') {
        const isEdit = Boolean(editItem?.product_model_id);
        const res = await fetch('/api/master/products', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'model', ...formData }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save Product Model');

        const refreshed = await fetch('/api/master/products').then((r) => r.json());
        setModels(refreshed.models);
        showToast(isEdit ? 'Product Model updated' : 'Product Model created');
        closeModal();
      } else if (modalType === 'asset') {
        const isEdit = Boolean(editItem?.unit_asset_id);
        const res = await fetch('/api/master/products', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'asset', ...formData }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save Unit Asset');

        const refreshed = await fetch('/api/master/products').then((r) => r.json());
        setAssets(refreshed.assets);
        showToast(isEdit ? 'Unit Asset updated' : 'Unit Asset created');
        closeModal();
      } else if (modalType === 'group') {
        const isEdit = Boolean(editItem?.customer_group_id);
        const res = await fetch('/api/master/customers', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'group', ...formData }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save Customer Group');

        const refreshed = await fetch('/api/master/customers').then((r) => r.json());
        setCustomerGroups(refreshed.groups);
        setCustomers(refreshed.customers);
        showToast(isEdit ? 'Customer Group updated' : 'Customer Group created');
        closeModal();
      } else if (modalType === 'customer') {
        const isEdit = Boolean(editItem?.customer_id);
        const res = await fetch('/api/master/customers', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'customer', ...formData }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save Customer');

        const refreshed = await fetch('/api/master/customers').then((r) => r.json());
        setCustomers(refreshed.customers);
        showToast(isEdit ? 'Customer updated' : 'Customer created');
        closeModal();
      } else if (modalType === 'root_cause' || modalType === 'claimable_status' || modalType === 'bottleneck') {
        const isEdit = Boolean(editItem?.id || editItem?.root_cause_id || editItem?.claimable_status_id || editItem?.bottleneck_id);
        const id = editItem?.root_cause_id || editItem?.claimable_status_id || editItem?.bottleneck_id;

        const res = await fetch('/api/master/lookups', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: modalType,
            id,
            name: formData.name || formData.root_cause_name || formData.status_name || formData.bottleneck_name,
            is_warranty_scope: formData.is_warranty_scope,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save Lookup');

        const refreshed = await fetch('/api/master/lookups').then((r) => r.json());
        setRootCauses(refreshed.rootCauses);
        setClaimableStatuses(refreshed.claimableStatuses);
        setBottlenecks(refreshed.bottlenecks);
        showToast('Reference item saved successfully');
        closeModal();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Action Executor
  const handleDeleteExecute = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { type, item } = deleteConfirm;
      let url = '';

      if (type === 'branch') {
        url = `/api/master/branches?id=${item.branch_id}`;
      } else if (type === 'pic') {
        url = `/api/master/pics?id=${item.pic_id}`;
      } else if (type === 'model') {
        url = `/api/master/products?entity=model&id=${item.product_model_id}`;
      } else if (type === 'asset') {
        url = `/api/master/products?entity=asset&id=${item.unit_asset_id}`;
      } else if (type === 'group') {
        url = `/api/master/customers?entity=group&id=${item.customer_group_id}`;
      } else if (type === 'customer') {
        url = `/api/master/customers?entity=customer&id=${item.customer_id}`;
      } else if (type === 'root_cause') {
        url = `/api/master/lookups?type=root_cause&id=${item.root_cause_id}`;
      } else if (type === 'claimable_status') {
        url = `/api/master/lookups?type=claimable_status&id=${item.claimable_status_id}`;
      } else if (type === 'bottleneck') {
        url = `/api/master/lookups?type=bottleneck&id=${item.bottleneck_id}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete item');

      // Refresh corresponding state
      if (type === 'branch') {
        setBranches(branches.filter((b) => b.branch_id !== item.branch_id));
      } else if (type === 'pic') {
        setPics(pics.filter((p) => p.pic_id !== item.pic_id));
      } else if (type === 'model') {
        setModels(models.filter((m) => m.product_model_id !== item.product_model_id));
      } else if (type === 'asset') {
        setAssets(assets.filter((a) => a.unit_asset_id !== item.unit_asset_id));
      } else if (type === 'group') {
        setCustomerGroups(customerGroups.filter((g) => g.customer_group_id !== item.customer_group_id));
      } else if (type === 'customer') {
        setCustomers(customers.filter((c) => c.customer_id !== item.customer_id));
      } else if (type === 'root_cause') {
        setRootCauses(rootCauses.filter((r) => r.root_cause_id !== item.root_cause_id));
      } else if (type === 'claimable_status') {
        setClaimableStatuses(claimableStatuses.filter((s) => s.claimable_status_id !== item.claimable_status_id));
      } else if (type === 'bottleneck') {
        setBottlenecks(bottlenecks.filter((b) => b.bottleneck_id !== item.bottleneck_id));
      }

      showToast('Record deleted successfully');
      setDeleteConfirm(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Table Column Definitions ---
  const branchColumns: Column<DimBranch>[] = [
    {
      header: 'Branch Code',
      accessor: 'branch_code',
      render: (row) => (
        <span className="font-mono font-bold px-2 py-0.5 rounded bg-base border border-border text-ink-primary">
          {row.branch_code}
        </span>
      ),
    },
    { header: 'Branch Name', accessor: 'branch_name' },
    { header: 'Location / City', accessor: 'city_name' },
  ];

  const picColumns: Column<DimPic>[] = [
    { header: 'PIC Name', accessor: 'pic_name', render: (r) => <strong className="text-ink-primary">{r.pic_name}</strong> },
    {
      header: 'Role Code',
      accessor: 'pic_role_code',
      render: (r) => (
        <span className="font-mono text-xs text-ink-muted">
          {r.pic_role_code || '—'}
        </span>
      ),
    },
  ];

  const modelColumns: Column<DimProductModel>[] = [
    {
      header: 'Product Code',
      accessor: 'product_code',
      render: (r) => (
        <span className="font-mono font-bold px-2 py-0.5 rounded bg-accent-brass/10 border border-accent-brass/30 text-accent-brass">
          {r.product_code}
        </span>
      ),
    },
    { header: 'Line / Type Name', accessor: 'product_type_name' },
    {
      header: 'Registered Units',
      accessor: 'total_units',
      className: 'tabular-nums font-semibold text-ink-primary',
    },
  ];

  const assetColumns: Column<DimUnitAsset>[] = [
    {
      header: 'Product Code',
      accessor: 'product_code',
      render: (r) => (
        <span className="font-mono text-xs font-semibold px-1.5 py-0.2 rounded bg-base border border-border">
          {r.product_code}
        </span>
      ),
    },
    { header: 'Unit Model Name', accessor: 'unit_model_name', render: (r) => <span className="font-medium text-ink-primary">{r.unit_model_name}</span> },
    { header: 'Serial Number', accessor: 'serial_number', render: (r) => <code className="font-mono text-ink-muted">{r.serial_number || '—'}</code> },
    { header: 'Delivery Date', accessor: 'delivery_date', className: 'tabular-nums' },
    { header: 'Total Issues', accessor: 'total_issue_cases', className: 'tabular-nums font-semibold text-ink-primary' },
  ];

  const groupColumns: Column<DimCustomerGroup>[] = [
    { header: 'Customer Group Name', accessor: 'group_name', render: (r) => <strong className="text-ink-primary">{r.group_name}</strong> },
    {
      header: 'Account Type',
      accessor: 'key_account_type',
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          r.key_account_type === 'KA NASIONAL'
            ? 'bg-accent-brass/15 text-accent-brass border border-accent-brass/30'
            : 'bg-base text-ink-muted border border-border'
        }`}>
          {r.key_account_type || 'Standard / Non-KA'}
        </span>
      ),
    },
  ];

  const customerColumns: Column<DimCustomer>[] = [
    { header: 'Customer Name', accessor: 'customer_name', render: (r) => <strong className="text-ink-primary">{r.customer_name}</strong> },
    { header: 'Group Name', accessor: 'group_name', render: (r) => <span>{r.group_name || '—'}</span> },
    {
      header: 'Classification',
      accessor: 'golongan_customer',
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          r.golongan_customer === 'KA Nasional'
            ? 'bg-[#B8863B]/15 text-[#B8863B] border border-[#B8863B]/30'
            : 'bg-base text-ink-muted border border-border'
        }`}>
          {r.golongan_customer}
        </span>
      ),
    },
    { header: 'Total Cases', accessor: 'total_issue_cases', className: 'tabular-nums font-semibold text-ink-primary' },
  ];

  const rootCauseColumns: Column<RefRootCause>[] = [
    { header: 'Root Cause Name', accessor: 'root_cause_name', render: (r) => <strong className="text-ink-primary">{r.root_cause_name}</strong> },
  ];

  const claimStatusColumns: Column<RefClaimableStatus>[] = [
    { header: 'Claimable Status Name', accessor: 'status_name', render: (r) => <strong className="text-ink-primary">{r.status_name}</strong> },
    {
      header: 'Warranty Scope',
      accessor: 'is_warranty_scope',
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          r.is_warranty_scope
            ? 'bg-[#3B7A57]/15 text-[#3B7A57] border border-[#3B7A57]/30'
            : 'bg-[#A54B3F]/15 text-[#A54B3F] border border-[#A54B3F]/30'
        }`}>
          {r.is_warranty_scope ? 'Warranty Scope' : 'Non-Warranty Scope'}
        </span>
      ),
    },
  ];

  const bottleneckColumns: Column<RefBottleneckReason>[] = [
    { header: 'Bottleneck Reason Name', accessor: 'bottleneck_name', render: (r) => <strong className="text-ink-primary">{r.bottleneck_name}</strong> },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3B7A57] text-white text-xs font-semibold shadow-lg animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('branch_pic')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'branch_pic'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Branch & PIC</span>
        </button>

        <button
          onClick={() => setActiveTab('product')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'product'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product & Units</span>
        </button>

        <button
          onClick={() => setActiveTab('customer')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'customer'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer & Groups</span>
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'references'
              ? 'border-accent-brass text-accent-brass font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink-primary hover:border-border'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Claim & Reference Lookups</span>
        </button>
      </div>

      {/* TAB 1: BRANCH & PIC */}
      {activeTab === 'branch_pic' && (
        <div className="space-y-6">
          <MasterDataTable
            title="Branches (dim_branch)"
            description="Operational branches and business areas linked to geographic city locations"
            data={branches}
            columns={branchColumns}
            searchFields={['branch_code', 'branch_name', 'city_name']}
            addLabel="Add Branch"
            onAdd={() => openModal('branch')}
            onEdit={(b) => openModal('branch', b)}
            onDelete={(b) => setDeleteConfirm({ type: 'branch', item: b, label: `Branch ${b.branch_code}` })}
          />

          <MasterDataTable
            title="Person in Charge (dim_pic)"
            description="Service engineers, section heads, and service leaders responsible for process checkpoints"
            data={pics}
            columns={picColumns}
            searchFields={['pic_name', 'pic_role_code']}
            addLabel="Add PIC"
            onAdd={() => openModal('pic')}
            onEdit={(p) => openModal('pic', p)}
            onDelete={(p) => setDeleteConfirm({ type: 'pic', item: p, label: `PIC ${p.pic_name}` })}
          />
        </div>
      )}

      {/* TAB 2: PRODUCT & UNITS */}
      {activeTab === 'product' && (
        <div className="space-y-6">
          <MasterDataTable
            title="Product Lines / Models (dim_product_model)"
            description="Standard product manufacturer brands and machine series (e.g. PER, MFT, KBT, FGW)"
            data={models}
            columns={modelColumns}
            searchFields={['product_code', 'product_type_name']}
            addLabel="Add Product Model"
            onAdd={() => openModal('model')}
            onEdit={(m) => openModal('model', m)}
            onDelete={(m) => setDeleteConfirm({ type: 'model', item: m, label: `Product Model ${m.product_code}` })}
          />

          <MasterDataTable
            title="Physical Unit Assets (dim_unit_asset)"
            description="Individual machine assets with unique serial numbers and unit model specifications"
            data={assets}
            columns={assetColumns}
            searchFields={['unit_model_name', 'serial_number', 'product_code']}
            addLabel="Add Unit Asset"
            onAdd={() => openModal('asset')}
            onEdit={(a) => openModal('asset', a)}
            onDelete={(a) => setDeleteConfirm({ type: 'asset', item: a, label: `Unit Asset ${a.unit_model_name} (${a.serial_number || 'No Serial'})` })}
          />
        </div>
      )}

      {/* TAB 3: CUSTOMER & GROUPS */}
      {activeTab === 'customer' && (
        <div className="space-y-6">
          <MasterDataTable
            title="Customer Groups (dim_customer_group)"
            description="Holding entities and Key Account classifications (KA Nasional vs Standard)"
            data={customerGroups}
            columns={groupColumns}
            searchFields={['group_name', 'key_account_type']}
            addLabel="Add Customer Group"
            onAdd={() => openModal('group')}
            onEdit={(g) => openModal('group', g)}
            onDelete={(g) => setDeleteConfirm({ type: 'group', item: g, label: `Customer Group ${g.group_name}` })}
          />

          <MasterDataTable
            title="Customer Companies (dim_customer)"
            description="Client accounts linked to customer groups and issue cases"
            data={customers}
            columns={customerColumns}
            searchFields={['customer_name', 'group_name']}
            addLabel="Add Customer"
            onAdd={() => openModal('customer')}
            onEdit={(c) => openModal('customer', c)}
            onDelete={(c) => setDeleteConfirm({ type: 'customer', item: c, label: `Customer ${c.customer_name}` })}
          />
        </div>
      )}

      {/* TAB 4: CLAIM & REFERENCE LOOKUPS */}
      {activeTab === 'references' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MasterDataTable
            title="Claimable Statuses (ref_claimable_status)"
            data={claimableStatuses}
            columns={claimStatusColumns}
            searchFields={['status_name']}
            addLabel="Add Status"
            onAdd={() => openModal('claimable_status')}
            onEdit={(s) => openModal('claimable_status', s)}
            onDelete={(s) => setDeleteConfirm({ type: 'claimable_status', item: s, label: `Claim Status ${s.status_name}` })}
          />

          <MasterDataTable
            title="Root Causes (ref_root_cause)"
            data={rootCauses}
            columns={rootCauseColumns}
            searchFields={['root_cause_name']}
            addLabel="Add Root Cause"
            onAdd={() => openModal('root_cause')}
            onEdit={(r) => openModal('root_cause', r)}
            onDelete={(r) => setDeleteConfirm({ type: 'root_cause', item: r, label: `Root Cause ${r.root_cause_name}` })}
          />

          <div className="lg:col-span-2">
            <MasterDataTable
              title="Bottleneck Reasons (ref_bottleneck_reason)"
              data={bottlenecks}
              columns={bottleneckColumns}
              searchFields={['bottleneck_name']}
              addLabel="Add Bottleneck Reason"
              onAdd={() => openModal('bottleneck')}
              onEdit={(b) => openModal('bottleneck', b)}
              onDelete={(b) => setDeleteConfirm({ type: 'bottleneck', item: b, label: `Bottleneck Reason ${b.bottleneck_name}` })}
            />
          </div>
        </div>
      )}

      {/* --- ADD / EDIT MODAL --- */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-border flex items-center justify-between bg-base/30">
              <h3 className="text-sm font-bold text-ink-primary capitalize">
                {editItem ? `Edit ${modalType.replace('_', ' ')}` : `Add New ${modalType.replace('_', ' ')}`}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-base"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Fields: Branch */}
              {modalType === 'branch' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Branch Code (e.g. JKT, BJM) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.branch_code || ''}
                      onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Branch Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.branch_name || ''}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="e.g. Jakarta Head Office"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Location / City
                    </label>
                    <select
                      value={formData.branch_location_id || ''}
                      onChange={(e) => setFormData({ ...formData, branch_location_id: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    >
                      <option value="">-- Select City --</option>
                      {locations.map((l) => (
                        <option key={l.branch_location_id} value={l.branch_location_id}>
                          {l.city_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Form Fields: PIC */}
              {modalType === 'pic' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      PIC Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pic_name || ''}
                      onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Role Code (e.g. SDH, PS, PDH)
                    </label>
                    <input
                      type="text"
                      value={formData.pic_role_code || ''}
                      onChange={(e) => setFormData({ ...formData, pic_role_code: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono uppercase"
                    />
                  </div>
                </>
              )}

              {/* Form Fields: Product Model */}
              {modalType === 'model' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Product Code (e.g. PER, MFT, KBT) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.product_code || ''}
                      onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Product Line / Brand Name
                    </label>
                    <input
                      type="text"
                      value={formData.product_type_name || ''}
                      onChange={(e) => setFormData({ ...formData, product_type_name: e.target.value })}
                      placeholder="e.g. Perkins Engine Series"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                </>
              )}

              {/* Form Fields: Unit Asset */}
              {modalType === 'asset' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Product Line / Brand *
                    </label>
                    <select
                      required
                      value={formData.product_model_id || ''}
                      onChange={(e) => setFormData({ ...formData, product_model_id: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    >
                      <option value="">-- Select Product Line --</option>
                      {models.map((m) => (
                        <option key={m.product_model_id} value={m.product_model_id}>
                          {m.product_code} ({m.product_type_name || 'No description'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Unit Model Name (e.g. PL2000 kVA, 404D-22G) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unit_model_name || ''}
                      onChange={(e) => setFormData({ ...formData, unit_model_name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={formData.serial_number || ''}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="e.g. TG40200IS11002"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.delivery_date || ''}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                </>
              )}

              {/* Form Fields: Customer Group */}
              {modalType === 'group' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.group_name || ''}
                      onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Key Account Classification
                    </label>
                    <select
                      value={formData.key_account_type || ''}
                      onChange={(e) => setFormData({ ...formData, key_account_type: e.target.value || null })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    >
                      <option value="KA NASIONAL">KA NASIONAL (15 Days SLA)</option>
                      <option value="">Standard / Non-KA (20 Days SLA)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Form Fields: Customer */}
              {modalType === 'customer' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Customer Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name || ''}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Customer Group
                    </label>
                    <select
                      value={formData.customer_group_id || ''}
                      onChange={(e) => setFormData({ ...formData, customer_group_id: e.target.value || null })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    >
                      <option value="">-- No Group Assigned --</option>
                      {customerGroups.map((g) => (
                        <option key={g.customer_group_id} value={g.customer_group_id}>
                          {g.group_name} ({g.key_account_type || 'Non-KA'})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Form Fields: Root Cause / Bottleneck */}
              {(modalType === 'root_cause' || modalType === 'bottleneck') && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Name / Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || formData.root_cause_name || formData.bottleneck_name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                  />
                </div>
              )}

              {/* Form Fields: Claimable Status */}
              {modalType === 'claimable_status' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Status Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || formData.status_name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:border-accent-brass"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="warranty_scope_cb"
                      checked={Boolean(formData.is_warranty_scope)}
                      onChange={(e) => setFormData({ ...formData, is_warranty_scope: e.target.checked })}
                      className="rounded border-border text-accent-brass focus:ring-accent-brass"
                    />
                    <label htmlFor="warranty_scope_cb" className="text-xs text-ink-primary select-none cursor-pointer">
                      Warranty Scope (Covered under warranty rules)
                    </label>
                  </div>
                </>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-1.5 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-base transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent-brass text-white font-semibold hover:bg-accent-brass/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editItem ? 'Save Changes' : 'Create Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink-primary">Confirm Delete</h3>
                <p className="text-ink-muted text-xs mt-1">
                  Are you sure you want to delete <strong>{deleteConfirm.label}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-md border border-border text-ink-muted hover:text-ink-primary hover:bg-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExecute}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
