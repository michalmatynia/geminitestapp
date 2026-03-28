'use client';

import { RefreshCcw, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';

import {
  useImportBaseOrdersMutation,
  usePreviewBaseOrdersMutation,
  useQuickImportBaseOrdersMutation,
  useBaseOrderImportStatuses,
} from '@/features/products/hooks/useProductOrdersImport';
import { buildBaseOrderQuickImportFeedback } from '@/features/products/utils/base-order-quick-import-feedback';
import {
  useDefaultExportConnection,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import type {
  BaseOrderImportPreviewItem,
  BaseOrderImportPreviewResponse,
} from '@/shared/contracts/products';
import {
  AdminProductsPageLayout,
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  SearchInput,
  SelectSimple,
  StandardDataTablePanel,
} from '@/shared/ui';

import type { RowSelectionState } from '@tanstack/react-table';
import {
  BASE_INTEGRATION_SLUGS,
  FeedbackState,
  formatOrderTotal,
  formatPreviewScopeConnection,
  formatPreviewScopeDateRange,
  formatPreviewScopeStatus,
  getOrderTimestamp,
  ImportStateFilter,
  LIMIT_OPTIONS,
  normalizeSortText,
  OrderChangeSummaryItem,
  PreviewScopeChangeItem,
  PreviewScopeState,
  PreviewSortOption,
  summarizeOrderAggregate,
  buildPreviousImportSnapshot,
} from './AdminProductOrdersImportPage.utils';
import { buildColumns } from './AdminProductOrdersImportPage.columns';
import { OrderDetails } from './AdminProductOrdersImportPage.OrderDetails';

export function AdminProductOrdersImportPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const { data: integrationsWithConnections } = useIntegrationsWithConnections();
  const { connectionId: defaultConnectionId } = useDefaultExportConnection();

  const baseConnections = useMemo(
    () =>
      (integrationsWithConnections ?? [])
        .filter((integration) => BASE_INTEGRATION_SLUGS.has(integration.slug))
        .flatMap((integration) =>
          integration.connections.map((connection) => ({
            value: connection.id,
            label: `${connection.name} (${integration.name})`,
          }))
        ),
    [integrationsWithConnections]
  );

  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    searchParams?.get('connectionId') ?? defaultConnectionId ?? ''
  );
  const [dateFrom, setDateFrom] = useState<string>(searchParams?.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState<string>(searchParams?.get('dateTo') ?? '');
  const [statusId, setStatusId] = useState<string>(searchParams?.get('statusId') ?? '');
  const [limit, setLimit] = useState<string>(searchParams?.get('limit') ?? '50');

  const [preview, setPreview] = useState<BaseOrderImportPreviewResponse | null>(null);
  const [lastPreviewScope, setLastPreviewScope] = useState<PreviewScopeState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [importStateFilter, setImportStateFilter] = useState<ImportStateFilter>('all');
  const [viewSearchQuery, setViewSearchQuery] = useState('');
  const [viewSort, setViewSort] = useState<PreviewSortOption>('created-desc');

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const previewMutation = usePreviewBaseOrdersMutation();
  const importMutation = useImportBaseOrdersMutation();
  const quickImportMutation = useQuickImportBaseOrdersMutation();
  const integrationsQuery = useBaseOrderImportStatuses();

  const currentScope: PreviewScopeState = useMemo(
    () => ({
      connectionId: selectedConnectionId,
      dateFrom,
      dateTo,
      statusId,
      limit,
    }),
    [dateFrom, dateTo, limit, selectedConnectionId, statusId]
  );

  const isPreviewStale = useMemo(() => {
    if (!preview || !lastPreviewScope) return false;
    return (
      currentScope.connectionId !== lastPreviewScope.connectionId ||
      currentScope.dateFrom !== lastPreviewScope.dateFrom ||
      currentScope.dateTo !== lastPreviewScope.dateTo ||
      currentScope.statusId !== lastPreviewScope.statusId ||
      currentScope.limit !== lastPreviewScope.limit
    );
  }, [currentScope, lastPreviewScope, preview]);

  const previewScopeChanges = useMemo<PreviewScopeChangeItem[]>(() => {
    if (!lastPreviewScope || !isPreviewStale) return [];
    const changes: PreviewScopeChangeItem[] = [];

    if (currentScope.connectionId !== lastPreviewScope.connectionId) {
      changes.push({
        key: 'connection',
        label: 'Connection',
        loaded: formatPreviewScopeConnection(lastPreviewScope.connectionId, baseConnections),
        current: formatPreviewScopeConnection(currentScope.connectionId, baseConnections),
      });
    }

    if (
      currentScope.dateFrom !== lastPreviewScope.dateFrom ||
      currentScope.dateTo !== lastPreviewScope.dateTo
    ) {
      changes.push({
        key: 'dateRange',
        label: 'Date Range',
        loaded: formatPreviewScopeDateRange(lastPreviewScope),
        current: formatPreviewScopeDateRange(currentScope),
      });
    }

    if (currentScope.statusId !== lastPreviewScope.statusId) {
      const statusOptions = (preview?.availableStatuses ?? []).map((s) => ({
        value: s.id,
        label: s.name,
      }));
      changes.push({
        key: 'status',
        label: 'Status',
        loaded: formatPreviewScopeStatus(lastPreviewScope.statusId, statusOptions),
        current: formatPreviewScopeStatus(currentScope.statusId, statusOptions),
      });
    }

    if (currentScope.limit !== lastPreviewScope.limit) {
      changes.push({
        key: 'limit',
        label: 'Preview Limit',
        loaded: lastPreviewScope.limit,
        current: currentScope.limit,
      });
    }

    return changes;
  }, [baseConnections, currentScope, isPreviewStale, lastPreviewScope, preview?.availableStatuses]);

  const handlePreview = async (): Promise<void> => {
    if (!selectedConnectionId) {
      setFeedback({ variant: 'error', message: 'Please select a Base.com connection first.' });
      return;
    }

    try {
      setFeedback(null);
      const result = await previewMutation.mutateAsync({
        connectionId: selectedConnectionId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        statusId: statusId || undefined,
        limit: Number.parseInt(limit, 10),
      });

      setPreview(result);
      setLastPreviewScope({ ...currentScope });
      setRowSelection({});
      setExpanded({});
      setFeedback({ variant: 'info', message: `Found ${result.items.length} orders.` });
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch order preview.',
      });
    }
  };

  const handleRestoreLoadedPreviewScope = (): void => {
    if (!lastPreviewScope) return;
    setSelectedConnectionId(lastPreviewScope.connectionId);
    setDateFrom(lastPreviewScope.dateFrom);
    setDateTo(lastPreviewScope.dateTo);
    setStatusId(lastPreviewScope.statusId);
    setLimit(lastPreviewScope.limit);
  };

  const handleResetViewFilters = (): void => {
    setImportStateFilter('all');
    setViewSearchQuery('');
    setViewSort('created-desc');
  };

  const handleToggleExpanded = useCallback((orderId: string): void => {
    setExpanded((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }, []);

  const deferredSearchQuery = useDeferredValue(viewSearchQuery);

  const filteredOrders = useMemo(() => {
    if (!preview) return [];

    let result = [...preview.items];

    if (importStateFilter !== 'all') {
      result = result.filter((order) => order.importState === importStateFilter);
    }

    if (deferredSearchQuery.trim()) {
      const q = normalizeSortText(deferredSearchQuery);
      result = result.filter(
        (order) =>
          normalizeSortText(order.baseOrderId).includes(q) ||
          normalizeSortText(order.orderNumber).includes(q) ||
          normalizeSortText(order.buyerName).includes(q) ||
          normalizeSortText(order.buyerEmail).includes(q)
      );
    }

    result.sort((a, b) => {
      switch (viewSort) {
        case 'created-desc':
          return getOrderTimestamp(b.orderCreatedAt) - getOrderTimestamp(a.orderCreatedAt);
        case 'created-asc':
          return getOrderTimestamp(a.orderCreatedAt) - getOrderTimestamp(b.orderCreatedAt);
        case 'customer-asc':
          return normalizeSortText(a.buyerName).localeCompare(normalizeSortText(b.buyerName));
        case 'total-desc':
          return (b.totalGross ?? 0) - (a.totalGross ?? 0);
        case 'import-priority': {
          const priority = { changed: 0, new: 1, imported: 2 };
          return priority[a.importState] - priority[b.importState];
        }
        default:
          return 0;
      }
    });

    return result;
  }, [deferredSearchQuery, importStateFilter, preview, viewSort]);

  const selectedOrders = useMemo(() => {
    if (!preview) return [];
    return preview.items.filter((order) => rowSelection[order.baseOrderId]);
  }, [preview, rowSelection]);

  const selectedVisibleOrders = useMemo(
    () => filteredOrders.filter((order) => rowSelection[order.baseOrderId]),
    [filteredOrders, rowSelection]
  );

  const importableVisibleOrders = useMemo(
    () => filteredOrders.filter((order) => order.importState !== 'imported'),
    [filteredOrders]
  );

  const importedVisibleOrders = useMemo(
    () => filteredOrders.filter((order) => order.importState === 'imported'),
    [filteredOrders]
  );

  const newVisibleOrders = useMemo(
    () => filteredOrders.filter((order) => order.importState === 'new'),
    [filteredOrders]
  );

  const changedVisibleOrders = useMemo(
    () => filteredOrders.filter((order) => order.importState === 'changed'),
    [filteredOrders]
  );

  const selectedVisibleExpandedCount = useMemo(
    () => selectedVisibleOrders.filter((order) => expanded[order.baseOrderId]).length,
    [expanded, selectedVisibleOrders]
  );

  const importableVisibleExpandedCount = useMemo(
    () => importableVisibleOrders.filter((order) => expanded[order.baseOrderId]).length,
    [expanded, importableVisibleOrders]
  );

  const visibleExpandedCount = useMemo(
    () => filteredOrders.filter((order) => expanded[order.baseOrderId]).length,
    [expanded, filteredOrders]
  );

  const expandedOrderIds = useMemo(
    () => new Set(Object.entries(expanded).filter(([, v]) => v).map(([k]) => k)),
    [expanded]
  );

  const hiddenExpandedCount = useMemo(() => {
    const visibleIds = new Set(filteredOrders.map((o) => o.baseOrderId));
    let count = 0;
    expandedOrderIds.forEach((id) => {
      if (!visibleIds.has(id)) count++;
    });
    return count;
  }, [expandedOrderIds, filteredOrders]);

  const selectedHiddenCount = useMemo(() => {
    const visibleIds = new Set(filteredOrders.map((o) => o.baseOrderId));
    return Object.keys(rowSelection).filter((id) => !visibleIds.has(id)).length;
  }, [filteredOrders, rowSelection]);

  const handleSelectVisibleImportable = (): void => {
    const nextSelection = { ...rowSelection };
    importableVisibleOrders.forEach((order) => {
      nextSelection[order.baseOrderId] = true;
    });
    setRowSelection(nextSelection);
  };

  const handleSelectVisibleImported = (): void => {
    const nextSelection = { ...rowSelection };
    importedVisibleOrders.forEach((order) => {
      nextSelection[order.baseOrderId] = true;
    });
    setRowSelection(nextSelection);
  };

  const handleSelectVisibleChanged = (): void => {
    const nextSelection = { ...rowSelection };
    changedVisibleOrders.forEach((order) => {
      nextSelection[order.baseOrderId] = true;
    });
    setRowSelection(nextSelection);
  };

  const handleSelectVisibleNew = (): void => {
    const nextSelection = { ...rowSelection };
    newVisibleOrders.forEach((order) => {
      nextSelection[order.baseOrderId] = true;
    });
    setRowSelection(nextSelection);
  };

  const handleClearSelection = (): void => setRowSelection({});
  const handleClearVisibleSelection = (): void => {
    const nextSelection = { ...rowSelection };
    filteredOrders.forEach((order) => {
      delete nextSelection[order.baseOrderId];
    });
    setRowSelection(nextSelection);
  };
  const handleClearHiddenSelection = (): void => {
    const visibleIds = new Set(filteredOrders.map((o) => o.baseOrderId));
    const nextSelection = { ...rowSelection };
    Object.keys(rowSelection).forEach((id) => {
      if (!visibleIds.has(id)) delete nextSelection[id];
    });
    setRowSelection(nextSelection);
  };

  const handleExpandVisibleImportableDetails = (): void => {
    const nextExpanded = { ...expanded };
    importableVisibleOrders.forEach((order) => {
      nextExpanded[order.baseOrderId] = true;
    });
    setExpanded(nextExpanded);
  };

  const handleCollapseVisibleImportableDetails = (): void => {
    const nextExpanded = { ...expanded };
    importableVisibleOrders.forEach((order) => {
      delete nextExpanded[order.baseOrderId];
    });
    setExpanded(nextExpanded);
  };

  const handleExpandVisibleNewDetails = (): void => {
    const nextExpanded = { ...expanded };
    newVisibleOrders.forEach((order) => {
      nextExpanded[order.baseOrderId] = true;
    });
    setExpanded(nextExpanded);
  };

  const handleExpandVisibleChangedDetails = (): void => {
    const nextExpanded = { ...expanded };
    changedVisibleOrders.forEach((order) => {
      nextExpanded[order.baseOrderId] = true;
    });
    setExpanded(nextExpanded);
  };

  const handleExpandVisibleImportedDetails = (): void => {
    const nextExpanded = { ...expanded };
    importedVisibleOrders.forEach((order) => {
      nextExpanded[order.baseOrderId] = true;
    });
    setExpanded(nextExpanded);
  };

  const handleExpandSelectedVisibleDetails = (): void => {
    const nextExpanded = { ...expanded };
    selectedVisibleOrders.forEach((order) => {
      nextExpanded[order.baseOrderId] = true;
    });
    setExpanded(nextExpanded);
  };

  const handleCollapseSelectedVisibleDetails = (): void => {
    const nextExpanded = { ...expanded };
    selectedVisibleOrders.forEach((order) => {
      delete nextExpanded[order.baseOrderId];
    });
    setExpanded(nextExpanded);
  };

  const handleExpandVisibleDetails = (): void => {
    const nextExpanded = { ...expanded };
    filteredOrders.forEach((order) => {
      nextExpanded[order.baseOrderId] = true;
    });
    setExpanded(nextExpanded);
  };

  const handleCollapseVisibleDetails = (): void => {
    const nextExpanded = { ...expanded };
    filteredOrders.forEach((order) => {
      delete nextExpanded[order.baseOrderId];
    });
    setExpanded(nextExpanded);
  };

  const handleCollapseHiddenDetails = (): void => {
    const visibleIds = new Set(filteredOrders.map((o) => o.baseOrderId));
    const nextExpanded = { ...expanded };
    Object.keys(expanded).forEach((id) => {
      if (!visibleIds.has(id)) delete nextExpanded[id];
    });
    setExpanded(nextExpanded);
  };

  const handleCollapseAllDetails = (): void => setExpanded({});

  const handleImport = async (orders: BaseOrderImportPreviewItem[]): Promise<void> => {
    if (orders.length === 0) return;

    try {
      setFeedback(null);
      const result = await importMutation.mutateAsync({
        connectionId: selectedConnectionId,
        orders: orders.map((order) => ({
          baseOrderId: order.baseOrderId,
          previousSnapshot: order.previousImport
            ? buildPreviousImportSnapshot(order.previousImport, new Date().toISOString())
            : null,
        })),
      });

      setFeedback({
        variant: 'success',
        message: `Successfully imported ${result.importedCount} orders. ${result.skippedCount} skipped.`,
      });

      void handlePreview();
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to import orders.',
      });
    }
  };

  const handleQuickImport = async (): Promise<void> => {
    if (!selectedConnectionId) return;

    try {
      setFeedback(null);
      const result = await quickImportMutation.mutateAsync({
        connectionId: selectedConnectionId,
      });

      const quickFeedback = buildBaseOrderQuickImportFeedback(result);
      setFeedback({
        variant: quickFeedback.variant,
        message: quickFeedback.message,
      });

      void handlePreview();
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to run quick import.',
      });
    }
  };

  const handleImportSelected = async (): Promise<void> => {
    if (selectedOrders.length === 0) return;

    const importable = selectedOrders.filter((order) => order.importState !== 'imported');
    const alreadyImported = selectedOrders.filter((order) => order.importState === 'imported');

    if (importable.length === 0 && alreadyImported.length > 0) {
      setFeedback({
        variant: 'info',
        message: 'All selected orders are already imported. No actions performed.',
      });
      return;
    }

    try {
      await handleImport(importable);
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to import selected orders.',
      });
    }
  };

  const columns = useMemo(
    () => buildColumns({ expanded, handleToggleExpanded, isPreviewStale }),
    [expanded, handleToggleExpanded, isPreviewStale]
  );

  const panelAlerts = (
    <div className='space-y-3'>
      {!baseConnections.length ? (
        <Alert variant='warning' title='No Base.com connections available'>
          Configure a Base.com connection in{' '}
          <Link href='/admin/integrations' className='underline underline-offset-4'>
            Integrations
          </Link>{' '}
          before previewing orders.
        </Alert>
      ) : null}
      {isPreviewStale ? (
        <Alert variant='warning' title='Preview out of date'>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-3'>
              <span>
                Preview scope changed. Run Preview orders again before importing or selecting
                orders.
              </span>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={() => {
                  void handlePreview();
                }}
                disabled={previewMutation.isPending || !selectedConnectionId}
              >
                Refresh preview now
              </Button>
              <Button
                type='button'
                size='xs'
                variant='ghost'
                onClick={handleRestoreLoadedPreviewScope}
                disabled={!lastPreviewScope}
              >
                Restore loaded scope
              </Button>
            </div>
            {previewScopeChanges.length > 0 ? (
              <div className='space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-3 text-xs text-amber-100/90'>
                <div className='text-xs uppercase tracking-[0.18em] text-blue-200/80'>
                  Loaded scope vs current scope
                </div>
                {previewScopeChanges.map((change) => (
                  <div
                    key={change.key}
                    className='flex items-start justify-between gap-3 rounded-md border border-amber-400/20 bg-amber-500/5 px-2 py-2'
                  >
                    <span className='text-amber-200/80'>{change.label}</span>
                    <span className='text-right text-amber-50'>
                      {change.loaded} {'->'} {change.current}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Alert>
      ) : null}
      {feedback && !(isPreviewStale && feedback.variant === 'info') ? (
        <Alert
          variant={feedback.variant}
          title={
            feedback.variant === 'success'
              ? 'Import completed'
              : feedback.variant === 'error'
                ? 'Orders import failed'
                : 'Preview ready'
          }
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      ) : null}
    </div>
  );

  const panelActions = (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleQuickImport}
        disabled={quickImportMutation.isPending || !selectedConnectionId}
        loading={quickImportMutation.isPending}
      >
        <RefreshCcw className='mr-2 size-4' /> Quick Import
      </Button>
      <Button
        type='button'
        variant='default'
        size='sm'
        onClick={() => {
          void handlePreview();
        }}
        disabled={previewMutation.isPending || !selectedConnectionId}
        loading={previewMutation.isPending}
      >
        Preview Base.com Orders
      </Button>
    </div>
  );

  const panelFilters = (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end'>
      <div className='lg:col-span-3'>
        <SelectSimple
          label='Base.com Connection'
          value={selectedConnectionId}
          onValueChange={setSelectedConnectionId}
          options={baseConnections}
          placeholder='Select connection...'
          disabled={previewMutation.isPending}
          ariaLabel='Select option'
          title='Select connection...'
        />
      </div>
      <div className='lg:col-span-2'>
        <Input
          type='date'
          label='From Date'
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          disabled={previewMutation.isPending}
          aria-label='Input field'
          title='Input field'
        />
      </div>
      <div className='lg:col-span-2'>
        <Input
          type='date'
          label='To Date'
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          disabled={previewMutation.isPending}
          aria-label='Input field'
          title='Input field'
        />
      </div>
      <div className='lg:col-span-2'>
        <SelectSimple
          label='Status Filter'
          value={statusId}
          onValueChange={setStatusId}
          options={(preview?.availableStatuses ?? []).map((s) => ({ value: s.id, label: s.name }))}
          placeholder='All statuses'
          disabled={previewMutation.isPending || !preview}
          ariaLabel='Select option'
          title='All statuses'
        />
      </div>
      <div className='lg:col-span-1'>
        <SelectSimple
          label='Limit'
          value={limit}
          onValueChange={setLimit}
          options={LIMIT_OPTIONS}
          disabled={previewMutation.isPending}
          ariaLabel='Select option'
          title='Select option'
        />
      </div>
      <div className='lg:col-span-2'>
        <Button
          type='button'
          className='w-full'
          variant='secondary'
          onClick={() => {
            void handlePreview();
          }}
          disabled={previewMutation.isPending || !selectedConnectionId}
        >
          Run Preview
        </Button>
      </div>

      <div className='lg:col-span-12'>
        <div className='h-px bg-border/40' />
      </div>

      <div className='lg:col-span-4'>
        <SearchInput
          placeholder='Search in loaded orders...'
          value={viewSearchQuery}
          onChange={setViewSearchQuery}
          disabled={!preview}
        />
      </div>
      <div className='lg:col-span-3'>
        <SelectSimple
          label='Import State'
          value={importStateFilter}
          onValueChange={(val) => setImportStateFilter(val as ImportStateFilter)}
          options={[
            { value: 'all', label: 'All Orders' },
            { value: 'new', label: 'New Only' },
            { value: 'changed', label: 'Changed Only' },
            { value: 'imported', label: 'Already Imported' },
          ]}
          disabled={!preview}
          ariaLabel='Select option'
          title='Select option'
        />
      </div>
      <div className='lg:col-span-3'>
        <SelectSimple
          label='Sort By'
          value={viewSort}
          onValueChange={(val) => setViewSort(val as PreviewSortOption)}
          options={[
            { value: 'created-desc', label: 'Date: Newest First' },
            { value: 'created-asc', label: 'Date: Oldest First' },
            { value: 'customer-asc', label: 'Customer Name (A-Z)' },
            { value: 'total-desc', label: 'Total Value (High-Low)' },
            { value: 'import-priority', label: 'Import Priority' },
          ]}
          disabled={!preview}
          ariaLabel='Select option'
          title='Select option'
        />
      </div>
      <div className='lg:col-span-2'>
        <Button
          type='button'
          className='w-full'
          variant='outline'
          onClick={handleImportSelected}
          disabled={importMutation.isPending || selectedOrders.length === 0 || isPreviewStale}
          loading={importMutation.isPending}
        >
          Import Selected ({selectedOrders.length})
        </Button>
      </div>
    </div>
  );

  const hasActiveViewFilters =
    viewSearchQuery.trim() !== '' || importStateFilter !== 'all' || viewSort !== 'created-desc';

  const panelFooter = preview ? (
    <div className='flex flex-wrap items-center justify-between gap-4'>
      <div className='flex flex-wrap items-center gap-4 text-xs text-gray-400'>
        <div className='flex items-center gap-2'>
          <span className='h-2 w-2 rounded-full bg-success' />
          <span>{preview.stats.newCount} New</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='h-2 w-2 rounded-full bg-info' />
          <span>{preview.stats.changedCount} Changed</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='h-2 w-2 rounded-full bg-warning' />
          <span>{preview.stats.importedCount} Imported</span>
        </div>
        <div className='ml-2 h-4 w-px bg-border/40' />
        <div className='flex items-center gap-2 font-medium text-gray-300'>
          <span>
            Showing {filteredOrders.length} of {preview.stats.total} loaded orders
          </span>
          {selectedOrders.length > 0 && (
            <span className='text-blue-400'>( {selectedOrders.length} selected )</span>
          )}
        </div>
      </div>

      <div className='flex items-center gap-3 rounded-lg border border-border/40 bg-black/20 px-3 py-2'>
        <div className='text-[11px] uppercase tracking-wider text-gray-500'>View Total</div>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-1.5'>
            <span className='text-[10px] text-gray-500'>Items:</span>
            <span className='text-sm font-semibold text-white'>
              {summarizeOrderAggregate(filteredOrders).itemsTotal}
            </span>
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='text-[10px] text-gray-500'>Gross:</span>
            <span className='text-sm font-semibold text-white'>
              {summarizeOrderAggregate(filteredOrders).grossLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const renderOrderDetails = useCallback(
    (order: BaseOrderImportPreviewItem) => {
      const changeSummary: OrderChangeSummaryItem[] = [];

      if (order.previousImport) {
        const prev = order.previousImport;
        if (prev.externalStatusId !== order.externalStatusId) {
          changeSummary.push({
            key: 'status',
            label: 'Status changed',
            previous: prev.externalStatusName ?? prev.externalStatusId ?? 'Unknown',
            current: order.externalStatusName ?? order.externalStatusId ?? 'Unknown',
          });
        }
        if (prev.totalGross !== order.totalGross) {
          changeSummary.push({
            key: 'total',
            label: 'Total gross changed',
            previous: formatOrderTotal(prev.totalGross, prev.currency),
            current: formatOrderTotal(order.totalGross, order.currency),
          });
        }
        if (prev.orderUpdatedAt !== order.orderUpdatedAt) {
          changeSummary.push({
            key: 'updatedAt',
            label: 'Modified in Base.com',
            previous: prev.orderUpdatedAt ? new Date(prev.orderUpdatedAt).toLocaleString() : '—',
            current: order.orderUpdatedAt ? new Date(order.orderUpdatedAt).toLocaleString() : '—',
          });
        }
        if (prev.fingerprint !== order.fingerprint) {
          changeSummary.push({
            key: 'content',
            label: 'Raw content changed',
            previous: prev.fingerprint.slice(0, 8),
            current: order.fingerprint.slice(0, 8),
          });
        }
      }

      return (
        <OrderDetails
          order={order}
          changeSummary={changeSummary}
          isPreviewStale={isPreviewStale}
          isImportPending={importMutation.isPending}
          isQuickImportPending={quickImportMutation.isPending}
          onImport={handleImport}
        />
      );
    },
    [handleImport, importMutation.isPending, isPreviewStale, quickImportMutation.isPending]
  );

  const panelRowActions = preview ? (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleImportable}
        disabled={importableVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible new + changed ({importableVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleImported}
        disabled={importedVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible imported ({importedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleChanged}
        disabled={changedVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible changed ({changedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='outline'
        onClick={handleSelectVisibleNew}
        disabled={newVisibleOrders.length === 0 || isPreviewStale}
      >
        Select visible new ({newVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleImportableDetails}
        disabled={importableVisibleOrders.length === 0}
      >
        Expand visible import details ({importableVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseVisibleImportableDetails}
        disabled={importableVisibleExpandedCount === 0}
      >
        Collapse visible import details ({importableVisibleExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleNewDetails}
        disabled={newVisibleOrders.length === 0}
      >
        Expand visible new details ({newVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleChangedDetails}
        disabled={changedVisibleOrders.length === 0}
      >
        Expand visible changed details ({changedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleImportedDetails}
        disabled={importedVisibleOrders.length === 0}
      >
        Expand visible reimport details ({importedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandSelectedVisibleDetails}
        disabled={selectedVisibleOrders.length === 0}
      >
        Expand selected visible details ({selectedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseSelectedVisibleDetails}
        disabled={selectedVisibleExpandedCount === 0}
      >
        Collapse selected visible details ({selectedVisibleExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseHiddenDetails}
        disabled={hiddenExpandedCount === 0}
      >
        Collapse hidden details ({hiddenExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseAllDetails}
        disabled={expandedOrderIds.size === 0}
      >
        Collapse all details ({expandedOrderIds.size})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleExpandVisibleDetails}
        disabled={filteredOrders.length === 0}
      >
        Expand visible details ({filteredOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleCollapseVisibleDetails}
        disabled={visibleExpandedCount === 0}
      >
        Collapse visible details ({visibleExpandedCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleClearHiddenSelection}
        disabled={selectedHiddenCount === 0}
      >
        Clear hidden selection ({selectedHiddenCount})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleClearVisibleSelection}
        disabled={selectedVisibleOrders.length === 0}
      >
        Clear visible selection ({selectedVisibleOrders.length})
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleClearSelection}
        disabled={selectedOrders.length === 0}
      >
        Clear selection
      </Button>
      <Button
        type='button'
        size='xs'
        variant='ghost'
        onClick={handleResetViewFilters}
        disabled={!hasActiveViewFilters}
      >
        Reset view filters
      </Button>
    </div>
  ) : null;

  const emptyState = !baseConnections.length ? (
    <EmptyState
      title='No Base.com connection'
      description='Connect Base.com in Integrations before importing orders.'
      action={
        <Button type='button' variant='outline' size='sm' asChild>
          <Link href='/admin/integrations'>Open Integrations</Link>
        </Button>
      }
    />
  ) : preview ? (
    preview.stats.total > 0 ? (
      <EmptyState
        title='No orders in the current view'
        description={`Loaded ${preview.stats.total} orders, but the current search or import-state filters hide them.`}
        action={
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleResetViewFilters}
            disabled={!hasActiveViewFilters}
          >
            Show loaded orders
          </Button>
        }
      />
    ) : (
      <EmptyState
        title='No orders matched'
        description='Try widening the date range, changing the status filter, or increasing the preview limit.'
      />
    )
  ) : (
    <EmptyState
      title='Preview Base.com orders'
      description='Select a connection, adjust filters, and run a preview before importing orders.'
    />
  );

  return (
    <AdminProductsPageLayout
      title='Orders Import'
      current='Orders Import'
      description='Preview and import Base.com orders into local admin storage.'
      icon={<ShoppingBag className='size-4' />}
      headerActions={panelActions}
    >
      <StandardDataTablePanel
        variant='flat'
        alerts={panelAlerts}
        filters={panelFilters}
        actions={panelRowActions}
        footer={panelFooter}
        columns={columns}
        data={filteredOrders}
        isLoading={integrationsQuery.isLoading}
        loadingVariant='table'
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        expanded={expanded}
        renderRowDetails={renderOrderDetails}
        getRowId={(row) => row.baseOrderId}
        emptyState={emptyState}
      />
    </AdminProductsPageLayout>
  );
}
