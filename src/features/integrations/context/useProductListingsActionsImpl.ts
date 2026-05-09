'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { useListingMutations } from '@/features/integrations/hooks/actions/listing-actions';
import { useTraderaActions } from '@/features/integrations/hooks/actions/tradera-actions';
import { useVintedActions } from '@/features/integrations/hooks/actions/vinted-actions';
import {
  useCheckTraderaStatusMutation,
  useDeleteFromBaseMutation,
  useExportToBaseMutation,
  useMoveTraderaListingToUnsoldMutation,
  usePurgeListingMutation,
  useRelistTraderaMutation,
  useSyncTraderaMutation,
  useSyncBaseImagesMutation,
  useUpdateListingInventoryIdMutation,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import {
  preflightTraderaQuickListSession,
  TRADERA_BROWSER_MANUAL_VERIFICATION_MESSAGE,
} from '@/features/integrations/utils/tradera-browser-session';
import type {
  PlaywrightRelistBrowserMode,
  ProductListingWithDetails,
  ProductListingsRecoveryContext,
} from '@/shared/contracts/integrations/listings';

import type { ProductListingsActions } from './ProductListingsContext';

export const useProductListingsActionsImpl = ({
  inventoryOverrides,
  lastExportListingId,
  listings,
  onListingsUpdated,
  productCategoryId,
  productId,
  refetchListingsQuery,
  setDeletingFromBase,
  setError,
  setExportingListing,
  setExportLogs,
  setInventoryOverrides,
  setIsSyncImagesConfirmOpen,
  setLastExportListingId,
  setListingToDelete,
  setListingToMoveToUnsold,
  setListingToPurge,
  setLogsOpen,
  setMovingTraderaListingToUnsold,
  setOpeningTraderaLogin,
  setOpeningVintedLogin,
  setRecoveryContext,
  setRelistingBrowserMode,
  setPurgingListing,
  setRelistingListing,
  setSavingInventoryId,
  setCheckingTraderaStatusListing,
  setSyncingImages,
  setSyncingTraderaListing,
}: {
  inventoryOverrides: Record<string, string>;
  lastExportListingId: string | null;
  listings: ProductListingWithDetails[];
  onListingsUpdated?: (() => void) | undefined;
  productCategoryId: string | null;
  productId: string;
  refetchListingsQuery: () => Promise<unknown>;
  setDeletingFromBase: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setExportingListing: Dispatch<SetStateAction<string | null>>;
  setExportLogs: Dispatch<SetStateAction<CapturedLog[]>>;
  setInventoryOverrides: Dispatch<SetStateAction<Record<string, string>>>;
  setIsSyncImagesConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setLastExportListingId: Dispatch<SetStateAction<string | null>>;
  setListingToDelete: Dispatch<SetStateAction<string | null>>;
  setListingToMoveToUnsold: Dispatch<SetStateAction<string | null>>;
  setListingToPurge: Dispatch<SetStateAction<string | null>>;
  setLogsOpen: Dispatch<SetStateAction<boolean>>;
  setMovingTraderaListingToUnsold: Dispatch<SetStateAction<string | null>>;
  setOpeningTraderaLogin: Dispatch<SetStateAction<string | null>>;
  setOpeningVintedLogin: Dispatch<SetStateAction<string | null>>;
  setRecoveryContext: Dispatch<SetStateAction<ProductListingsRecoveryContext | null>>;
  setRelistingBrowserMode: Dispatch<SetStateAction<PlaywrightRelistBrowserMode | null>>;
  setPurgingListing: Dispatch<SetStateAction<string | null>>;
  setRelistingListing: Dispatch<SetStateAction<string | null>>;
  setSavingInventoryId: Dispatch<SetStateAction<string | null>>;
  setCheckingTraderaStatusListing: Dispatch<SetStateAction<string | null>>;
  setSyncingImages: Dispatch<SetStateAction<string | null>>;
  setSyncingTraderaListing: Dispatch<SetStateAction<string | null>>;
}): ProductListingsActions => {
  const ensureTraderaPreflightSessionReady = useCallback(
    async ({
      integrationId,
      connectionId,
      productId,
    }: {
      integrationId: string;
      connectionId: string;
      productId?: string | undefined;
    }): Promise<void> => {
      const preflightResponse = await preflightTraderaQuickListSession({
        integrationId,
        connectionId,
        ...(productId ? { productId } : {}),
      });
      if (!preflightResponse.ready) {
        throw new Error(TRADERA_BROWSER_MANUAL_VERIFICATION_MESSAGE);
      }
    },
    []
  );

  const deleteFromBaseMutation = useDeleteFromBaseMutation(productId);
  const purgeListingMutation = usePurgeListingMutation(productId);
  const updateInventoryIdMutation = useUpdateListingInventoryIdMutation(productId);
  const exportToBaseMutation = useExportToBaseMutation(productId);
  const relistTraderaMutation = useRelistTraderaMutation(productId);
  const moveTraderaListingToUnsoldMutation = useMoveTraderaListingToUnsoldMutation(productId);
  const syncTraderaMutation = useSyncTraderaMutation(productId);
  const checkTraderaStatusMutation = useCheckTraderaStatusMutation(productId);
  const syncBaseImagesMutation = useSyncBaseImagesMutation(productId);
  const listingMutations = useListingMutations({
    deleteFromBaseMutation,
    exportToBaseMutation,
    inventoryOverrides,
    lastExportListingId,
    listings,
    onListingsUpdated,
    productCategoryId,
    productId,
    purgeListingMutation,
    refetchListingsQuery,
    setDeletingFromBase,
    setError,
    setExportingListing,
    setExportLogs,
    setInventoryOverrides,
    setIsSyncImagesConfirmOpen,
    setLastExportListingId,
    setListingToDelete,
    setListingToPurge,
    setLogsOpen,
    setPurgingListing,
    setSavingInventoryId,
    setSyncingImages,
    syncBaseImagesMutation,
    updateInventoryIdMutation,
  });
  const traderaActions = useTraderaActions({
    checkTraderaStatusMutation,
    ensureTraderaPreflightSessionReady,
    listings,
    moveTraderaListingToUnsoldMutation,
    onListingsUpdated,
    productId,
    refetchListingsQuery,
    relistTraderaMutation,
    setCheckingTraderaStatusListing,
    setError,
    setListingToMoveToUnsold,
    setMovingTraderaListingToUnsold,
    setOpeningTraderaLogin,
    setRecoveryContext,
    setRelistingBrowserMode,
    setRelistingListing,
    setSyncingTraderaListing,
    syncTraderaMutation,
  });
  const vintedActions = useVintedActions({
    onListingsUpdated,
    productId,
    refetchListingsQuery,
    setError,
    setOpeningVintedLogin,
    setRecoveryContext,
  });

  return {
    ...listingMutations,
    ...traderaActions,
    ...vintedActions,
  };
};
