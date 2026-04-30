'use client';

import { RefreshCcw, ShoppingBag } from 'lucide-react';
import React from 'react';

import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products/orders-import';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { SearchInput } from '@/shared/ui/search-input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';

import { OrderDetails } from './AdminProductOrdersImportPage.OrderDetails';
import type { useAdminProductOrdersImportState } from './AdminProductOrdersImportPage.hooks';
import type { AdminProductOrdersImportPageModel } from './AdminProductOrdersImportPage.model';
import { LIMIT_OPTIONS } from './AdminProductOrdersImportPage.utils';

type OrdersImportState = ReturnType<typeof useAdminProductOrdersImportState>;

export const QuickImportButton = (props: {
  isPending: boolean;
  onQuickImport: () => void;
}): React.JSX.Element => (
  <Button
    variant='primary'
    onClick={props.onQuickImport}
    loading={props.isPending}
    icon={<RefreshCcw size={16} />}
  >
    Quick Import
  </Button>
);

const ImportScopePanel = (props: {
  state: OrdersImportState;
  onPreview: () => void;
}): React.JSX.Element => {
  const { state, onPreview } = props;
  return (
    <StandardDataTablePanel
      title='Import Scope'
      variant='embedded'
      headerActions={
        <div className='flex items-center gap-2'>
          <Button
            variant='surface'
            onClick={state.handleRestoreLoadedPreviewScope}
            disabled={state.lastPreviewScope === null || !state.isPreviewStale}
          >
            Restore Loaded
          </Button>
          <Button variant='primary' onClick={onPreview} loading={state.previewMutation.isPending}>
            Load Preview
          </Button>
        </div>
      }
    >
      <ImportScopeFields state={state} />
    </StandardDataTablePanel>
  );
};

const ImportScopeFields = (props: { state: OrdersImportState }): React.JSX.Element => (
  <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-5'>
    <ScopeField label='Connection'>
      <SelectSimple
        value={props.state.selectedConnectionId}
        onChange={props.state.setSelectedConnectionId}
        options={props.state.baseConnections}
        placeholder='Select connection...'
        disabled={props.state.areIntegrationsLoading}
      />
    </ScopeField>
    <ScopeField label='From Date'>
      <Input
        type='date'
        value={props.state.dateFrom}
        onChange={(event) => props.state.setDateFrom(event.target.value)}
      />
    </ScopeField>
    <ScopeField label='To Date'>
      <Input
        type='date'
        value={props.state.dateTo}
        onChange={(event) => props.state.setDateTo(event.target.value)}
      />
    </ScopeField>
    <ScopeField label='Status'>
      <SelectSimple
        value={props.state.statusId}
        onChange={props.state.setStatusId}
        options={props.state.availableStatuses.map((status) => ({
          value: status.id,
          label: status.name,
        }))}
        placeholder='All statuses'
      />
    </ScopeField>
    <ScopeField label='Limit'>
      <SelectSimple
        value={props.state.limit}
        onChange={props.state.setLimit}
        options={LIMIT_OPTIONS}
      />
    </ScopeField>
  </div>
);

