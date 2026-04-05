'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RowSelectionState } from '@tanstack/react-table';
import {
  useImportBaseOrdersMutation,
  usePreviewBaseOrdersMutation,
  useQuickImportBaseOrdersMutation,
  useBaseOrderImportStatuses,
} from '@/features/products/hooks/useProductOrdersImport';
import {
  useDefaultExportConnection,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import type { BaseOrderImportPreviewResponse } from '@/shared/contracts/products/orders-import';
import {
  BASE_INTEGRATION_SLUGS,
  formatPreviewScopeConnection,
  formatPreviewScopeDateRange,
  formatPreviewScopeStatus,
  getOrderTimestamp,
  normalizeSortText,
  type FeedbackState,
  type ImportStateFilter,
  type PreviewScopeChangeItem,
  type PreviewScopeState,
  type PreviewSortOption,
} from './AdminProductOrdersImportPage.utils';

export function useAdminProductOrdersImportState() {
  const searchParams = useSearchParams();
  const { data: integrationsWithConnections, isLoading: areIntegrationsLoading } =
    useIntegrationsWithConnections();
  const { data: defaultExportConnection } = useDefaultExportConnection();
  const defaultConnectionId = defaultExportConnection?.connectionId ?? '';
  const shouldAutoPreview = searchParams?.get('autoPreview') === '1';
  const hasAutoPreviewedRef = useRef(false);

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
  const statusesQuery = useBaseOrderImportStatuses(selectedConnectionId);
  const availableStatuses = statusesQuery.data ?? [];

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
      const statusOptions = availableStatuses.map((s) => ({
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
  }, [availableStatuses, baseConnections, currentScope, isPreviewStale, lastPreviewScope]);

  const handlePreview = useCallback(async (): Promise<void> => {
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
      setFeedback({ variant: 'info', message: `Loaded ${result.orders.length} orders.` });
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch order preview.',
      });
    }
  }, [currentScope, dateFrom, dateTo, limit, previewMutation, selectedConnectionId, statusId]);

  useEffect(() => {
    if (!shouldAutoPreview || hasAutoPreviewedRef.current || !selectedConnectionId) {
      return;
    }
    hasAutoPreviewedRef.current = true;
    void handlePreview();
  }, [handlePreview, selectedConnectionId, shouldAutoPreview]);

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

    let result = [...preview.orders];

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

  return {
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
    setPreview,
    lastPreviewScope,
    feedback,
    setFeedback,
    importStateFilter,
    setImportStateFilter,
    viewSearchQuery,
    setViewSearchQuery,
    viewSort,
    setViewSort,
    rowSelection,
    setRowSelection,
    expanded,
    setExpanded,
    previewMutation,
    importMutation,
    quickImportMutation,
    statusesQuery,
    availableStatuses,
    currentScope,
    isPreviewStale,
    previewScopeChanges,
    filteredOrders,
    handlePreview,
    handleRestoreLoadedPreviewScope,
    handleResetViewFilters,
    handleToggleExpanded,
  };
}
