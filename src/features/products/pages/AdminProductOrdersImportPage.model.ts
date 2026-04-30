'use client';

import { useMemo } from 'react';

import { buildBaseOrderQuickImportFeedback } from '@/features/products/utils/base-order-quick-import-feedback';
import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products/orders-import';

import { buildColumns } from './AdminProductOrdersImportPage.columns';
import type { useAdminProductOrdersImportState } from './AdminProductOrdersImportPage.hooks';
import { summarizeOrderAggregate } from './AdminProductOrdersImportPage.utils';

type OrdersImportState = ReturnType<typeof useAdminProductOrdersImportState>;

export type AdminProductOrdersImportPageModel = {
  selectedOrders: BaseOrderImportPreviewItem[];
  aggregate: ReturnType<typeof summarizeOrderAggregate>;
  columns: ReturnType<typeof buildColumns>;
  handleImport: (ordersToImport?: BaseOrderImportPreviewItem[]) => Promise<void>;
  handleQuickImport: () => Promise<void>;
  handlePreviewClick: () => void;
  handleQuickImportClick: () => void;
};

const optionalRequestString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const refreshPreview = (handlePreview: () => Promise<void>): void => {
  handlePreview().catch((): undefined => undefined);
};

const useSelectedOrders = (state: OrdersImportState): BaseOrderImportPreviewItem[] => {
  const { preview, rowSelection } = state;
  return useMemo(() => {
    if (preview === null) return [];
    return preview.orders.filter((order) => rowSelection[order.baseOrderId] === true);
  }, [preview, rowSelection]);
};

const useOrderImportColumns = (state: OrdersImportState): ReturnType<typeof buildColumns> => {
  const { expanded, handleToggleExpanded, isPreviewStale } = state;
  return useMemo(
    () => buildColumns({ expanded, handleToggleExpanded, isPreviewStale }),
    [expanded, handleToggleExpanded, isPreviewStale]
  );
};

const buildImportHandler = (
  state: OrdersImportState,
  selectedOrders: BaseOrderImportPreviewItem[]
): ((ordersToImport?: BaseOrderImportPreviewItem[]) => Promise<void>) => {
  const {
    preview,
    selectedConnectionId,
    importMutation,
    setFeedback,
    setRowSelection,
    handlePreview,
  } = state;

  return async (
    ordersToImport: BaseOrderImportPreviewItem[] = selectedOrders
  ): Promise<void> => {
    if (
      preview === null ||
      selectedConnectionId.trim().length === 0 ||
      ordersToImport.length === 0
    ) {
      return;
    }

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
      refreshPreview(handlePreview);
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Import failed.',
      });
    }
  };
};

const buildQuickImportHandler = (state: OrdersImportState): (() => Promise<void>) => {
  const {
    preview,
    selectedConnectionId,
    dateFrom,
    dateTo,
    statusId,
    limit,
    quickImportMutation,
    setFeedback,
    handlePreview,
  } = state;

  return async (): Promise<void> => {
    if (selectedConnectionId.trim().length === 0) return;
    try {
      setFeedback(null);
      const result = await quickImportMutation.mutateAsync({
        connectionId: selectedConnectionId,
        dateFrom: optionalRequestString(dateFrom),
        dateTo: optionalRequestString(dateTo),
        statusId: optionalRequestString(statusId),
        limit: Number.parseInt(limit, 10),
      });
      setFeedback(buildBaseOrderQuickImportFeedback(result));
      if (preview !== null) refreshPreview(handlePreview);
    } catch (error) {
      setFeedback({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Quick import failed.',
      });
    }
  };
};

export const useAdminProductOrdersImportPageModel = (
  state: OrdersImportState
): AdminProductOrdersImportPageModel => {
  const selectedOrders = useSelectedOrders(state);
  const aggregate = useMemo(
    () => summarizeOrderAggregate(state.filteredOrders),
    [state.filteredOrders]
  );
  const columns = useOrderImportColumns(state);
  const handleImport = buildImportHandler(state, selectedOrders);
  const handleQuickImport = buildQuickImportHandler(state);

  return {
    selectedOrders,
    aggregate,
    columns,
    handleImport,
    handleQuickImport,
    handlePreviewClick: () => refreshPreview(state.handlePreview),
    handleQuickImportClick: () => {
      handleQuickImport().catch((): undefined => undefined);
    },
  };
};
