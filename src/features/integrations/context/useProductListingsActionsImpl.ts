'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

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
import type {
  ProductListingWithDetails,
  ProductListingExportEvent,
  TestConnectionResponse,
} from '@/shared/contracts/integrations';
import type { ImageRetryPreset, ImageTransformOptions } from '@/shared/contracts/integrations';
import { badRequestError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

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
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'deleteFromBase',
            listingId,
            productId,
          },
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
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'purgeListing',
            listingId,
            productId,
          },
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
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'saveInventoryId',
            listingId,
            productId,
          },
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
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'syncBaseImages',
            productId,
          },
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
    async (listingId: string) => {
      try {
        setRelistingListing(listingId);
        setError(null);
        const response = await relistTraderaMutation.mutateAsync({ listingId });
        const queueJobId = response.queue?.jobId;
        toast(
          queueJobId ? `Tradera relist queued (job ${queueJobId}).` : 'Tradera relist queued.',
          { variant: 'success' }
        );
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'relistTradera',
            listingId,
            productId,
          },
        });
        setError(err instanceof Error ? err.message : 'Failed to queue relist');
      } finally {
        setRelistingListing(null);
      }
    },
    [onListingsUpdated, productId, relistTraderaMutation, setError, setRelistingListing, toast]
  );

  const handleOpenTraderaLogin = useCallback(
    async (listingId: string, integrationId: string, connectionId: string) => {
      try {
        setOpeningTraderaLogin(listingId);
        setError(null);
        const response = await api.post<TestConnectionResponse>(
          `/api/v2/integrations/${integrationId}/connections/${connectionId}/test`,
          {
            mode: 'manual',
            manualTimeoutMs: 240000,
          }
        );
        const hasSessionSaved = Array.isArray(response.steps)
          ? response.steps.some((step) => step.step === 'Saving session' && step.status === 'ok')
          : false;
        toast(
          hasSessionSaved ? 'Tradera login session refreshed.' : 'Tradera manual login completed.',
          { variant: 'success' }
        );
        await refetchListingsQuery();
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'openTraderaLogin',
            listingId,
            productId,
            integrationId,
            connectionId,
          },
        });
        setError(err instanceof Error ? err.message : 'Failed to open Tradera login window');
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
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'exportAgain',
            listingId,
            productId,
          },
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
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'exportImagesOnly',
            listingId,
            productId,
          },
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
        logClientError(err);
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'imageRetry',
            productId,
          },
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
