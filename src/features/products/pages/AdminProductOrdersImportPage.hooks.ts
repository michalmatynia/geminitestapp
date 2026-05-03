'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  useBaseOrderImportStatuses,
  useImportBaseOrdersMutation,
  usePreviewBaseOrdersMutation,
  useQuickImportBaseOrdersMutation,
} from '@/features/products/hooks/useProductOrdersImport';
import {
  useDefaultExportConnection,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import type { BaseOrderImportStatusOption } from '@/shared/contracts/products/orders-import';

import {
  useBaseConnectionOptions,
  usePreviewScopeChanges,
  usePreviewStaleState,
  type BaseConnectionOption,
} from './AdminProductOrdersImportPage.hooks.helpers';
import {
  useOrdersImportPreviewState,
  useOrdersImportScopeState,
  useOrdersImportTableState,
  useOrdersImportViewState,
  type OrdersImportPreviewState,
  type OrdersImportScopeState,
  type OrdersImportTableState,
  type OrdersImportViewState,
} from './AdminProductOrdersImportPage.hooks.state';
import type { PreviewScopeChangeItem } from './AdminProductOrdersImportPage.utils';

export type AdminProductOrdersImportState = OrdersImportPreviewState &
  Omit<OrdersImportScopeState, 'applyPreviewScope'> &
  OrdersImportTableState &
  OrdersImportViewState & {
    areIntegrationsLoading: boolean;
    baseConnections: BaseConnectionOption[];
    importMutation: ReturnType<typeof useImportBaseOrdersMutation>;
    quickImportMutation: ReturnType<typeof useQuickImportBaseOrdersMutation>;
    statusesQuery: ReturnType<typeof useBaseOrderImportStatuses>;
    availableStatuses: BaseOrderImportStatusOption[];
    isPreviewStale: boolean;
    previewScopeChanges: PreviewScopeChangeItem[];
    handleRestoreLoadedPreviewScope: () => void;
  };

export function useAdminProductOrdersImportState(): AdminProductOrdersImportState {
  const searchParams = useSearchParams();
  const { data: integrationsWithConnections, isLoading: areIntegrationsLoading } =
    useIntegrationsWithConnections();
  const { data: defaultExportConnection } = useDefaultExportConnection();
  const defaultConnectionId = defaultExportConnection?.connectionId ?? '';
  const shouldAutoPreview = searchParams.get('autoPreview') === '1';
  const baseConnections = useBaseConnectionOptions(integrationsWithConnections);
  const scopeController = useOrdersImportScopeState(searchParams, defaultConnectionId);
  const { applyPreviewScope, ...scopeState } = scopeController;
  const tableController = useOrdersImportTableState();
  const { resetPreviewTableState, ...tableState } = tableController;
  const previewMutation = usePreviewBaseOrdersMutation();
  const previewState = useOrdersImportPreviewState({
    ...scopeState,
    previewMutation,
    resetPreviewTableState,
    shouldAutoPreview,
  });
  const importMutation = useImportBaseOrdersMutation();
  const quickImportMutation = useQuickImportBaseOrdersMutation();
  const statusesQuery = useBaseOrderImportStatuses(scopeState.selectedConnectionId);
  const availableStatuses = statusesQuery.data ?? [];
  const isPreviewStale = usePreviewStaleState(
    scopeState.currentScope,
    previewState.lastPreviewScope,
    previewState.preview !== null
  );
  const previewScopeChanges = usePreviewScopeChanges({
    availableStatuses,
    baseConnections,
    currentScope: scopeState.currentScope,
    isPreviewStale,
    lastPreviewScope: previewState.lastPreviewScope,
  });
  const viewState = useOrdersImportViewState(previewState.preview);
  const handleRestoreLoadedPreviewScope = useCallback((): void => {
    if (previewState.lastPreviewScope === null) return;
    applyPreviewScope(previewState.lastPreviewScope);
  }, [applyPreviewScope, previewState.lastPreviewScope]);

  return {
    areIntegrationsLoading,
    baseConnections,
    ...scopeState,
    ...previewState,
    ...viewState,
    ...tableState,
    importMutation,
    quickImportMutation,
    statusesQuery,
    availableStatuses,
    isPreviewStale,
    previewScopeChanges,
    handleRestoreLoadedPreviewScope,
  };
}
