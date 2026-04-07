'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchProductListings,
  isMissingProductListingsError,
  productListingsQueryKey,
} from '@/features/integrations/hooks/useListingQueries';
import {
  clearPersistedTraderaQuickListFeedback,
  persistTraderaQuickListFeedback,
  readPersistedTraderaQuickListFeedback,
  type PersistedTraderaQuickListFeedback,
  type TraderaQuickListFeedbackStatus,
} from '@/features/integrations/utils/traderaQuickListFeedback';
import {
  resolveCompletedAtFromListing,
  resolveDuplicateLinkedFromListing,
  resolveListingUrlFromListing,
  resolveTraderaRequestId,
} from '@/features/integrations/utils/tradera-listing-client-utils';
import type { ProductListingWithDetails, QuickExportFeedbackOptions as TraderaFeedbackOptions } from '@/shared/contracts/integrations/listings';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from '@/features/integrations/public';

export type { TraderaFeedbackOptions };

export const findTrackedTraderaListing = (
  listings: ProductListingWithDetails[],
  feedback: PersistedTraderaQuickListFeedback
): ProductListingWithDetails | null => {
  if (feedback.listingId) {
    const byListingId = listings.find((listing) => listing.id === feedback.listingId);
    if (byListingId) return byListingId;
  }

  if (feedback.requestId) {
    const byRequestId = listings.find(
      (listing) => resolveTraderaRequestId(listing) === feedback.requestId
    );
    if (byRequestId) return byRequestId;
  }

  if (feedback.externalListingId) {
    const byExternalListingId = listings.find(
      (listing) => listing.externalListingId === feedback.externalListingId
    );
    if (byExternalListingId) return byExternalListingId;
  }

  return null;
};

export const buildTrackedTraderaFeedbackOptions = (
  listing: ProductListingWithDetails,
  feedback: PersistedTraderaQuickListFeedback
): TraderaFeedbackOptions => ({
  completedAt: resolveCompletedAtFromListing(listing),
  duplicateLinked: resolveDuplicateLinkedFromListing(listing),
  runId: feedback.runId ?? null,
  requestId: feedback.requestId ?? resolveTraderaRequestId(listing),
  integrationId: listing.integrationId ?? feedback.integrationId ?? null,
  connectionId: listing.connectionId ?? feedback.connectionId ?? null,
  listingId: listing.id,
  listingUrl: resolveListingUrlFromListing(listing),
  externalListingId: listing.externalListingId ?? feedback.externalListingId ?? null,
});

export type UseTraderaQuickExportFeedbackResult = {
  localFeedback: PersistedTraderaQuickListFeedback | null;
  localFeedbackStatus: TraderaQuickListFeedbackStatus | null;
  setFeedbackStatus: (
    status: TraderaQuickListFeedbackStatus | null,
    options?: TraderaFeedbackOptions
  ) => void;
  hasServerStatus: boolean;
  serverStatusInFlight: boolean;
  normalizedTraderaStatus: string;
};

