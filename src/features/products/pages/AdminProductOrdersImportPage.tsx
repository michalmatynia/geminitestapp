'use client';

import { RefreshCcw, ShoppingBag } from 'lucide-react';
import React, { useMemo } from 'react';

import { buildBaseOrderQuickImportFeedback } from '@/features/products/utils/base-order-quick-import-feedback';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { SearchInput } from '@/shared/ui/search-input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';

import {
  LIMIT_OPTIONS,
  summarizeOrderAggregate,
} from './AdminProductOrdersImportPage.utils';
import { buildColumns } from './AdminProductOrdersImportPage.columns';
import { OrderDetails } from './AdminProductOrdersImportPage.OrderDetails';
import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products/orders-import';
import { useAdminProductOrdersImportState } from './AdminProductOrdersImportPage.hooks';

export function AdminProductOrdersImportPage(): React.JSX.Element {
  const state = useAdminProductOrdersImportState();
  const {
    areIntegrationsLoading,
    baseConnections,
    selectedConnectionId,
    setSelectedConnectionId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    statusId,
    setStatusId,
    limit,
    setLimit,
    preview,
    lastPreviewScope,
    feedback,
    setFeedback,
    importStateFilter,
    setImportStateFilter,
    viewSearchQuery,
    setViewSearchQuery,
    rowSelection,
    setRowSelection,
    expanded,
    setExpanded,
    previewMutation,
    importMutation,
    quickImportMutation,
    availableStatuses,
    isPreviewStale,
    previewScopeChanges,
    filteredOrders,
    handlePreview,
    handleRestoreLoadedPreviewScope,
    handleResetViewFilters,
    handleToggleExpanded,
  } = state;

  const selectedOrders = useMemo(() => {
    if (!preview) return [];
    return preview.orders.filter((order) => rowSelection[order.baseOrderId]);
  }, [preview, rowSelection]);

  const aggregate = useMemo(() => summarizeOrderAggregate(filteredOrders), [filteredOrders]);

  const columns = useMemo(
    () =>
      buildColumns({
        expanded,
        handleToggleExpanded,
        isPreviewStale,
      }),
    [expanded, handleToggleExpanded, isPreviewStale]
  );

  const handleImport = async (
    ordersToImport: BaseOrderImportPreviewItem[] = selectedOrders
  ): Promise<void> => {
    if (!preview || !selectedConnectionId || ordersToImport.length === 0) return;
    try {
      setFeedback(null);
      const result = await importMutation.mutateAsync({
        connectionId: selectedConnectionId,
        orders: ordersToImport,
      });
      setFeedback({
        variant: 'success',
        message: `Successfully imported ${result.importedCount} orders.`,
      });
      setRowSelection({});
      void handlePreview();
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Import failed.',
      });
    }
  };

  const handleQuickImport = async (): Promise<void> => {
    if (!selectedConnectionId) return;
    try {
      setFeedback(null);
      const result = await quickImportMutation.mutateAsync({
        connectionId: selectedConnectionId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        statusId: statusId || undefined,
        limit: Number.parseInt(limit, 10),
      });
      setFeedback(buildBaseOrderQuickImportFeedback(result));
      if (preview) void handlePreview();
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Quick import failed.',
      });
    }
  };

  return (
    <AdminProductsPageLayout
      activeTab='orders-import'
      title='Base.com Orders Import'
      headerActions={
        <Button
          variant='primary'
          onClick={() => void handleQuickImport()}
          loading={quickImportMutation.isPending}
          icon={<RefreshCcw size={16} />}
        >
          Quick Import
        </Button>
      }
    >
      <div className='space-y-6'>
        <StandardDataTablePanel
          title='Import Scope'
          variant='embedded'
          headerActions={
            <div className='flex items-center gap-2'>
              <Button
                variant='surface'
                onClick={handleRestoreLoadedPreviewScope}
                disabled={!lastPreviewScope || !isPreviewStale}
              >
                Restore Loaded
              </Button>
              <Button
                variant='primary'
                onClick={() => void handlePreview()}
                loading={previewMutation.isPending}
              >
                Load Preview
              </Button>
            </div>
          }
        >
          <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-5'>
            <div className='space-y-1'>
              <span className='mb-1 block text-xs font-bold uppercase text-slate-500'>Connection</span>
              <SelectSimple
                value={selectedConnectionId}
                onChange={setSelectedConnectionId}
                options={baseConnections}
                placeholder='Select connection...'
                disabled={areIntegrationsLoading}
              />
            </div>
            <div className='space-y-1'>
              <span className='mb-1 block text-xs font-bold uppercase text-slate-500'>From Date</span>
              <Input type='date' value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className='space-y-1'>
              <span className='mb-1 block text-xs font-bold uppercase text-slate-500'>To Date</span>
              <Input type='date' value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className='space-y-1'>
              <span className='mb-1 block text-xs font-bold uppercase text-slate-500'>Status</span>
              <SelectSimple
                value={statusId}
                onChange={setStatusId}
                options={availableStatuses.map((s) => ({ value: s.id, label: s.name }))}
                placeholder='All statuses'
              />
            </div>
            <div className='space-y-1'>
              <span className='mb-1 block text-xs font-bold uppercase text-slate-500'>Limit</span>
              <SelectSimple value={limit} onChange={setLimit} options={LIMIT_OPTIONS} />
            </div>
          </div>
        </StandardDataTablePanel>

        {feedback && (
          <Alert variant={feedback.variant} title={feedback.variant === 'error' ? 'Error' : 'Notification'}>
            {feedback.message}
          </Alert>
        )}

        {isPreviewStale && (
          <Alert variant='warning' title='Preview is stale'>
            The filters have changed since the preview was loaded.
            <ul className='mt-2 list-inside list-disc text-sm'>
              {previewScopeChanges.map((change) => (
                <li key={change.key}>
                  {change.label}: <span className='line-through text-slate-400'>{change.loaded}</span> → <strong>{change.current}</strong>
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {preview && (
          <StandardDataTablePanel
            title='Order Preview'
            variant='embedded'
            headerActions={
              <div className='flex items-center gap-3'>
                <div className='text-sm text-slate-500'>
                  Total: <strong>{aggregate.grossLabel}</strong> ({filteredOrders.length} orders)
                </div>
                <Button
                  variant='primary'
                  disabled={selectedOrders.length === 0}
                  onClick={() => void handleImport()}
                  loading={importMutation.isPending}
                >
                  Import Selected ({selectedOrders.length})
                </Button>
              </div>
            }
          >
            <div className='border-b border-slate-100 bg-slate-50/50 p-3'>
              <div className='flex flex-wrap items-center gap-4'>
                <SearchInput
                  className='max-w-xs'
                  placeholder='Search orders...'
                  value={viewSearchQuery}
                  onChange={(event) => setViewSearchQuery(event.target.value)}
                />
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-bold text-slate-500 uppercase'>State:</span>
                  <div className='flex gap-1'>
                    {(['all', 'new', 'changed', 'imported'] as const).map((f) => (
                      <Badge
                        key={f}
                        variant={importStateFilter === f ? 'primary' : 'outline'}
                        className='cursor-pointer'
                        onClick={() => setImportStateFilter(f)}
                      >
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className='flex-1' />
                <Button variant='ghost' size='sm' onClick={handleResetViewFilters}>Reset View</Button>
              </div>
            </div>

            <StandardDataTablePanel
              columns={columns}
              data={filteredOrders}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              getRowId={(r: BaseOrderImportPreviewItem) => r.baseOrderId}
              renderRowDetails={({ row }) => (
                <OrderDetails
                  order={row.original}
                  changeSummary={[]}
                  isPreviewStale={isPreviewStale}
                  isImportPending={importMutation.isPending}
                  isQuickImportPending={quickImportMutation.isPending}
                  onImport={(orders) => void handleImport(orders)}
                />
              )}
              expanded={expanded}
              // @ts-expect-error - ExpandedState type mismatch with Record<string, boolean>
              onExpandedChange={setExpanded}
            />
          </StandardDataTablePanel>
        )}

        {!preview && !previewMutation.isPending && (
          <EmptyState
            icon={<ShoppingBag size={48} />}
            title='No preview loaded'
            description='Select a connection and click "Load Preview" to see orders available for import.'
          />
        )}
      </div>
    </AdminProductsPageLayout>
  );
}

export default AdminProductOrdersImportPage;
