'use client';

import { useCallback } from 'react';

import { useBulkProductBaseSyncMutation } from '@/features/product-sync/hooks/useProductBaseSync';
import {
  useBulkEditProductFields,
  useQueueMarketplaceCopyDebrandBatch,
} from '@/features/products/hooks/useProductsMutations';
import type {
  ProductBatchEditRequest,
  ProductBatchEditResponse,
} from '@/shared/contracts/products/batch-edit';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  getParsedMatchToastMessage,
  getSelectedProductIds,
  getSelectedProductsSnapshot,
} from './ProductSelectionActions.helpers';
import type {
  ProductSelectionBaseController,
  ProductSelectionBulkController,
  ProductSelectionDialogController,
  ProductSelectionToast,
} from './ProductSelectionActions.types';

export type BulkControllerInput = {
  dialogs: ProductSelectionDialogController;
  selection: ProductSelectionBaseController;
  setParsedMatchProductIds: (productIds: string[]) => void;
  clearParsedMatchProductIds: () => void;
  toast: ProductSelectionToast;
};

type DialogActionInput = Pick<BulkControllerInput, 'dialogs' | 'selection' | 'toast'>;

const useListingModalOpenActions = ({
  dialogs,
  selection,
  toast,
}: DialogActionInput): Pick<
  ProductSelectionBulkController,
  'handleCheckTraderaStatus' | 'handleScanAmazonAsin'
> => {
  const handleCheckTraderaStatus = useCallback((): void => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to check.', { variant: 'error' });
      return;
    }
    dialogs.openTraderaStatusCheck(
      selectedProductIds,
      getSelectedProductsSnapshot(selection.data, selectedProductIds)
    );
  }, [dialogs, selection.data, selection.rowSelection, toast]);

  const handleScanAmazonAsin = useCallback((): void => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to scan.', { variant: 'error' });
      return;
    }
    dialogs.openProductScan(
      selectedProductIds,
      getSelectedProductsSnapshot(selection.data, selectedProductIds)
    );
  }, [dialogs, selection.data, selection.rowSelection, toast]);

  return { handleCheckTraderaStatus, handleScanAmazonAsin };
};

const useEditModalOpenActions = ({
  dialogs,
  selection,
  toast,
}: DialogActionInput): Pick<
  ProductSelectionBulkController,
  'handleOpenBatchEdit' | 'handleOpenMarketplaceCopyDebrand'
> => {
  const handleOpenBatchEdit = useCallback((): void => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to edit.', { variant: 'error' });
      return;
    }
    dialogs.openBatchEdit(selectedProductIds);
  }, [dialogs, selection.rowSelection, toast]);

  const handleOpenMarketplaceCopyDebrand = useCallback((): void => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to debrand.', { variant: 'error' });
      return;
    }
    dialogs.openMarketplaceCopyDebrand(selectedProductIds);
  }, [dialogs, selection.rowSelection, toast]);

  return { handleOpenBatchEdit, handleOpenMarketplaceCopyDebrand };
};

const useBulkSyncSetupOpenAction = ({
  dialogs,
  selection,
  toast,
}: DialogActionInput): Pick<ProductSelectionBulkController, 'handleBulkBaseSync'> => {
  const handleBulkBaseSync = useCallback((): void => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to sync.', { variant: 'error' });
      return;
    }
    dialogs.openBulkSyncSetup(
      selectedProductIds,
      getSelectedProductsSnapshot(selection.data, selectedProductIds)
    );
  }, [dialogs, selection.data, selection.rowSelection, toast]);

  return { handleBulkBaseSync };
};

export const useSelectionModalOpenActions = (
  input: DialogActionInput
): Pick<
  ProductSelectionBulkController,
  | 'handleBulkBaseSync'
  | 'handleCheckTraderaStatus'
  | 'handleOpenBatchEdit'
  | 'handleOpenMarketplaceCopyDebrand'
  | 'handleScanAmazonAsin'
> => ({
  ...useBulkSyncSetupOpenAction(input),
  ...useEditModalOpenActions(input),
  ...useListingModalOpenActions(input),
});

export const useBatchEditActions = (
  selection: ProductSelectionBaseController,
  dialogs: ProductSelectionDialogController
): Pick<
  ProductSelectionBulkController,
  'handleBatchEditApplied' | 'handleSubmitBatchEdit' | 'isBatchEditingProductFields'
