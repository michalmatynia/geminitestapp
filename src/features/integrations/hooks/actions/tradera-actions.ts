import { useCallback, type Dispatch, type SetStateAction } from 'react';

import {
  isPlaywrightProgrammableSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import type {
  useCheckTraderaStatusMutation,
  useMoveTraderaListingToUnsoldMutation,
  useRelistTraderaMutation,
  useSyncTraderaMutation,
} from '@/features/integrations/hooks/useProductListingMutations';
import {
  isTraderaBrowserAuthRequiredMessage,
  refreshTraderaBrowserSession,
  TRADERA_BROWSER_SESSION_SAVE_FAILURE_MESSAGE,
} from '@/features/integrations/utils/tradera-browser-session';
import { createTraderaRecoveryContext } from '@/features/integrations/utils/product-listings-recovery';
import type {
  PlaywrightRelistBrowserMode,
  ProductListingWithDetails,
  ProductListingsRecoveryContext,
} from '@/shared/contracts/integrations/listings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type TraderaPreflightArgs = {
  integrationId: string;
  connectionId: string;
  productId?: string | undefined;
};

type UseTraderaActionsOptions = {
  checkTraderaStatusMutation: ReturnType<typeof useCheckTraderaStatusMutation>;
  ensureTraderaPreflightSessionReady: (args: TraderaPreflightArgs) => Promise<void>;
  listings: ProductListingWithDetails[];
  moveTraderaListingToUnsoldMutation: ReturnType<typeof useMoveTraderaListingToUnsoldMutation>;
  onListingsUpdated?: (() => void) | undefined;
  productId: string;
  refetchListingsQuery: () => Promise<unknown>;
  relistTraderaMutation: ReturnType<typeof useRelistTraderaMutation>;
  setCheckingTraderaStatusListing: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setListingToMoveToUnsold: Dispatch<SetStateAction<string | null>>;
  setMovingTraderaListingToUnsold: Dispatch<SetStateAction<string | null>>;
  setOpeningTraderaLogin: Dispatch<SetStateAction<string | null>>;
  setRecoveryContext: Dispatch<SetStateAction<ProductListingsRecoveryContext | null>>;
  setRelistingBrowserMode: Dispatch<SetStateAction<PlaywrightRelistBrowserMode | null>>;
  setRelistingListing: Dispatch<SetStateAction<string | null>>;
  setSyncingTraderaListing: Dispatch<SetStateAction<string | null>>;
  syncTraderaMutation: ReturnType<typeof useSyncTraderaMutation>;
};

export const useTraderaActions = ({
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
}: UseTraderaActionsOptions) => {
  const { toast } = useToast();

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
          response.alreadyQueued
            ? 'Tradera sync already queued.'
            : queueJobId
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

  return {
    handleCheckTraderaStatus,
    handleMoveTraderaListingToUnsold,
    handleOpenTraderaLogin,
    handleRecoverTraderaListing,
    handleRelistTradera,
    handleSyncTradera,
  };
};
