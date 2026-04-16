'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchProductListings,
  isMissingProductListingsError,
  productListingsQueryKey,
} from '@/features/integrations/hooks/useListingQueries';
import {
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from '@/features/integrations/utils/marketplace-status';
import type {
  ProductListingWithDetails,
  QuickExportFeedbackOptions,
  QuickExportFeedbackStatus,
  PersistedQuickExportFeedback,
} from '@/shared/contracts/integrations/listings';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export interface MarketplaceQuickExportFeedbackActions {
  readFeedback: (productId: string) => PersistedQuickExportFeedback | null;
  persistFeedback: (
    productId: string,
    status: QuickExportFeedbackStatus,
    options?: QuickExportFeedbackOptions
  ) => void;
  clearFeedback: (productId: string) => void;
  findTrackedListing: (
    listings: ProductListingWithDetails[],
    feedback: PersistedQuickExportFeedback
  ) => ProductListingWithDetails | null;
  buildFeedbackOptions: (
    listing: ProductListingWithDetails,
    feedback: PersistedQuickExportFeedback
  ) => QuickExportFeedbackOptions;
  isTrackedListingSuccess?: (
    listing: ProductListingWithDetails,
    feedback: PersistedQuickExportFeedback
  ) => boolean;
}

export function useMarketplaceQuickExportFeedback(
  productId: string,
  rawStatus: string,
  showBadge: boolean,
  actions: MarketplaceQuickExportFeedbackActions,
  marketplaceName: string // for logging
) {
  const queryClient = useQueryClient();

  const normalizedStatus = normalizeMarketplaceStatus(rawStatus);
  const hasServerStatus =
    normalizedStatus.length > 0 && normalizedStatus !== 'not_started';
  const serverStatusInFlight =
    PENDING_STATUSES.has(normalizedStatus) ||
    PROCESSING_STATUSES.has(normalizedStatus);

  const [localFeedback, setLocalFeedback] = useState<PersistedQuickExportFeedback | null>(() =>
    actions.readFeedback(productId)
  );
  const localFeedbackStatus = localFeedback?.status ?? null;
  const localFeedbackRef = useRef(localFeedback);
  localFeedbackRef.current = localFeedback;

  useEffect(() => {
    setLocalFeedback(actions.readFeedback(productId));
  }, [productId, actions]);

  const setFeedbackStatus = useCallback(
    (status: QuickExportFeedbackStatus | null, options?: QuickExportFeedbackOptions): void => {
      if (!status) {
        actions.clearFeedback(productId);
        setLocalFeedback(null);
        return;
      }

      actions.persistFeedback(productId, status, options);
      setLocalFeedback(actions.readFeedback(productId));
    },
    [productId, actions]
  );

  useEffect(() => {
    const currentFeedback = localFeedbackRef.current;
    const currentStatus = currentFeedback?.status ?? null;
    const isServerInFlight =
      PENDING_STATUSES.has(normalizedStatus) ||
      PROCESSING_STATUSES.has(normalizedStatus);
    const isServerRecoveryStatus =
      FAILURE_STATUSES.has(normalizedStatus) ||
      normalizedStatus === 'auth_required' ||
      normalizedStatus === 'needs_login';

    const keepFailureRecoveryContext = showBadge && isServerRecoveryStatus;
    const keepQueuedSuccessBridge =
      showBadge &&
      SUCCESS_STATUSES.has(normalizedStatus) &&
      (currentStatus === 'processing' || currentStatus === 'queued');
    const keepCompletedSuccessContext =
      currentStatus === 'completed' &&
      (normalizedStatus === 'not_started' ||
        SUCCESS_STATUSES.has(normalizedStatus) ||
        isServerInFlight);
    const keepCompletedRecoveryBridge =
      !showBadge && currentStatus === 'completed' && isServerRecoveryStatus;

    if (
      keepQueuedSuccessBridge ||
      keepCompletedSuccessContext ||
      keepCompletedRecoveryBridge ||
      keepFailureRecoveryContext
    ) {
      setLocalFeedback(actions.readFeedback(productId));
      return;
    }
    if (!showBadge && normalizedStatus === 'not_started') return;
    actions.clearFeedback(productId);
    setLocalFeedback(null);
  }, [normalizedStatus, productId, showBadge, actions]);

  useEffect(() => {
    if (!showBadge || !SUCCESS_STATUSES.has(normalizedStatus)) {
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

    const promoteTrackedSuccess = (listings: ProductListingWithDetails[]): boolean => {
      const trackedListing = actions.findTrackedListing(listings, localFeedback);
      if (!trackedListing) return false;

      const isTrackedListingSuccess = actions.isTrackedListingSuccess
        ? actions.isTrackedListingSuccess(trackedListing, localFeedback)
        : SUCCESS_STATUSES.has(normalizeMarketplaceStatus(trackedListing.status ?? ''));
      if (!isTrackedListingSuccess) {
        return false;
      }

      setFeedbackStatus('completed', actions.buildFeedbackOptions(trackedListing, localFeedback));
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
        source: `integrations.hooks.${marketplaceName}QuickListButton.promoteTrackedSuccess`,
        operation: 'list',
        resource: 'integrations.product-listings',
        domain: 'integrations',
        tags: ['integrations', marketplaceName.toLowerCase(), 'quick-list', 'success-bridge'],
        description: `Bridges queued ${marketplaceName} quick export feedback into completed state once the authoritative badge turns active.`,
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
          source: `${marketplaceName}QuickListButton`,
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
    normalizedStatus,
    productId,
    queryClient,
    setFeedbackStatus,
    showBadge,
    actions,
    marketplaceName,
  ]);

  useEffect(() => {
    if (!localFeedback) return;
    if (localFeedback.status !== 'processing' && localFeedback.status !== 'queued') {
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
    normalizedStatus,
  };
}
