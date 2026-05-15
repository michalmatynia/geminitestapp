'use client';

import { useCallback } from 'react';

import { useTraderaMassQuickExport } from '@/features/products/hooks/product-list/useTraderaMassQuickExport';
import { useVintedMassQuickExport } from '@/features/products/hooks/product-list/useVintedMassQuickExport';
import {
  useBulkConvertImagesToBase64,
  useBulkSetProductsArchivedState,
} from '@/features/products/hooks/useProductsMutations';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useBatchEditActions,
  useBulkBaseSyncAction,
  useBulkEcommerceExportAction,
  type BulkControllerInput,
  useMarketplaceDebrandAction,
  useParsedMatchActions,
  useSelectionModalOpenActions,
} from './ProductSelectionActions.bulk-modal-actions';
import {
  getArchiveFailureMessage,
  getArchiveSuccessMessage,
  getSelectedProductIds,
} from './ProductSelectionActions.helpers';
import type {
  ProductSelectionBulkController,
} from './ProductSelectionActions.types';

type SelectionActionInput = Pick<BulkControllerInput, 'selection' | 'toast'>;

const useImageConversionAction = ({
  selection,
  toast,
}: SelectionActionInput): Pick<
  ProductSelectionBulkController,
  'handleConvertSelected' | 'isConvertingSelected'
> => {
  const { mutateAsync: convertSelectedToBase64, isPending: isConvertingSelected } =
    useBulkConvertImagesToBase64();

  const handleConvertSelected = useCallback(async (): Promise<void> => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to convert.', { variant: 'error' });
      return;
    }
    try {
      await convertSelectedToBase64(selectedProductIds);
      toast('Base64 images generated for selected products.', { variant: 'success' });
      selection.clearSelection();
    } catch (error) {
      logClientError(error);
      const message =
        error instanceof Error ? error.message : 'An error occurred during base64 conversion.';
      toast(message, { variant: 'error' });
    }
  }, [convertSelectedToBase64, selection, toast]);

  return { handleConvertSelected, isConvertingSelected };
};

const useQuickExportActions = ({
  selection,
  toast,
}: SelectionActionInput): Pick<
  ProductSelectionBulkController,
  | 'handleQuickExportTradera'
  | 'handleQuickExportVinted'
  | 'isTraderaMassExportRunning'
  | 'isVintedMassExportRunning'
> => {
  const { execute: executeTraderaMassExport, isRunning: isTraderaMassExportRunning } =
    useTraderaMassQuickExport();
  const { execute: executeVintedMassExport, isRunning: isVintedMassExportRunning } =
    useVintedMassQuickExport();

  const handleQuickExportTradera = useCallback(async (): Promise<void> => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to export.', { variant: 'error' });
      return;
    }
    await executeTraderaMassExport(selectedProductIds);
  }, [executeTraderaMassExport, selection.rowSelection, toast]);

  const handleQuickExportVinted = useCallback(async (): Promise<void> => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast('Please select products to export.', { variant: 'error' });
      return;
    }
    await executeVintedMassExport(selectedProductIds);
  }, [executeVintedMassExport, selection.rowSelection, toast]);

  return {
    handleQuickExportTradera,
    handleQuickExportVinted,
    isTraderaMassExportRunning,
    isVintedMassExportRunning,
  };
};

const useArchiveAction = ({
  selection,
  toast,
}: SelectionActionInput): Pick<
  ProductSelectionBulkController,
  'handleSetArchivedSelected' | 'isSettingSelectedArchivedState'
> => {
  const { mutateAsync: setSelectedProductsArchivedState, isPending } =
    useBulkSetProductsArchivedState();

  const handleSetArchivedSelected = useCallback(async (archived: boolean): Promise<void> => {
    const selectedProductIds = getSelectedProductIds(selection.rowSelection);
    if (selectedProductIds.length === 0) {
      toast(`Please select products to ${archived ? 'archive' : 'unarchive'}.`, {
        variant: 'error',
      });
      return;
    }
    try {
      const result = await setSelectedProductsArchivedState({
        productIds: selectedProductIds,
        archived,
      });
      toast(getArchiveSuccessMessage(archived, result.updated), { variant: 'success' });
      selection.clearSelection();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : getArchiveFailureMessage(archived), {
        variant: 'error',
      });
    }
  }, [selection, setSelectedProductsArchivedState, toast]);

  return { handleSetArchivedSelected, isSettingSelectedArchivedState: isPending };
};

export const useProductSelectionBulkController = (
  input: BulkControllerInput
): ProductSelectionBulkController => {
  const { dialogs, selection } = input;
  const archiveAction = useArchiveAction(input);
  const batchEditActions = useBatchEditActions(selection, dialogs);
  const bulkBaseSyncAction = useBulkBaseSyncAction(input);
  const bulkEcommerceExportAction = useBulkEcommerceExportAction(input);
  const imageConversionAction = useImageConversionAction(input);
  const marketplaceDebrandAction = useMarketplaceDebrandAction(input);
  const parsedMatchActions = useParsedMatchActions(input);
  const quickExportActions = useQuickExportActions(input);
  const selectionModalOpenActions = useSelectionModalOpenActions(input);

  return {
    ...archiveAction,
    ...batchEditActions,
    ...bulkBaseSyncAction,
    ...bulkEcommerceExportAction,
    ...imageConversionAction,
    ...marketplaceDebrandAction,
    ...parsedMatchActions,
    ...quickExportActions,
    ...selectionModalOpenActions,
  };
};