> => {
  const { mutateAsync: batchEditProductFields, isPending } = useBulkEditProductFields();
  const handleSubmitBatchEdit = useCallback(
    async (request: ProductBatchEditRequest): Promise<ProductBatchEditResponse> =>
      batchEditProductFields(request),
    [batchEditProductFields]
  );
  const handleBatchEditApplied = useCallback(
    (response: ProductBatchEditResponse): void => {
      if (response.failed !== 0) return;
      selection.clearSelection();
      dialogs.closeBatchEdit();
    },
    [dialogs, selection]
  );
  return {
    handleBatchEditApplied,
    handleSubmitBatchEdit,
    isBatchEditingProductFields: isPending,
  };
};

export const useMarketplaceDebrandAction = ({
  dialogs,
  selection,
  toast,
}: DialogActionInput): Pick<
  ProductSelectionBulkController,
  'handleSubmitMarketplaceCopyDebrand' | 'isQueueingMarketplaceCopyDebrandBatch'
> => {
  const { mutateAsync: queueMarketplaceCopyDebrandBatch, isPending } =
    useQueueMarketplaceCopyDebrandBatch();
  const handleSubmitMarketplaceCopyDebrand = useCallback(async (integrationId: string): Promise<void> => {
    const productIds = dialogs.marketplaceCopyDebrandProductIds;
    if (productIds.length === 0) return;
    try {
      const response = await queueMarketplaceCopyDebrandBatch({ productIds, integrationId });
      const suffix = response.requested === 1 ? '' : 's';
      toast(`Queued runtime Debrand for ${response.requested} product${suffix} on ${response.integrationName}.`, {
        variant: 'success',
      });
      selection.clearSelection();
      dialogs.closeMarketplaceCopyDebrand();
    } catch (error) {
      logClientError(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to queue runtime Debrand for selected products.';
      toast(message, { variant: 'error' });
    }
  }, [dialogs, queueMarketplaceCopyDebrandBatch, selection, toast]);

  return {
    handleSubmitMarketplaceCopyDebrand,
    isQueueingMarketplaceCopyDebrandBatch: isPending,
  };
};

export const useBulkBaseSyncAction = ({
  dialogs,
  selection,
  toast,
}: DialogActionInput): Pick<
  ProductSelectionBulkController,
  'handleStartBulkBaseSync' | 'isRunningBulkBaseSync'
> => {
  const { mutateAsync: runBulkBaseSync, isPending } = useBulkProductBaseSyncMutation();
  const handleStartBulkBaseSync = useCallback(async (profileId: string): Promise<void> => {
    if (dialogs.bulkSyncSetupProductIds.length === 0) return;
    try {
      const response = await runBulkBaseSync({
        productIds: dialogs.bulkSyncSetupProductIds,
        profileId,
      });
      dialogs.setBulkSyncResultsView(response, dialogs.bulkSyncSetupProducts);
      selection.clearSelection();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to sync products with Base.com.', {
        variant: 'error',
      });
    }
  }, [dialogs, runBulkBaseSync, selection, toast]);
  return { handleStartBulkBaseSync, isRunningBulkBaseSync: isPending };
};

export const useParsedMatchActions = ({
  clearParsedMatchProductIds,
  dialogs,
  selection,
  setParsedMatchProductIds,
  toast,
}: BulkControllerInput): Pick<
  ProductSelectionBulkController,
  'handleClearParsedMatches' | 'handleFindParsedMatches'
> => {
  const handleFindParsedMatches = useCallback(
    (productIds: string[], meta?: { matchedRowCount?: number }): void => {
      setParsedMatchProductIds(productIds);
      selection.clearSelection();
      dialogs.closeParseActions();
      const matchedRowCount =
        typeof meta?.matchedRowCount === 'number' && Number.isFinite(meta.matchedRowCount)
          ? meta.matchedRowCount
          : productIds.length;
      toast(getParsedMatchToastMessage(productIds.length, matchedRowCount), { variant: 'success' });
    },
    [dialogs, selection, setParsedMatchProductIds, toast]
  );

  const handleClearParsedMatches = useCallback((): void => {
    clearParsedMatchProductIds();
    selection.clearSelection();
  }, [clearParsedMatchProductIds, selection]);

  return { handleClearParsedMatches, handleFindParsedMatches };
};
