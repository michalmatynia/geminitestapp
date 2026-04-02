'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  isPlaywrightProgrammableSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useDeleteFromBaseMutation,
  useExportToBaseMutation,
  usePurgeListingMutation,
  useRelistTraderaMutation,
  useSyncBaseImagesMutation,
  useUpdateListingInventoryIdMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import {
  ensureTraderaBrowserSession,
  isTraderaBrowserAuthRequiredMessage,
} from '@/features/integrations/utils/tradera-browser-session';
import type {
  PlaywrightRelistBrowserMode,
  ProductListingWithDetails,
  ProductListingExportEvent,
} from '@/shared/contracts/integrations';
import type { ImageRetryPreset, ImageTransformOptions } from '@/shared/contracts/integrations';
import { badRequestError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ProductListingsActions } from './ProductListingsContext';

const getLatestTemplateId = (listing: ProductListingWithDetails): string | null => {
  const history = listing.exportHistory ?? [];
  if (history.length === 0) return null;
  const sorted = [...history].sort((a: ProductListingExportEvent, b: ProductListingExportEvent) => {
    const aTime = a.exportedAt ? new Date(a.exportedAt).getTime() : 0;
    const bTime = b.exportedAt ? new Date(b.exportedAt).getTime() : 0;
    return bTime - aTime;
  });
  return sorted[0]?.templateId ?? null;
};

