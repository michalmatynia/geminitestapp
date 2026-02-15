'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

import type { ImageRetryPreset, ImageTransformOptions } from '@/features/data-import-export';
import { useProductListings } from '@/features/integrations/hooks/useListingQueries';
import {
  useDeleteFromBaseMutation,
  usePurgeListingMutation,
  useUpdateListingInventoryIdMutation,
  useExportToBaseMutation,
  useRelistTraderaMutation,
  useSyncBaseImagesMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type { ProductListingWithDetails } from '@/features/integrations/types/listings';
import { logClientError } from '@/features/observability';
import type { ProductWithImages } from '@/features/products/types';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

interface ProductListingsContextType {
  product: ProductWithImages;
  listings: ProductListingWithDetails[];
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  
  // UI States
  deletingFromBase: string | null;
  purgingListing: string | null;
  exportingListing: string | null;
  savingInventoryId: string | null;
  syncingImages: string | null;
  relistingListing: string | null;
  openingTraderaLogin: string | null;
  inventoryOverrides: Record<string, string>;
  setInventoryOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  historyOpenByListing: Record<string, boolean>;
  setHistoryOpenByListing: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  
  // Modals/Dialogs
  listingToDelete: string | null;
  setListingToDelete: (id: string | null) => void;
  listingToPurge: string | null;
  setListingToPurge: (id: string | null) => void;
  isSyncImagesConfirmOpen: boolean;
  setIsSyncImagesConfirmOpen: (open: boolean) => void;
  
  // Export Logs
  exportLogs: CapturedLog[];
  logsOpen: boolean;
  setLogsOpen: (open: boolean) => void;
  lastExportListingId: string | null;
  
  // Actions
  handleDeleteFromBase: (listingId: string) => Promise<void>;
  handlePurgeListing: (listingId: string) => Promise<void>;
  handleSaveInventoryId: (listingId: string) => Promise<void>;
  handleSyncBaseImages: (baseListing: ProductListingWithDetails | null) => Promise<void>;
  handleRelistTradera: (listingId: string) => Promise<void>;
  handleOpenTraderaLogin: (
    listingId: string,
    integrationId: string,
    connectionId: string
  ) => Promise<void>;
  handleExportAgain: (listingId: string) => Promise<void>;
  handleExportImagesOnly: (listingId: string, preset?: ImageRetryPreset) => Promise<void>;
  handleImageRetry: (preset: ImageRetryPreset) => Promise<void>;
  refetchListings: () => Promise<void>;
  
  // Modal Props
  onClose: () => void;
  onStartListing?: ((integrationId: string, connectionId: string) => void) | undefined;
  filterIntegrationSlug?: string | null | undefined;
}

const ProductListingsContext = createContext<ProductListingsContextType | undefined>(undefined);

export function ProductListingsProvider({
  product,
  children,
  onListingsUpdated,
  onClose,
  onStartListing,
  filterIntegrationSlug,
}: {
  product: ProductWithImages;
  children: React.ReactNode;
  onListingsUpdated?: (() => void) | undefined;
  onClose: () => void;
  onStartListing?: ((integrationId: string, connectionId: string) => void) | undefined;
  filterIntegrationSlug?: string | null | undefined;
}): React.JSX.Element {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [deletingFromBase, setDeletingFromBase] = useState<string | null>(null);
  const [purgingListing, setPurgingListing] = useState<string | null>(null);
  const [exportingListing, setExportingListing] = useState<string | null>(null);
  const [inventoryOverrides, setInventoryOverrides] = useState<Record<string, string>>({});
  const [savingInventoryId, setSavingInventoryId] = useState<string | null>(null);
  const [historyOpenByListing, setHistoryOpenByListing] = useState<Record<string, boolean>>({});
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const [lastExportListingId, setLastExportListingId] = useState<string | null>(null);
  const [syncingImages, setSyncingImages] = useState<string | null>(null);
  const [relistingListing, setRelistingListing] = useState<string | null>(null);
  const [openingTraderaLogin, setOpeningTraderaLogin] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [listingToPurge, setListingToPurge] = useState<string | null>(null);
  const [isSyncImagesConfirmOpen, setIsSyncImagesConfirmOpen] = useState(false);

  const listingsQuery = useProductListings(product.id);
  const listings = listingsQuery.data ?? [];
  const isListingsLoading =
    listingsQuery.isLoading ||
    (listingsQuery.isFetching && listings.length === 0);

  // Mutations
  const deleteFromBaseMutation = useDeleteFromBaseMutation(product.id);
  const purgeListingMutation = usePurgeListingMutation(product.id);
  const updateInventoryIdMutation = useUpdateListingInventoryIdMutation(product.id);
  const exportToBaseMutation = useExportToBaseMutation(product.id);
  const relistTraderaMutation = useRelistTraderaMutation(product.id);
  const syncBaseImagesMutation = useSyncBaseImagesMutation(product.id);

  const handleDeleteFromBase = useCallback(async (listingId: string) => {
    try {
      setDeletingFromBase(listingId);
      const inventoryId = (inventoryOverrides[listingId] || listings.find(l => l.id === listingId)?.inventoryId || '').trim();
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
      logClientError(err, { context: { source: 'ProductListingsContext', action: 'deleteFromBase', listingId, productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to delete from Base.com');
    } finally {
      setDeletingFromBase(null);
      setListingToDelete(null);
    }
  }, [deleteFromBaseMutation, inventoryOverrides, listings, onListingsUpdated, product.id, toast]);

  const handlePurgeListing = useCallback(async (listingId: string) => {
    try {
      setPurgingListing(listingId);
      await purgeListingMutation.mutateAsync(listingId);
      onListingsUpdated?.();
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'ProductListingsContext', action: 'purgeListing', listingId, productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to remove listing history');
    } finally {
      setPurgingListing(null);
      setListingToPurge(null);
    }
  }, [onListingsUpdated, product.id, purgeListingMutation]);

  const handleSaveInventoryId = useCallback(async (listingId: string) => {
    const value = (inventoryOverrides[listingId] ?? '').trim();
    if (!value) {
      setError('Inventory ID is required.');
      return;
    }
    try {
      setSavingInventoryId(listingId);
      await updateInventoryIdMutation.mutateAsync({ listingId, inventoryId: value });
      setInventoryOverrides(prev => {
        const next = { ...prev };
        delete next[listingId];
        return next;
      });
      onListingsUpdated?.();
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'ProductListingsContext', action: 'saveInventoryId', listingId, productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to save inventory ID');
    } finally {
      setSavingInventoryId(null);
    }
  }, [inventoryOverrides, onListingsUpdated, product.id, updateInventoryIdMutation]);

  const handleSyncBaseImages = useCallback(async (baseListing: ProductListingWithDetails | null) => {
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
      logClientError(err, { context: { source: 'ProductListingsContext', action: 'syncBaseImages', productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to sync image URLs');
    } finally {
      setSyncingImages(null);
      setIsSyncImagesConfirmOpen(false);
    }
  }, [inventoryOverrides, product.id, syncBaseImagesMutation, toast]);

  const handleRelistTradera = useCallback(async (listingId: string) => {
    try {
      setRelistingListing(listingId);
      setError(null);
      const response = await relistTraderaMutation.mutateAsync({ listingId });
      const queueJobId = (
        response as { queue?: { jobId?: string } } | null
      )?.queue?.jobId;
      toast(
        queueJobId
          ? `Tradera relist queued (job ${queueJobId}).`
          : 'Tradera relist queued.',
        { variant: 'success' }
      );
      onListingsUpdated?.();
    } catch (err: unknown) {
      logClientError(err, {
        context: {
          source: 'ProductListingsContext',
          action: 'relistTradera',
          listingId,
          productId: product.id,
        },
      });
      setError(err instanceof Error ? err.message : 'Failed to queue relist');
    } finally {
      setRelistingListing(null);
    }
  }, [onListingsUpdated, product.id, relistTraderaMutation, toast]);

  const handleOpenTraderaLogin = useCallback(
    async (
      listingId: string,
      integrationId: string,
      connectionId: string
    ) => {
      try {
        setOpeningTraderaLogin(listingId);
        setError(null);
        const response = await api.post<{
          ok?: boolean;
          steps?: Array<{
            step?: string;
            status?: 'pending' | 'ok' | 'failed';
            detail?: string;
          }>;
        }>(
          `/api/integrations/${integrationId}/connections/${connectionId}/test`,
          {
            mode: 'manual',
            manualTimeoutMs: 240000,
          }
        );
        const hasSessionSaved = Array.isArray(response.steps)
          ? response.steps.some(
            (step) =>
              step.step === 'Saving session' && step.status === 'ok'
          )
          : false;
        toast(
          hasSessionSaved
            ? 'Tradera login session refreshed.'
            : 'Tradera manual login completed.',
          { variant: 'success' }
        );
        await listingsQuery.refetch();
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientError(err, {
          context: {
            source: 'ProductListingsContext',
            action: 'openTraderaLogin',
            listingId,
            productId: product.id,
            integrationId,
            connectionId,
          },
        });
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to open Tradera login window'
        );
      } finally {
        setOpeningTraderaLogin(null);
      }
    },
    [listingsQuery, onListingsUpdated, product.id, toast]
  );

  const getLatestTemplateId = (listing: ProductListingWithDetails): string | null => {
    const history = listing.exportHistory ?? [];
    if (history.length === 0) return null;
    const sorted = [...history].sort((a, b) => {
      const aTime = a.exportedAt ? new Date(a.exportedAt).getTime() : 0;
      const bTime = b.exportedAt ? new Date(b.exportedAt).getTime() : 0;
      return bTime - aTime;
    });
    return sorted[0]?.templateId ?? null;
  };

  const exportListingToBase = useCallback(async (
    listingId: string,
    options?: {
      imageBase64Mode?: 'base-only' | 'full-data-uri';
      imageTransform?: ImageTransformOptions | null;
    }
  ) => {
    const listing = listings.find(item => item.id === listingId);
    if (!listing) return;
    const inventoryId = (inventoryOverrides[listingId] || listing.inventoryId || '').trim();
    if (!inventoryId) throw badRequestError('Inventory ID is required.');
    
    const templateId = getLatestTemplateId(listing) ?? undefined;
    const exportData: ExportToBaseVariables = {
      connectionId: listing.connectionId,
      inventoryId,
      exportImagesAsBase64: Boolean(options?.imageBase64Mode || options?.imageTransform)
    };
    if (templateId) exportData.templateId = templateId;
    if (options?.imageBase64Mode) exportData.imageBase64Mode = options.imageBase64Mode;
    if (options?.imageTransform) exportData.imageTransform = options.imageTransform;
    
    const payloadRes = await exportToBaseMutation.mutateAsync(exportData);
    if (payloadRes.logs) setExportLogs(payloadRes.logs);
  }, [exportToBaseMutation, inventoryOverrides, listings]);

  const handleExportAgain = useCallback(async (listingId: string) => {
    const listing = listings.find(item => item.id === listingId);
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
      logClientError(err, { context: { source: 'ProductListingsContext', action: 'exportAgain', listingId, productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to export product');
    } finally {
      setExportingListing(null);
    }
  }, [exportListingToBase, listings, inventoryOverrides, onListingsUpdated, product.id]);

  const handleExportImagesOnly = useCallback(async (listingId: string, preset?: ImageRetryPreset) => {
    const listing = listings.find(item => item.id === listingId);
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
      logClientError(err, { context: { source: 'ProductListingsContext', action: 'exportImagesOnly', listingId, productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to export product images');
    } finally {
      setExportingListing(null);
    }
  }, [exportToBaseMutation, inventoryOverrides, listings, onListingsUpdated, product.id]);

  const handleImageRetry = useCallback(async (preset: ImageRetryPreset) => {
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
      logClientError(err, { context: { source: 'ProductListingsContext', action: 'imageRetry', productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to export product');
    } finally {
      setExportingListing(null);
    }
  }, [exportListingToBase, lastExportListingId, onListingsUpdated, product.id]);

  const value = useMemo(() => ({
    product,
    listings,
    isLoading: isListingsLoading,
    error,
    setError,
    deletingFromBase,
    purgingListing,
    exportingListing,
    savingInventoryId,
    syncingImages,
    relistingListing,
    openingTraderaLogin,
    inventoryOverrides,
    setInventoryOverrides,
    historyOpenByListing,
    setHistoryOpenByListing,
    listingToDelete,
    setListingToDelete,
    listingToPurge,
    setListingToPurge,
    isSyncImagesConfirmOpen,
    setIsSyncImagesConfirmOpen,
    exportLogs,
    logsOpen,
    setLogsOpen,
    lastExportListingId,
    handleDeleteFromBase,
    handlePurgeListing,
    handleSaveInventoryId,
    handleSyncBaseImages,
    handleRelistTradera,
    handleOpenTraderaLogin,
    handleExportAgain,
    handleExportImagesOnly,
    handleImageRetry,
    refetchListings: async () => { await listingsQuery.refetch(); },
    onClose,
    onStartListing,
    filterIntegrationSlug,
  }), [
    product, listings, listingsQuery, isListingsLoading, error, deletingFromBase, purgingListing, exportingListing,
    savingInventoryId, syncingImages, relistingListing, openingTraderaLogin, inventoryOverrides, historyOpenByListing, listingToDelete,
    listingToPurge, isSyncImagesConfirmOpen, exportLogs, logsOpen, lastExportListingId,
    handleDeleteFromBase, handlePurgeListing, handleSaveInventoryId, handleSyncBaseImages,
    handleRelistTradera, handleOpenTraderaLogin, handleExportAgain, handleExportImagesOnly, handleImageRetry, onClose, onStartListing, filterIntegrationSlug
  ]);

  return (
    <ProductListingsContext.Provider value={value}>
      {children}
    </ProductListingsContext.Provider>
  );
}

export function useProductListingsContext(): ProductListingsContextType {
  const context = useContext(ProductListingsContext);
  if (context === undefined) {
    throw internalError('useProductListingsContext must be used within a ProductListingsProvider');
  }
  return context;
}
