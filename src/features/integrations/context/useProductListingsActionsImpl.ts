'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  isPlaywrightProgrammableSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
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
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import {
  isTraderaBrowserAuthRequiredMessage,
  preflightTraderaQuickListSession,
  refreshTraderaBrowserSession,
  TRADERA_BROWSER_MANUAL_VERIFICATION_MESSAGE,
  TRADERA_BROWSER_SESSION_SAVE_FAILURE_MESSAGE,
} from '@/features/integrations/utils/tradera-browser-session';
import {
  ensureVintedBrowserSession,
  isVintedBrowserAuthRequiredMessage,
} from '@/features/integrations/utils/vinted-browser-session';
import { normalizeVintedDisplayText } from '@/features/integrations/utils/vinted-display';
import {
  createTraderaRecoveryContext,
  createVintedRecoveryContext,
} from '@/features/integrations/utils/product-listings-recovery';
import { getBaseExportPreflightError } from '@/features/integrations/utils/baseExportPreflight';
import { resolveBaseExportSuccessMessage } from '@/features/integrations/utils/baseExportFeedback';
import type {
  PlaywrightRelistBrowserMode,
  ProductListingWithDetails,
  ProductListingExportEvent,
  ProductListingsRecoveryContext,
} from '@/shared/contracts/integrations/listings';
import type { ImageRetryPreset, ImageTransformOptions } from '@/shared/contracts/integrations/base';
import { badRequestError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui/primitives.public';
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
  const { toast } = useToast();

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
        selectorProfile?: string;
      }
    ) => {
      const listing = listings.find((item) => item.id === listingId);
      try {
        setRelistingListing(listingId);
        setRelistingBrowserMode(options?.browserMode ?? null);
        setError(null);
        const isPlaywrightRelist = Boolean(
          listing && isPlaywrightProgrammableSlug(listing.integration.slug)
        );
        if (
          !options?.skipSessionPreflight &&
          options?.browserMode !== 'headed' &&
          listing &&
          isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
          listing.integrationId &&
          listing.connectionId
        ) {
          await ensureTraderaPreflightSessionReady({
            integrationId: listing.integrationId,
            connectionId: listing.connectionId,
            productId:
              typeof listing.productId === 'string' && listing.productId.trim()
                ? listing.productId.trim()
                : undefined,
          });
        }
        const response = await relistTraderaMutation.mutateAsync({
          listingId,
          ...(options?.browserMode ? { browserMode: options.browserMode } : {}),
          ...(options?.selectorProfile ? { selectorProfile: options.selectorProfile } : {}),
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
        setRecoveryContext((current) =>
          current?.integrationSlug === 'tradera' ? null : current
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
          if (
            listing &&
            isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
            listing.integrationId &&
            listing.connectionId
          ) {
            setRecoveryContext(
              createTraderaRecoveryContext({
                status: 'auth_required',
                runId: null,
                failureReason: errorMessage,
                integrationId: listing.integrationId,
                connectionId: listing.connectionId,
              })
            );
          }
          toast(errorMessage, { variant: 'error' });
          return;
        }
        if (
          listing &&
          isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
          listing.integrationId &&
          listing.connectionId
        ) {
          setRecoveryContext(
            createTraderaRecoveryContext({
              status: 'failed',
              runId: null,
              failureReason: errorMessage,
              integrationId: listing.integrationId,
              connectionId: listing.connectionId,
            })
          );
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
      setRecoveryContext,
      setRelistingBrowserMode,
      setRelistingListing,
      toast,
      ensureTraderaPreflightSessionReady,
    ]
  );

  const handleMoveTraderaListingToUnsold = useCallback(
    async (
      listingId: string,
      options?: {
        skipSessionPreflight?: boolean;
        browserMode?: PlaywrightRelistBrowserMode;
        selectorProfile?: string;
      }
    ) => {
      const listing = listings.find((item) => item.id === listingId);

      try {
        setMovingTraderaListingToUnsold(listingId);
        setError(null);

        if (
          !options?.skipSessionPreflight &&
          listing &&
          isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
          listing.integrationId &&
          listing.connectionId
        ) {
          await ensureTraderaPreflightSessionReady({
            integrationId: listing.integrationId,
            connectionId: listing.connectionId,
            productId:
              typeof listing.productId === 'string' && listing.productId.trim()
                ? listing.productId.trim()
                : productId,
          });
        }

        const response = await moveTraderaListingToUnsoldMutation.mutateAsync({
          listingId,
          ...(options?.browserMode ? { browserMode: options.browserMode } : {}),
          ...(options?.selectorProfile ? { selectorProfile: options.selectorProfile } : {}),
        });
        const queueJobId = response.queue?.jobId;
        toast(
          queueJobId
            ? `Tradera end listing queued (job ${queueJobId}).`
            : 'Tradera end listing queued.',
          { variant: 'success' }
        );
        setRecoveryContext((current) =>
          current?.integrationSlug === 'tradera' ? null : current
        );
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'moveTraderaListingToUnsold',
          listingId,
          productId,
        });
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to queue Tradera end listing';
        if (isTraderaBrowserAuthRequiredMessage(errorMessage)) {
          if (
            listing &&
            isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
            listing.integrationId &&
            listing.connectionId
          ) {
            setRecoveryContext(
              createTraderaRecoveryContext({
                status: 'auth_required',
                runId: null,
                failureReason: errorMessage,
                integrationId: listing.integrationId,
                connectionId: listing.connectionId,
              })
            );
          }
          toast(errorMessage, { variant: 'error' });
          return;
        }
        if (
          listing &&
          isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
          listing.integrationId &&
          listing.connectionId
        ) {
          setRecoveryContext(
            createTraderaRecoveryContext({
              status: 'failed',
              runId: null,
              failureReason: errorMessage,
              integrationId: listing.integrationId,
              connectionId: listing.connectionId,
            })
          );
        }
        setError(errorMessage);
      } finally {
        setMovingTraderaListingToUnsold(null);
        setListingToMoveToUnsold(null);
      }
    },
    [
      listings,
      moveTraderaListingToUnsoldMutation,
      onListingsUpdated,
      productId,
      setError,
      setListingToMoveToUnsold,
      setMovingTraderaListingToUnsold,
      setRecoveryContext,
      toast,
      ensureTraderaPreflightSessionReady,
    ]
  );

  const handleSyncTradera = useCallback(
    async (
      listingId: string,
      options?: {
        integrationId?: string | null;
        connectionId?: string | null;
        skipSessionPreflight?: boolean;
        browserMode?: PlaywrightRelistBrowserMode;
        selectorProfile?: string;
        skipImages?: boolean;
      }
    ) => {
      const listing = listings.find((item) => item.id === listingId);
      const integrationId = listing?.integrationId ?? options?.integrationId ?? null;
      const connectionId = listing?.connectionId ?? options?.connectionId ?? null;

      try {
        setSyncingTraderaListing(listingId);
        setError(null);

        if (!options?.skipSessionPreflight && integrationId && connectionId) {
          await ensureTraderaPreflightSessionReady({
            integrationId,
            connectionId,
            productId:
              typeof listing?.productId === 'string' && listing.productId.trim()
                ? listing.productId.trim()
                : productId,
          });
        }

        const response = await syncTraderaMutation.mutateAsync({
          listingId,
          ...(options?.browserMode ? { browserMode: options.browserMode } : {}),
          ...(options?.selectorProfile ? { selectorProfile: options.selectorProfile } : {}),
          ...(options?.skipImages ? { skipImages: true } : {}),
        });
        const queueJobId = response.queue?.jobId;
        toast(
          queueJobId
            ? `Tradera sync queued (job ${queueJobId}).`
            : 'Tradera sync queued.',
          { variant: 'success' }
        );
        setRecoveryContext((current) =>
          current?.integrationSlug === 'tradera' ? null : current
        );
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'syncTradera',
          listingId,
          productId,
        });
        const errorMessage = err instanceof Error ? err.message : 'Failed to queue Tradera sync';
        if (isTraderaBrowserAuthRequiredMessage(errorMessage)) {
          if (integrationId && connectionId) {
            setRecoveryContext(
              createTraderaRecoveryContext({
                status: 'auth_required',
                runId: null,
                failureReason: errorMessage,
                integrationId,
                connectionId,
              })
            );
          }
          toast(errorMessage, { variant: 'error' });
          return;
        }
        if (integrationId && connectionId) {
          setRecoveryContext(
            createTraderaRecoveryContext({
              status: 'failed',
              runId: null,
              failureReason: errorMessage,
              integrationId,
              connectionId,
            })
          );
        }
        setError(errorMessage);
      } finally {
        setSyncingTraderaListing(null);
      }
    },
    [
      listings,
      onListingsUpdated,
      productId,
      setRecoveryContext,
      setError,
      setSyncingTraderaListing,
      syncTraderaMutation,
      toast,
      ensureTraderaPreflightSessionReady,
    ]
  );

  const handleCheckTraderaStatus = useCallback(
    async (
      listingId: string,
      options?: {
        skipSessionPreflight?: boolean;
        browserMode?: PlaywrightRelistBrowserMode;
        selectorProfile?: string;
      }
    ) => {
      const listing = listings.find((item) => item.id === listingId);

      try {
        setCheckingTraderaStatusListing(listingId);
        setError(null);

        if (
          !options?.skipSessionPreflight &&
          listing &&
          isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
          listing.integrationId &&
          listing.connectionId
        ) {
          await ensureTraderaPreflightSessionReady({
            integrationId: listing.integrationId,
            connectionId: listing.connectionId,
            productId:
              typeof listing.productId === 'string' && listing.productId.trim()
                ? listing.productId.trim()
                : productId,
          });
        }

        const response = await checkTraderaStatusMutation.mutateAsync({
          listingId,
          ...(options?.browserMode ? { browserMode: options.browserMode } : {}),
          ...(options?.selectorProfile ? { selectorProfile: options.selectorProfile } : {}),
        });
        const queueJobId = response.queue?.jobId;
        toast(
          queueJobId
            ? `Tradera status check queued (job ${queueJobId}).`
            : 'Tradera status check queued.',
          { variant: 'success' }
        );
        setRecoveryContext((current) =>
          current?.integrationSlug === 'tradera' ? null : current
        );
        onListingsUpdated?.();
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'checkTraderaStatus',
          listingId,
          productId,
        });
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to queue Tradera status check';
        if (isTraderaBrowserAuthRequiredMessage(errorMessage)) {
          if (
            listing &&
            isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
            listing.integrationId &&
            listing.connectionId
          ) {
            setRecoveryContext(
              createTraderaRecoveryContext({
                status: 'auth_required',
                runId: null,
                failureReason: errorMessage,
                integrationId: listing.integrationId,
                connectionId: listing.connectionId,
              })
            );
          }
          toast(errorMessage, { variant: 'error' });
          return;
        }
        if (
          listing &&
          isTraderaBrowserIntegrationSlug(listing.integration.slug) &&
          listing.integrationId &&
          listing.connectionId
        ) {
          setRecoveryContext(
            createTraderaRecoveryContext({
              status: 'failed',
              runId: null,
              failureReason: errorMessage,
              integrationId: listing.integrationId,
              connectionId: listing.connectionId,
            })
          );
        }
        setError(errorMessage);
      } finally {
        setCheckingTraderaStatusListing(null);
      }
    },
    [
      checkTraderaStatusMutation,
      listings,
      onListingsUpdated,
      productId,
      setCheckingTraderaStatusListing,
      setError,
      setRecoveryContext,
      toast,
      ensureTraderaPreflightSessionReady,
    ]
  );

  const handleOpenTraderaLogin = useCallback(
    async (listingId: string, integrationId: string, connectionId: string): Promise<boolean> => {
      try {
        setOpeningTraderaLogin(listingId);
        setError(null);
        const response = await refreshTraderaBrowserSession({
          integrationId,
          connectionId,
        });
        if (!response.savedSession) {
          setRecoveryContext(
            createTraderaRecoveryContext({
              status: 'auth_required',
              runId: null,
              failureReason: TRADERA_BROWSER_SESSION_SAVE_FAILURE_MESSAGE,
              integrationId,
              connectionId,
            })
          );
          toast(TRADERA_BROWSER_SESSION_SAVE_FAILURE_MESSAGE, { variant: 'error' });
          return false;
        }
        toast(
          'Tradera login session refreshed.',
          { variant: 'success' }
        );
        setRecoveryContext((current) =>
          current?.integrationSlug === 'tradera' ? null : current
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
          return false;
        }
        setError(errorMessage);
        return false;
      } finally {
        setOpeningTraderaLogin(null);
      }
    },
    [
      onListingsUpdated,
      productId,
      refetchListingsQuery,
      setError,
      setOpeningTraderaLogin,
      setRecoveryContext,
      toast,
    ]
  );

  const handleRecoverTraderaListing = useCallback(
    async ({
      listingId,
      integrationId,
      connectionId,
      action,
      browserMode = 'headed',
      selectorProfile,
      skipImages = false,
    }: {
      listingId: string;
      integrationId: string;
      connectionId: string;
      action: 'relist' | 'sync' | 'check_status' | 'move_to_unsold';
      browserMode?: PlaywrightRelistBrowserMode;
      selectorProfile?: string;
      skipImages?: boolean;
    }): Promise<boolean> => {
      const recovered = await handleOpenTraderaLogin(listingId, integrationId, connectionId);
      if (!recovered) {
        return false;
      }

      if (action === 'sync') {
        await handleSyncTradera(listingId, {
          skipSessionPreflight: true,
          integrationId,
          connectionId,
          browserMode,
          ...(selectorProfile ? { selectorProfile } : {}),
          ...(skipImages ? { skipImages: true } : {}),
        });
        return true;
      }

      if (action === 'check_status') {
        await handleCheckTraderaStatus(listingId, {
          skipSessionPreflight: true,
          browserMode,
          ...(selectorProfile ? { selectorProfile } : {}),
        });
        return true;
      }

      if (action === 'move_to_unsold') {
        await handleMoveTraderaListingToUnsold(listingId, {
          skipSessionPreflight: true,
          browserMode,
          ...(selectorProfile ? { selectorProfile } : {}),
        });
        return true;
      }

      await handleRelistTradera(listingId, {
        skipSessionPreflight: true,
        browserMode,
        ...(selectorProfile ? { selectorProfile } : {}),
      });
      return true;
    },
    [
      handleCheckTraderaStatus,
      handleMoveTraderaListingToUnsold,
      handleOpenTraderaLogin,
      handleRelistTradera,
      handleSyncTradera,
    ]
  );

  const handleOpenVintedLogin = useCallback(
    async (listingId: string, integrationId: string, connectionId: string): Promise<boolean> => {
      try {
        setOpeningVintedLogin(listingId);
        setError(null);
        const response = await ensureVintedBrowserSession({
          integrationId,
          connectionId,
        });
        if (!response.savedSession) {
          const errorMessage =
            'Vinted.pl login session could not be saved. Complete login verification and retry.';
          setRecoveryContext(
            createVintedRecoveryContext({
              status: 'auth_required',
              runId: null,
              failureReason: errorMessage,
              integrationId,
              connectionId,
            })
          );
          toast(errorMessage, { variant: 'error' });
          return false;
        }
        toast(
          'Vinted.pl login session refreshed.',
          { variant: 'success' }
        );
        setRecoveryContext((current) =>
          current?.integrationSlug === 'vinted' ? null : current
        );
        await refetchListingsQuery();
        onListingsUpdated?.();
        return true;
      } catch (err: unknown) {
        logClientCatch(err, {
          source: 'ProductListingsContext',
          action: 'openVintedLogin',
          listingId,
          productId,
          integrationId,
          connectionId,
        });
        const errorMessage =
          normalizeVintedDisplayText(
            err instanceof Error ? err.message : 'Failed to open Vinted.pl login window'
          );
        if (isVintedBrowserAuthRequiredMessage(errorMessage)) {
          setRecoveryContext(
            createVintedRecoveryContext({
              status: 'auth_required',
              runId: null,
              failureReason: errorMessage,
              integrationId,
              connectionId,
            })
          );
          toast(errorMessage, { variant: 'error' });
          return false;
        }
        setError(errorMessage);
        return false;
      } finally {
        setOpeningVintedLogin(null);
      }
    },
    [
      onListingsUpdated,
      productId,
      refetchListingsQuery,
      setError,
      setOpeningVintedLogin,
      setRecoveryContext,
      toast,
    ]
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
      if (!listing) throw badRequestError('Base.com listing not found for this product.');
      const inventoryId = (inventoryOverrides[listingId] || listing.inventoryId || '').trim();
      if (!inventoryId) throw badRequestError('Inventory ID is required.');

      const templateId = getLatestTemplateId(listing) ?? undefined;
      const exportData: ExportToBaseVariables = {
        connectionId: listing.connectionId,
        inventoryId,
        listingId: listing.id,
        exportImagesAsBase64: Boolean(options?.imageBase64Mode || options?.imageTransform),
      };
      if (templateId) exportData.templateId = templateId;
      if (listing.externalListingId) exportData.externalListingId = listing.externalListingId;
      if (options?.imageBase64Mode) exportData.imageBase64Mode = options.imageBase64Mode;
      if (options?.imageTransform) exportData.imageTransform = options.imageTransform;

      const payloadRes = await exportToBaseMutation.mutateAsync(exportData);
      if (payloadRes.logs) setExportLogs(payloadRes.logs);
      return payloadRes;
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
      const preflightError = getBaseExportPreflightError(productCategoryId);
      if (preflightError) {
        setError(preflightError);
        return;
      }
      try {
        setExportingListing(listingId);
        setLastExportListingId(listingId);
        setError(null);
        setExportLogs([]);
        setLogsOpen(true);
        const response = await exportListingToBase(listingId);
        toast(resolveBaseExportSuccessMessage(response), { variant: 'success' });
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
    [exportListingToBase, inventoryOverrides, listings, onListingsUpdated, productCategoryId, productId, setError, setExportLogs, setExportingListing, setLastExportListingId, setLogsOpen]
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
        toast(resolveBaseExportSuccessMessage(payloadRes, { mode: 'images_only' }), {
          variant: 'success',
        });

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
      const preflightError = getBaseExportPreflightError(productCategoryId);
      if (preflightError) {
        setError(preflightError);
        return;
      }
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
    [exportListingToBase, lastExportListingId, onListingsUpdated, productCategoryId, productId, setError, setExportLogs, setExportingListing, setLogsOpen]
  );

  const refetchListings = useCallback(async () => {
    await refetchListingsQuery();
  }, [refetchListingsQuery]);

  return {
    handleDeleteFromBase,
    handlePurgeListing,
    handleSaveInventoryId,
    handleSyncBaseImages,
    handleSyncTradera,
    handleCheckTraderaStatus,
    handleRelistTradera,
    handleMoveTraderaListingToUnsold,
    handleOpenTraderaLogin,
    handleRecoverTraderaListing,
    handleOpenVintedLogin,
    handleExportAgain,
    handleExportImagesOnly,
    handleImageRetry,
    refetchListings,
  };
};
