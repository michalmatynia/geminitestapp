'use client';

import { type Dispatch, type SetStateAction, useMemo } from 'react';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { useToast } from '@/shared/ui/toast';

import { useProductEditHydration } from './useProductEditHydration';
import { useProductListHighlights } from './useProductListHighlights';
import { useProductListIntegrations } from './useProductListIntegrations';
import { useProductListModals } from './useProductListModals';
import { useProductListQueueStatus } from './useProductListQueueStatus';
import { useProductListSelection } from './useProductListSelection';
import { useProductListUrlSync } from './useProductListUrlSync';
import { useCreateFromDraft } from '../useCreateFromDraft';
import { useProductOperations } from '../useProductOperations';

type ProductListModalStateInput = {
  queuedProductOperationIds: Set<string>;
  setRefreshTrigger: Dispatch<SetStateAction<number>>;
  visibleData: ProductWithImages[];
  visibleProductIdSet: Set<string>;
};

export const useProductListModalState = ({
  queuedProductOperationIds,
  setRefreshTrigger,
  visibleData,
  visibleProductIdSet,
}: ProductListModalStateInput): {
  createDraftController: ReturnType<typeof useCreateFromDraft>;
  highlights: ReturnType<typeof useProductListHighlights>;
  hydration: ReturnType<typeof useProductEditHydration>;
  integrations: ReturnType<typeof useProductListIntegrations>;
  modals: ReturnType<typeof useProductListModals>;
  operations: ReturnType<typeof useProductOperations>;
  selection: ReturnType<typeof useProductListSelection>;
} => {
  const { toast } = useToast();
  const operations = useProductOperations(setRefreshTrigger);
  const selection = useProductListSelection({
    data: visibleData,
    setRefreshTrigger,
    setActionError: operations.setActionError,
  });
  const integrations = useProductListIntegrations();
  const modals = useProductListModals({
    handleOpenCreateModal: operations.handleOpenCreateModal,
    prefetchIntegrationSelectionData: integrations.prefetchIntegrationSelectionData,
    prefetchProductListingsData: integrations.prefetchProductListingsData,
    refreshProductListingsData: integrations.refreshProductListingsData,
    rowSelection: selection.rowSelection,
    toast,
  });
  const createDraftController = useCreateFromDraft({
    setCreateDraft: modals.setCreateDraft,
    handleOpenCreateFromDraft: operations.handleOpenCreateFromDraft,
  });
  const urlSync = useProductListUrlSync();
  const hydration = useProductEditHydration({
    editingProduct: operations.editingProduct,
    setEditingProduct: operations.setEditingProduct,
    setActionError: operations.setActionError,
    setRefreshTrigger,
    clearProductEditorQueryParams: urlSync.clearProductEditorQueryParams,
  });
  const highlights = useProductListHighlights();
  useProductListQueueStatus({
    queuedProductIds: queuedProductOperationIds,
    visibleProductIdSet,
    triggerJobCompletionHighlight: highlights.triggerJobCompletionHighlight,
  });

  return useMemo(
    () => ({ createDraftController, highlights, hydration, integrations, modals, operations, selection }),
    [createDraftController, highlights, hydration, integrations, modals, operations, selection]
  );
};