export function useTraderaQuickExportFeedback(
  productId: string,
  traderaStatus: string,
  showTraderaBadge: boolean
): UseTraderaQuickExportFeedbackResult {
  const queryClient = useQueryClient();

  const normalizedTraderaStatus = normalizeMarketplaceStatus(traderaStatus);
  const hasServerStatus =
    normalizedTraderaStatus.length > 0 && normalizedTraderaStatus !== 'not_started';
  const serverStatusInFlight =
    PENDING_STATUSES.has(normalizedTraderaStatus) ||
    PROCESSING_STATUSES.has(normalizedTraderaStatus);

  const [localFeedback, setLocalFeedback] =
    useState<PersistedTraderaQuickListFeedback | null>(() =>
      readPersistedTraderaQuickListFeedback(productId)
    );
  const localFeedbackStatus = localFeedback?.status ?? null;
  const localFeedbackRef = useRef(localFeedback);
  localFeedbackRef.current = localFeedback;

  // Re-read persisted feedback when productId changes
  useEffect(() => {
    setLocalFeedback(readPersistedTraderaQuickListFeedback(productId));
  }, [productId]);

  const setFeedbackStatus = useCallback(
    (
      status: TraderaQuickListFeedbackStatus | null,
      options?: TraderaFeedbackOptions
    ): void => {
      if (!status) {
        clearPersistedTraderaQuickListFeedback(productId);
        setLocalFeedback(null);
        return;
      }
      persistTraderaQuickListFeedback(productId, status, options);
      setLocalFeedback(readPersistedTraderaQuickListFeedback(productId));
    },
    [productId]
  );

  // Sync/clear stale feedback based on server status.
  // Uses ref for localFeedback to avoid re-triggering on every local status change.
  useEffect(() => {
    const currentFeedback = localFeedbackRef.current;
    const currentStatus = currentFeedback?.status ?? null;
    const isServerInFlight =
      PENDING_STATUSES.has(normalizedTraderaStatus) ||
      PROCESSING_STATUSES.has(normalizedTraderaStatus);

    const keepFailureRecoveryContext =
      showTraderaBadge && FAILURE_STATUSES.has(normalizedTraderaStatus);
    const keepQueuedSuccessBridge =
      showTraderaBadge &&
      SUCCESS_STATUSES.has(normalizedTraderaStatus) &&
      (currentStatus === 'processing' || currentStatus === 'queued');
    const keepCompletedSuccessContext =
      currentStatus === 'completed' &&
      (normalizedTraderaStatus === 'not_started' ||
        SUCCESS_STATUSES.has(normalizedTraderaStatus) ||
        isServerInFlight);
    if (keepQueuedSuccessBridge) {
      setLocalFeedback(readPersistedTraderaQuickListFeedback(productId));
      return;
    }
    if (keepCompletedSuccessContext) {
      setLocalFeedback(readPersistedTraderaQuickListFeedback(productId));
      return;
    }
    if (keepFailureRecoveryContext) {
      setLocalFeedback(readPersistedTraderaQuickListFeedback(productId));
      return;
    }
    if (!showTraderaBadge && normalizedTraderaStatus === 'not_started') return;
    clearPersistedTraderaQuickListFeedback(productId);
    setLocalFeedback(null);
  }, [normalizedTraderaStatus, productId, showTraderaBadge]);

  // Bridge queued→completed when server badge turns active
  useEffect(() => {
    if (!showTraderaBadge || !SUCCESS_STATUSES.has(normalizedTraderaStatus)) {
      return;
    }
    if (
      !localFeedback ||
      (localFeedback.status !== 'processing' && localFeedback.status !== 'queued')
    ) {
      return;
    }
    if (
      !localFeedback.listingId &&
      !localFeedback.requestId &&
      !localFeedback.externalListingId
    ) {
      return;
    }

    let cancelled = false;

    const promoteTrackedSuccess = (
      listings: ProductListingWithDetails[]
    ): boolean => {
      const trackedListing = findTrackedTraderaListing(listings, localFeedback);
      if (!trackedListing) return false;

      const normalizedListingStatus = normalizeMarketplaceStatus(
        trackedListing.status ?? ''
      );
      if (!SUCCESS_STATUSES.has(normalizedListingStatus)) {
        return false;
      }

      setFeedbackStatus(
        'completed',
        buildTrackedTraderaFeedbackOptions(trackedListing, localFeedback)
      );
      return true;
    };

    const cachedListings = queryClient.getQueryData<ProductListingWithDetails[]>(
      normalizeQueryKey(productListingsQueryKey(productId))
    );
    if (Array.isArray(cachedListings) && promoteTrackedSuccess(cachedListings)) {
      return;
    }

    void fetchQueryV2(queryClient, {
      queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
      queryFn: () => fetchProductListings(productId),
      staleTime: 0,
      logError: false,
      meta: {
        source:
          'products.components.TraderaQuickListButton.promoteTrackedSuccess',
        operation: 'list',
        resource: 'integrations.product-listings',
        domain: 'integrations',
        tags: ['integrations', 'tradera', 'quick-list', 'success-bridge'],
        description:
          'Bridges queued Tradera quick export feedback into completed state once the authoritative badge turns active.',
      },
    })()
      .then((listings) => {
        if (cancelled || !Array.isArray(listings)) return;
        promoteTrackedSuccess(listings);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isMissingProductListingsError(error)) {
          queryClient.removeQueries({
            queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
          });
          setFeedbackStatus(null);
          return;
        }
        logClientCatch(error, {
          source: 'TraderaQuickListButton',
          action: 'promoteTrackedSuccess',
          productId,
          requestId: localFeedback.requestId ?? null,
          listingId: localFeedback.listingId ?? null,
          level: 'warn',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    localFeedback,
    normalizedTraderaStatus,
    productId,
    queryClient,
    setFeedbackStatus,
    showTraderaBadge,
  ]);

  // TTL expiry: transition processing/queued → failed when time runs out
  useEffect(() => {
    if (!localFeedback) return;
    if (
      localFeedback.status !== 'processing' &&
      localFeedback.status !== 'queued'
    ) {
      return;
    }

    const remainingMs = localFeedback.expiresAt - Date.now();
    if (remainingMs <= 0) {
      setFeedbackStatus('failed', {
        runId: localFeedback.runId ?? null,
        requestId: localFeedback.requestId ?? null,
        integrationId: localFeedback.integrationId ?? null,
        connectionId: localFeedback.connectionId ?? null,
        listingId: localFeedback.listingId ?? null,
        listingUrl: localFeedback.listingUrl ?? null,
        externalListingId: localFeedback.externalListingId ?? null,
      });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackStatus('failed', {
        runId: localFeedback.runId ?? null,
        requestId: localFeedback.requestId ?? null,
        integrationId: localFeedback.integrationId ?? null,
        connectionId: localFeedback.connectionId ?? null,
        listingId: localFeedback.listingId ?? null,
        listingUrl: localFeedback.listingUrl ?? null,
        externalListingId: localFeedback.externalListingId ?? null,
      });
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [localFeedback, setFeedbackStatus]);

  return {
    localFeedback,
    localFeedbackStatus,
    setFeedbackStatus,
    hasServerStatus,
    serverStatusInFlight,
    normalizedTraderaStatus,
  };
}
