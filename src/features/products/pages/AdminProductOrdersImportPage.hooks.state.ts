'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ExpandedState, OnChangeFn, RowSelectionState } from '@tanstack/react-table';

import type { BaseOrderImportPreviewResponse } from '@/shared/contracts/products/orders-import';

import {
  getInitialSearchParam,
  optionalRequestString,
  useFilteredPreviewOrders,
} from './AdminProductOrdersImportPage.hooks.helpers';
import type {
  FeedbackState,
  ImportStateFilter,
  PreviewScopeState,
  PreviewSortOption,
} from './AdminProductOrdersImportPage.utils';
import type { usePreviewBaseOrdersMutation } from '@/features/products/hooks/useProductOrdersImport';

type SearchParamReader = {
  get(name: string): string | null;
};

export type OrdersImportScopeState = {
  selectedConnectionId: string;
  setSelectedConnectionId: Dispatch<SetStateAction<string>>;
  dateFrom: string;
  setDateFrom: Dispatch<SetStateAction<string>>;
  dateTo: string;
  setDateTo: Dispatch<SetStateAction<string>>;
  statusId: string;
  setStatusId: Dispatch<SetStateAction<string>>;
  limit: string;
  setLimit: Dispatch<SetStateAction<string>>;
  currentScope: PreviewScopeState;
  applyPreviewScope: (scope: PreviewScopeState) => void;
};

export type OrdersImportTableState = {
  rowSelection: RowSelectionState;
  setRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
  expanded: ExpandedState;
  setExpanded: OnChangeFn<ExpandedState>;
  handleToggleExpanded: (orderId: string) => void;
};

export type OrdersImportTableController = OrdersImportTableState & {
  resetPreviewTableState: () => void;
};

export type OrdersImportPreviewState = {
  preview: BaseOrderImportPreviewResponse | null;
  setPreview: Dispatch<SetStateAction<BaseOrderImportPreviewResponse | null>>;
  lastPreviewScope: PreviewScopeState | null;
  feedback: FeedbackState;
  setFeedback: Dispatch<SetStateAction<FeedbackState>>;
  previewMutation: ReturnType<typeof usePreviewBaseOrdersMutation>;
  handlePreview: () => Promise<void>;
};

export type OrdersImportViewState = {
  importStateFilter: ImportStateFilter;
  setImportStateFilter: Dispatch<SetStateAction<ImportStateFilter>>;
  viewSearchQuery: string;
  setViewSearchQuery: Dispatch<SetStateAction<string>>;
  viewSort: PreviewSortOption;
  setViewSort: Dispatch<SetStateAction<PreviewSortOption>>;
  filteredOrders: BaseOrderImportPreviewResponse['orders'];
  handleResetViewFilters: () => void;
};

type PreviewExecutionInput = {
  currentScope: PreviewScopeState;
  dateFrom: string;
  dateTo: string;
  limit: string;
  previewMutation: ReturnType<typeof usePreviewBaseOrdersMutation>;
  resetPreviewTableState: () => void;
  selectedConnectionId: string;
  setFeedback: Dispatch<SetStateAction<FeedbackState>>;
  setLastPreviewScope: Dispatch<SetStateAction<PreviewScopeState | null>>;
  setPreview: Dispatch<SetStateAction<BaseOrderImportPreviewResponse | null>>;
  statusId: string;
};

const executeOrdersImportPreview = async ({
  currentScope,
  dateFrom,
  dateTo,
  limit,
  previewMutation,
  resetPreviewTableState,
  selectedConnectionId,
  setFeedback,
  setLastPreviewScope,
  setPreview,
  statusId,
}: PreviewExecutionInput): Promise<void> => {
  if (selectedConnectionId.trim().length === 0) {
    setFeedback({ variant: 'error', message: 'Please select a Base.com connection first.' });
    return;
  }
  try {
    setFeedback(null);
    const result = await previewMutation.mutateAsync({
      connectionId: selectedConnectionId,
      dateFrom: optionalRequestString(dateFrom),
      dateTo: optionalRequestString(dateTo),
      statusId: optionalRequestString(statusId),
      limit: Number.parseInt(limit, 10),
    });
    setPreview(result);
    setLastPreviewScope({ ...currentScope });
    resetPreviewTableState();
    setFeedback({ variant: 'info', message: `Loaded ${result.orders.length} orders.` });
  } catch (error) {
    setFeedback({
      variant: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch order preview.',
    });
  }
};