const ScopeField = (props: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element => (
  <div className='space-y-1'>
    <span className='mb-1 block text-xs font-bold uppercase text-slate-500'>{props.label}</span>
    {props.children}
  </div>
);

const FeedbackAlerts = (props: { state: OrdersImportState }): React.JSX.Element => {
  const { feedback, isPreviewStale, previewScopeChanges } = props.state;
  return (
    <>
      {feedback !== null && (
        <Alert
          variant={feedback.variant}
          title={feedback.variant === 'error' ? 'Error' : 'Notification'}
        >
          {feedback.message}
        </Alert>
      )}
      {isPreviewStale && (
        <Alert variant='warning' title='Preview is stale'>
          The filters have changed since the preview was loaded.
          <ul className='mt-2 list-inside list-disc text-sm'>
            {previewScopeChanges.map((change) => (
              <li key={change.key}>
                {change.label}:{' '}
                <span className='line-through text-slate-400'>{change.loaded}</span> →{' '}
                <strong>{change.current}</strong>
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </>
  );
};

const OrderPreviewHeaderActions = (props: {
  model: AdminProductOrdersImportPageModel;
  state: OrdersImportState;
}): React.JSX.Element => (
  <div className='flex items-center gap-3'>
    <div className='text-sm text-slate-500'>
      Total: <strong>{props.model.aggregate.grossLabel}</strong> (
      {props.state.filteredOrders.length} orders)
    </div>
    <Button
      variant='primary'
      disabled={props.model.selectedOrders.length === 0}
      onClick={() => {
        props.model.handleImport().catch((): undefined => undefined);
      }}
      loading={props.state.importMutation.isPending}
    >
      Import Selected ({props.model.selectedOrders.length})
    </Button>
  </div>
);

const OrderPreviewFilters = (props: { state: OrdersImportState }): React.JSX.Element => (
  <div className='border-b border-slate-100 bg-slate-50/50 p-3'>
    <div className='flex flex-wrap items-center gap-4'>
      <SearchInput
        className='max-w-xs'
        placeholder='Search orders...'
        value={props.state.viewSearchQuery}
        onChange={(event) => props.state.setViewSearchQuery(event.target.value)}
      />
      <div className='flex items-center gap-2'>
        <span className='text-xs font-bold text-slate-500 uppercase'>State:</span>
        <div className='flex gap-1'>
          {(['all', 'new', 'changed', 'imported'] as const).map((filter) => (
            <Badge
              key={filter}
              variant={props.state.importStateFilter === filter ? 'primary' : 'outline'}
              className='cursor-pointer'
              onClick={() => props.state.setImportStateFilter(filter)}
            >
              {filter}
            </Badge>
          ))}
        </div>
      </div>
      <div className='flex-1' />
      <Button variant='ghost' size='sm' onClick={props.state.handleResetViewFilters}>
        Reset View
      </Button>
    </div>
  </div>
);

const OrderPreviewTable = (props: {
  model: AdminProductOrdersImportPageModel;
  state: OrdersImportState;
}): React.JSX.Element => (
  <StandardDataTablePanel
    columns={props.model.columns}
    data={props.state.filteredOrders}
    rowSelection={props.state.rowSelection}
    onRowSelectionChange={props.state.setRowSelection}
    getRowId={(row: BaseOrderImportPreviewItem) => row.baseOrderId}
    renderRowDetails={({ row }) => (
      <OrderDetails
        order={row.original}
        onImport={(orders) => {
          props.model.handleImport(orders).catch((): undefined => undefined);
        }}
      />
    )}
    expanded={props.state.expanded}
    // @ts-expect-error - ExpandedState type mismatch with Record<string, boolean>
    onExpandedChange={props.state.setExpanded}
  />
);

const OrderPreviewPanel = (props: {
  model: AdminProductOrdersImportPageModel;
  state: OrdersImportState;
}): React.JSX.Element | null => {
  if (props.state.preview === null) return null;
  return (
    <StandardDataTablePanel
      title='Order Preview'
      variant='embedded'
      headerActions={<OrderPreviewHeaderActions model={props.model} state={props.state} />}
    >
      <OrderPreviewFilters state={props.state} />
      <OrderPreviewTable model={props.model} state={props.state} />
    </StandardDataTablePanel>
  );
};

const EmptyPreview = (props: { state: OrdersImportState }): React.JSX.Element | null => {
  if (props.state.preview !== null) return null;
  if (props.state.previewMutation.isPending) return null;
  return (
    <EmptyState
      icon={<ShoppingBag size={48} />}
      title='No preview loaded'
      description='Select a connection and click "Load Preview" to see orders available for import.'
    />
  );
};

export const OrdersImportPageContent = (props: {
  model: AdminProductOrdersImportPageModel;
  state: OrdersImportState;
}): React.JSX.Element => (
  <div className='space-y-6'>
    <ImportScopePanel state={props.state} onPreview={props.model.handlePreviewClick} />
    <FeedbackAlerts state={props.state} />
    <OrderPreviewPanel model={props.model} state={props.state} />
    <EmptyPreview state={props.state} />
  </div>
);
