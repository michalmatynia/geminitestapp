'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchProductListings,
  isMissingProductListingsError,
  productListingsQueryKey,
} from '@/features/integrations/hooks/useListingQueries';
import {
  clearPersistedVintedQuickListFeedback,
  persistVintedQuickListFeedback,
  readPersistedVintedQuickListFeedback,
  type PersistedVintedQuickListFeedback,
  type VintedQuickListFeedbackStatus,
} from '@/features/integrations/utils/vintedQuickListFeedback';
import {
  resolveVintedCompletedAtFromListing,
  resolveVintedListingUrlFromListing,
  resolveVintedRequestId,
} from '@/features/integrations/utils/vinted-listing-client-utils';
import type { ProductListingWithDetails, QuickExportFeedbackOptions as VintedFeedbackOptions } from '@/shared/contracts/integrations/listings';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from '@/features/integrations/utils/marketplace-status';

export type VintedQuickListStatus = VintedQuickListFeedbackStatus;
export type VintedQuickListFeedback = PersistedVintedQuickListFeedback;

export type { VintedFeedbackOptions };

export const findTrackedVintedListing = (
  listings: ProductListingWithDetails[],
  feedback: PersistedVintedQuickListFeedback
): ProductListingWithDetails | null => {
  if (feedback.listingId) {
    const byListingId = listings.find((listing) => listing.id === feedback.listingId);
    if (byListingId) return byListingId;
  }

  if (feedback.requestId) {
    const byRequestId = listings.find(
      (listing) => resolveVintedRequestId(listing) === feedback.requestId
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

export const buildTrackedVintedFeedbackOptions = (
  listing: ProductListingWithDetails,
  feedback: PersistedVintedQuickListFeedback
): VintedFeedbackOptions => ({
  completedAt: resolveVintedCompletedAtFromListing(listing),
  runId: feedback.runId ?? null,
  requestId: feedback.requestId ?? resolveVintedRequestId(listing),
  integrationId: listing.integrationId ?? feedback.integrationId ?? null,
  connectionId: listing.connectionId ?? feedback.connectionId ?? null,
  listingId: listing.id,
  listingUrl: resolveVintedListingUrlFromListing(listing),
  externalListingId: listing.externalListingId ?? feedback.externalListingId ?? null,
});

export function useVintedQuickExportFeedback(
  productId: string,
  vintedStatus: string,
  showVintedBadge: boolean
): {
  localFeedback: PersistedVintedQuickListFeedback | null;
  localFeedbackStatus: VintedQuickListFeedbackStatus | null;
  setFeedbackStatus: (
    status: VintedQuickListFeedbackStatus | null,
    options?: VintedFeedbackOptions
  ) => void;
  hasServerStatus: boolean;
  serverStatusInFlight: boolean;
  normalizedVintedStatus: string;
} {
  const queryClient = useQueryClient();

  const normalizedVintedStatus = normalizeMarketplaceStatus(vintedStatus);
  const hasServerStatus =
    normalizedVintedStatus.length > 0 && normalizedVintedStatus !== 'not_started';
  const serverStatusInFlight =
    PENDING_STATUSES.has(normalizedVintedStatus) ||
    PROCESSING_STATUSES.has(normalizedVintedStatus);

  const [localFeedback, setLocalFeedback] =
    useState<PersistedVintedQuickListFeedback | null>(() =>
      readPersistedVintedQuickListFeedback(productId)
    );
  const localFeedbackStatus = localFeedback?.status ?? null;
  const localFeedbackRef = useRef(localFeedback);
  localFeedbackRef.current = localFeedback;

  useEffect(() => {
    setLocalFeedback(readPersistedVintedQuickListFeedback(productId));
  }, [productId]);

  const setFeedbackStatus = useCallback(
    (
      status: VintedQuickListFeedbackStatus | null,
      options?: VintedFeedbackOptions
    ): void => {
      if (!status) {
        clearPersistedVintedQuickListFeedback(productId);
        setLocalFeedback(null);
        return;
      }

      persistVintedQuickListFeedback(productId, status, options);
      setLocalFeedback(readPersistedVintedQuickListFeedback(productId));
    },
    [productId]
  );

  useEffect(() => {
    const currentFeedback = localFeedbackRef.current;
    const currentStatus = currentFeedback?.status ?? null;
    const isServerInFlight =
      PENDING_STATUSES.has(normalizedVintedStatus) ||
      PROCESSING_STATUSES.has(normalizedVintedStatus);
    const isServerRecoveryStatus =
      FAILURE_STATUSES.has(normalizedVintedStatus) ||
      normalizedVintedStatus === 'auth_required' ||
      normalizedVintedStatus === 'needs_login';

    const keepFailureRecoveryContext =
      showVintedBadge && isServerRecoveryStatus;
    const keepQueuedSuccessBridge =
      showVintedBadge &&
      SUCCESS_STATUSES.has(normalizedVintedStatus) &&
      (currentStatus === 'processing' || currentStatus === 'queued');
    const keepCompletedSuccessContext =
      currentStatus === 'completed' &&
      (normalizedVintedStatus === 'not_started' ||
        SUCCESS_STATUSES.has(normalizedVintedStatus) ||
        isServerInFlight);

    if (keepQueuedSuccessBridge || keepCompletedSuccessContext || keepFailureRecoveryContext) {
      setLocalFeedback(readPersistedVintedQuickListFeedback(productId));
      return;
    }
    if (!showVintedBadge && normalizedVintedStatus === 'not_started') return;
    clearPersistedVintedQuickListFeedback(productId);
    setLocalFeedback(null);
  }, [normalizedVintedStatus, productId, showVintedBadge]);

  useEffect(() => {
    if (!showVintedBadge || !SUCCESS_STATUSES.has(normalizedVintedStatus)) {
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
      const trackedListing = findTrackedVintedListing(listings, localFeedback);
      if (!trackedListing) return false;

      const normalizedListingStatus = normalizeMarketplaceStatus(
        trackedListing.status ?? ''
      );
      if (!SUCCESS_STATUSES.has(normalizedListingStatus)) {
        return false;
      }

      setFeedbackStatus(
        'completed',
        buildTrackedVintedFeedbackOptions(trackedListing, localFeedback)
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
          'products.components.VintedQuickListButton.promoteTrackedSuccess',
        operation: 'list',
        resource: 'integrations.product-listings',
        domain: 'integrations',
        tags: ['integrations', 'vinted', 'quick-list', 'success-bridge'],
        description:
          'Bridges queued Vinted quick export feedback into completed state once the authoritative badge turns active.',
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
          source: 'VintedQuickListButton',
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
    normalizedVintedStatus,
    productId,
    queryClient,
    setFeedbackStatus,
    showVintedBadge,
  ]);

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
    normalizedVintedStatus,
  };
}