export const useOrdersImportScopeState = (
  searchParams: SearchParamReader,
  defaultConnectionId: string
): OrdersImportScopeState => {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    getInitialSearchParam(searchParams, 'connectionId', defaultConnectionId)
  );
  const [dateFrom, setDateFrom] = useState<string>(getInitialSearchParam(searchParams, 'dateFrom'));
  const [dateTo, setDateTo] = useState<string>(getInitialSearchParam(searchParams, 'dateTo'));
  const [statusId, setStatusId] = useState<string>(getInitialSearchParam(searchParams, 'statusId'));
  const [limit, setLimit] = useState<string>(getInitialSearchParam(searchParams, 'limit', '50'));
  const currentScope: PreviewScopeState = useMemo(
    () => ({ connectionId: selectedConnectionId, dateFrom, dateTo, statusId, limit }),
    [dateFrom, dateTo, limit, selectedConnectionId, statusId]
  );
  const applyPreviewScope = useCallback((scope: PreviewScopeState): void => {
    setSelectedConnectionId(scope.connectionId);
    setDateFrom(scope.dateFrom);
    setDateTo(scope.dateTo);
    setStatusId(scope.statusId);
    setLimit(scope.limit);
  }, []);

  return {
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
    currentScope,
    applyPreviewScope,
  };
};

export const useOrdersImportTableState = (): OrdersImportTableController => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const resetPreviewTableState = useCallback((): void => {
    setRowSelection({});
    setExpanded({});
  }, []);
  const handleToggleExpanded = useCallback((orderId: string): void => {
    setExpanded((prev) => {
      const current = prev === true ? {} : prev;
      return {
        ...current,
        [orderId]: current[orderId] !== true,
      };
    });
  }, []);

  return {
    rowSelection,
    setRowSelection,
    expanded,
    setExpanded,
    handleToggleExpanded,
    resetPreviewTableState,
  };
};

export const useOrdersImportPreviewState = ({
  currentScope,
  dateFrom,
  dateTo,
  limit,
  previewMutation,
  resetPreviewTableState,
  selectedConnectionId,
  shouldAutoPreview,
  statusId,
}: {
  currentScope: PreviewScopeState;
  dateFrom: string;
  dateTo: string;
  limit: string;
  previewMutation: ReturnType<typeof usePreviewBaseOrdersMutation>;
  resetPreviewTableState: () => void;
  selectedConnectionId: string;
  shouldAutoPreview: boolean;
  statusId: string;
}): OrdersImportPreviewState => {
  const [preview, setPreview] = useState<BaseOrderImportPreviewResponse | null>(null);
  const [lastPreviewScope, setLastPreviewScope] = useState<PreviewScopeState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const hasAutoPreviewedRef = useRef(false);

  const handlePreview = useCallback((): Promise<void> => executeOrdersImportPreview({
    currentScope,
    dateFrom,
    dateTo,
    limit,
    previewMutation,
    resetPreviewTableState,
    selectedConnectionId,
    setFeedback,
    setLastPreviewScope,
    setPreview,
    statusId,
  }), [
    currentScope,
    dateFrom,
    dateTo,
    limit,
    previewMutation,
    resetPreviewTableState,
    selectedConnectionId,
    statusId,
  ]);

  useEffect(() => {
    if (
      !shouldAutoPreview ||
      hasAutoPreviewedRef.current === true ||
      selectedConnectionId.trim().length === 0
    ) {
      return;
    }
    hasAutoPreviewedRef.current = true;
    handlePreview().catch((): undefined => undefined);
  }, [handlePreview, selectedConnectionId, shouldAutoPreview]);

  return { preview, setPreview, lastPreviewScope, feedback, setFeedback, previewMutation, handlePreview };
};

export const useOrdersImportViewState = (
  preview: BaseOrderImportPreviewResponse | null
): OrdersImportViewState => {
  const [importStateFilter, setImportStateFilter] = useState<ImportStateFilter>('all');
  const [viewSearchQuery, setViewSearchQuery] = useState('');
  const [viewSort, setViewSort] = useState<PreviewSortOption>('created-desc');
  const deferredSearchQuery = useDeferredValue(viewSearchQuery);
  const filteredOrders = useFilteredPreviewOrders({
    deferredSearchQuery,
    importStateFilter,
    orders: preview?.orders ?? [],
    viewSort,
  });
  const handleResetViewFilters = useCallback((): void => {
    setImportStateFilter('all');
    setViewSearchQuery('');
    setViewSort('created-desc');
  }, []);

  return {
    importStateFilter,
    setImportStateFilter,
    viewSearchQuery,
    setViewSearchQuery,
    viewSort,
    setViewSort,
    filteredOrders,
    handleResetViewFilters,
  };
};