export const useProductListingsActionsImpl = ({
  inventoryOverrides,
  lastExportListingId,
  listings,
  onListingsUpdated,
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
  setListingToPurge,
  setLogsOpen,
  setOpeningTraderaLogin,
  setRelistingBrowserMode,
  setPurgingListing,
  setRelistingListing,
  setSavingInventoryId,
  setSyncingImages,
}: {
  inventoryOverrides: Record<string, string>;
  lastExportListingId: string | null;
  listings: ProductListingWithDetails[];
  onListingsUpdated?: (() => void) | undefined;
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
  setListingToPurge: Dispatch<SetStateAction<string | null>>;
  setLogsOpen: Dispatch<SetStateAction<boolean>>;
  setOpeningTraderaLogin: Dispatch<SetStateAction<string | null>>;
  setRelistingBrowserMode: Dispatch<SetStateAction<PlaywrightRelistBrowserMode | null>>;
  setPurgingListing: Dispatch<SetStateAction<string | null>>;
  setRelistingListing: Dispatch<SetStateAction<string | null>>;
  setSavingInventoryId: Dispatch<SetStateAction<string | null>>;
  setSyncingImages: Dispatch<SetStateAction<string | null>>;
}): ProductListingsActions => {
  const { toast } = useToast();

  const deleteFromBaseMutation = useDeleteFromBaseMutation(productId);
  const purgeListingMutation = usePurgeListingMutation(productId);
  const updateInventoryIdMutation = useUpdateListingInventoryIdMutation(productId);
  const exportToBaseMutation = useExportToBaseMutation(productId);
  const relistTraderaMutation = useRelistTraderaMutation(productId);
  const syncBaseImagesMutation = useSyncBaseImagesMutation(productId);

  const handleDeleteFromBase = useCallback(
    async (listingId: string) => {
      try {
        setDeletingFromBase(listingId);
        const inventoryId = (
          inventoryOverrides[listingId] ||
          listings.find((listing) => listing.id === listingId)?.inventoryId ||
          ''
        ).trim();
        const result = await deleteFromBaseMutation.mutateAsync({ listingId, inventoryId });
        setError(null);
        toast(
          result?.runId
            ? `Delete job started. Track it in Job Queue (run: ${result.runId}).`
            : 'Delete from Base.com completed.',
          { variant: 'success' }
        );
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'deleteFromBase',
          listingId,
          productId,
        });
        setError(err instanceof Error ? err.message : 'Failed to delete from Base.com');
      } finally {
        setDeletingFromBase(null);
        setListingToDelete(null);
      }
    },
    [deleteFromBaseMutation, inventoryOverrides, listings, onListingsUpdated, productId, setError, setDeletingFromBase, setListingToDelete, toast]
  );

  const handlePurgeListing = useCallback(
    async (listingId: string) => {
      try {
        setPurgingListing(listingId);
        await purgeListingMutation.mutateAsync(listingId);
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'purgeListing',
          listingId,
          productId,
        });
        setError(err instanceof Error ? err.message : 'Failed to remove listing history');
      } finally {
        setPurgingListing(null);
        setListingToPurge(null);
      }
    },
    [onListingsUpdated, productId, purgeListingMutation, setError, setListingToPurge, setPurgingListing]
  );

  const handleSaveInventoryId = useCallback(
    async (listingId: string) => {
      const value = (inventoryOverrides[listingId] ?? '').trim();
      if (!value) {
        setError('Inventory ID is required.');
        return;
      }
      try {
        setSavingInventoryId(listingId);
        await updateInventoryIdMutation.mutateAsync({ listingId, inventoryId: value });
        setInventoryOverrides((previous) => {
          const next = { ...previous };
          delete next[listingId];
          return next;
        });
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'saveInventoryId',
          listingId,
          productId,
        });
        setError(err instanceof Error ? err.message : 'Failed to save inventory ID');
      } finally {
        setSavingInventoryId(null);
      }
    },
    [inventoryOverrides, onListingsUpdated, productId, setError, setInventoryOverrides, setSavingInventoryId, updateInventoryIdMutation]
  );

  const handleSyncBaseImages = useCallback(
    async (baseListing: ProductListingWithDetails | null) => {
      if (!baseListing) {
        setError('Base.com listing not found for this product.');
        return;
      }
      try {
        setSyncingImages(baseListing.id);
        setError(null);
        const inventoryId = (inventoryOverrides[baseListing.id] || baseListing.inventoryId || '').trim();
        const response = await syncBaseImagesMutation.mutateAsync({
          listingId: baseListing.id,
          ...(inventoryId ? { inventoryId } : {}),
        });
        toast(`Synced ${response.count} image link(s) from Base.com`, { variant: 'success' });
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'syncBaseImages',
          productId,
        });
        setError(err instanceof Error ? err.message : 'Failed to sync image URLs');
      } finally {
        setSyncingImages(null);
        setIsSyncImagesConfirmOpen(false);
      }
    },
    [inventoryOverrides, productId, setError, setIsSyncImagesConfirmOpen, setSyncingImages, syncBaseImagesMutation, toast]
  );

  const handleRelistTradera = useCallback(
    async (
      listingId: string,
      options?: {
        skipSessionPreflight?: boolean;
        browserMode?: PlaywrightRelistBrowserMode;
      }
    ) => {
      try {
        setRelistingListing(listingId);
        setRelistingBrowserMode(options?.browserMode ?? null);
        setError(null);
        const listing = listings.find((item) => item.id === listingId);
        const isPlaywrightRelist = Boolean(
          listing && isPlaywrightProgrammableSlug(listing.integration.slug)
        );
        if (
          !options?.skipSessionPreflight &&
          listing &&
          isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
          listing.integrationId &&
          listing.connectionId
        ) {
          const sessionResult = await ensureTraderaBrowserSession({
            integrationId: listing.integrationId,
            connectionId: listing.connectionId,
          });
          if (sessionResult.savedSession) {
            toast('Tradera login session refreshed.', { variant: 'success' });
          }
        }
        const response = await relistTraderaMutation.mutateAsync({
          listingId,
          ...(options?.browserMode ? { browserMode: options.browserMode } : {}),
        });
        const queueJobId = response.queue?.jobId;
        const browserModeLabel =
          options?.browserMode === 'headed'
            ? 'headed'
            : options?.browserMode === 'headless'
              ? 'headless'
              : null;
        const relistLabel = isPlaywrightRelist ? 'Playwright relist' : 'Tradera relist';
        toast(
          queueJobId
            ? `${relistLabel} queued${browserModeLabel ? ` (${browserModeLabel}, job ${queueJobId}).` : ` (job ${queueJobId}).`}`
            : `${relistLabel} queued${browserModeLabel ? ` (${browserModeLabel}).` : '.'}`,
          { variant: 'success' }
        );
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'relistTradera',
          listingId,
          productId,
        });
        const errorMessage = err instanceof Error ? err.message : 'Failed to queue relist';
        if (isTraderaBrowserAuthRequiredMessage(errorMessage)) {
          toast(errorMessage, { variant: 'error' });
        }
        setError(errorMessage);
      } finally {
        setRelistingListing(null);
        setRelistingBrowserMode(null);
      }
    },
    [
      listings,
      onListingsUpdated,
      productId,
      relistTraderaMutation,
      setError,
      setRelistingBrowserMode,
      setRelistingListing,
      toast,
    ]
  );

  const handleOpenTraderaLogin = useCallback(
    async (listingId: string, integrationId: string, connectionId: string): Promise<boolean> => {
      try {
        setOpeningTraderaLogin(listingId);
        setError(null);
        const response = await ensureTraderaBrowserSession({
          integrationId,
          connectionId,
        });
        toast(
          response.savedSession
            ? 'Tradera login session refreshed.'
            : 'Tradera manual login completed.',
          { variant: 'success' }
        );
        await refetchListingsQuery();
        onListingsUpdated?.();
        return true;
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'openTraderaLogin',
          listingId,
          productId,
          integrationId,
          connectionId,
        });
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to open Tradera login window';
        if (isTraderaBrowserAuthRequiredMessage(errorMessage)) {
          toast(errorMessage, { variant: 'error' });
        }
        setError(errorMessage);
        return false;
      } finally {
        setOpeningTraderaLogin(null);
      }
    },
    [onListingsUpdated, productId, refetchListingsQuery, setError, setOpeningTraderaLogin, toast]
  );

  const exportListingToBase = useCallback(
    async (
      listingId: string,
      options?: {
        imageBase64Mode?: 'base-only' | 'full-data-uri';
        imageTransform?: ImageTransformOptions | null;
      }
    ) => {
      const listing = listings.find((item) => item.id === listingId);
      if (!listing) return;
      const inventoryId = (inventoryOverrides[listingId] || listing.inventoryId || '').trim();
      if (!inventoryId) throw badRequestError('Inventory ID is required.');

      const templateId = getLatestTemplateId(listing) ?? undefined;
      const exportData: ExportToBaseVariables = {
        connectionId: listing.connectionId,
        inventoryId,
        exportImagesAsBase64: Boolean(options?.imageBase64Mode || options?.imageTransform),
      };
      if (templateId) exportData.templateId = templateId;
      if (options?.imageBase64Mode) exportData.imageBase64Mode = options.imageBase64Mode;
      if (options?.imageTransform) exportData.imageTransform = options.imageTransform;

      const payloadRes = await exportToBaseMutation.mutateAsync(exportData);
      if (payloadRes.logs) setExportLogs(payloadRes.logs);
    },
    [exportToBaseMutation, inventoryOverrides, listings, setExportLogs]
  );

  const handleExportAgain = useCallback(
    async (listingId: string) => {
      const listing = listings.find((item) => item.id === listingId);
      if (!listing) return;
      const inventoryId = (inventoryOverrides[listingId] || listing.inventoryId || '').trim();
      if (!inventoryId) {
        setError('Inventory ID is required.');
        return;
      }
      try {
        setExportingListing(listingId);
        setLastExportListingId(listingId);
        setExportLogs([]);
        setLogsOpen(true);
        await exportListingToBase(listingId);
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'exportAgain',
          listingId,
          productId,
        });
        setError(err instanceof Error ? err.message : 'Failed to export product');
      } finally {
        setExportingListing(null);
      }
    },
    [exportListingToBase, inventoryOverrides, listings, onListingsUpdated, productId, setError, setExportLogs, setExportingListing, setLastExportListingId, setLogsOpen]
  );

  const handleExportImagesOnly = useCallback(
    async (listingId: string, preset?: ImageRetryPreset) => {
      const listing = listings.find((item) => item.id === listingId);
      if (!listing) return;
      const inventoryId = (inventoryOverrides[listingId] || listing.inventoryId || '').trim();
      if (!inventoryId) {
        setError('Inventory ID is required.');
        return;
      }
      if (!listing.externalListingId) {
        setError('External Base.com product ID is missing.');
        return;
      }

      try {
        setExportingListing(listingId);
        setLastExportListingId(listingId);
        setError(null);
        setExportLogs([]);
        setLogsOpen(true);

        const exportData: ExportToBaseVariables = {
          connectionId: listing.connectionId,
          inventoryId,
          imagesOnly: true,
          listingId: listing.id,
          externalListingId: listing.externalListingId,
          exportImagesAsBase64: true,
        };
        if (preset?.imageBase64Mode) exportData.imageBase64Mode = preset.imageBase64Mode;
        if (preset?.transform) exportData.imageTransform = preset.transform;

        const payloadRes = await exportToBaseMutation.mutateAsync(exportData);
        if (payloadRes.logs) setExportLogs(payloadRes.logs);

        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'exportImagesOnly',
          listingId,
          productId,
        });
        setError(err instanceof Error ? err.message : 'Failed to export product images');
      } finally {
        setExportingListing(null);
      }
    },
    [exportToBaseMutation, inventoryOverrides, listings, onListingsUpdated, productId, setError, setExportLogs, setExportingListing, setLastExportListingId, setLogsOpen]
  );

  const handleImageRetry = useCallback(
    async (preset: ImageRetryPreset) => {
      if (!lastExportListingId) return;
      try {
        setExportingListing(lastExportListingId);
        setError(null);
        setExportLogs([]);
        setLogsOpen(true);

        const exportOptions: {
          imageBase64Mode?: 'base-only' | 'full-data-uri';
          imageTransform?: ImageTransformOptions | null;
        } = {};
        if (preset.imageBase64Mode) exportOptions.imageBase64Mode = preset.imageBase64Mode;
        if (preset.transform) exportOptions.imageTransform = preset.transform;

        await exportListingToBase(lastExportListingId, exportOptions);
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'imageRetry',
          productId,
        });
        setError(err instanceof Error ? err.message : 'Failed to export product');
      } finally {
        setExportingListing(null);
      }
    },
    [exportListingToBase, lastExportListingId, onListingsUpdated, productId, setError, setExportLogs, setExportingListing, setLogsOpen]
  );

  const refetchListings = useCallback(async () => {
    await refetchListingsQuery();
  }, [refetchListingsQuery]);

  return {
    handleDeleteFromBase,
    handlePurgeListing,
    handleSaveInventoryId,
    handleSyncBaseImages,
    handleRelistTradera,
    handleOpenTraderaLogin,
    handleExportAgain,
    handleExportImagesOnly,
    handleImageRetry,
    refetchListings,
  };
};
