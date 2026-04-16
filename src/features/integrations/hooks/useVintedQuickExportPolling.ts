'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  fetchProductListings,
  isMissingProductListingsError,
  productListingsQueryKey,
} from '@/features/integrations/hooks/useListingQueries';
import type { ListingBadgesPayload } from '@/shared/contracts/integrations/listings';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import {
  invalidateProductListingsAndBadges,
  invalidateProducts,
} from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  FAILURE_STATUSES,
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from '@/features/integrations/utils.public';
import type { VintedFeedbackOptions } from './useVintedQuickExportFeedback';
import {
  buildTrackedVintedFeedbackOptions,
  findTrackedVintedListing,
} from './useVintedQuickExportFeedback';
import type {
  PersistedVintedQuickListFeedback,
  VintedQuickListFeedbackStatus,
} from '@/features/integrations/utils/vintedQuickListFeedback';
import { toRecord } from '@/features/integrations/utils/vinted-listing-client-utils';

const listingBadgesQueryKey = QUERY_KEYS.integrations.productListingsBadges();

const BACKOFF_SCHEDULE_MS = [1000, 2000, 3000, 5000] as const;
const MAX_BACKOFF_MS = BACKOFF_SCHEDULE_MS[BACKOFF_SCHEDULE_MS.length - 1]!;

const getBackoffDelay = (attempt: number): number =>
  attempt < BACKOFF_SCHEDULE_MS.length
    ? BACKOFF_SCHEDULE_MS[attempt]!
    : MAX_BACKOFF_MS;

const setVintedBadgeStatus = (
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
  status: string
): void => {
  queryClient.setQueriesData<ListingBadgesPayload>(
    { queryKey: listingBadgesQueryKey },
    (current) => ({
      ...(current ?? {}),
      [productId]: {
        ...toRecord(current?.[productId]),
        vinted: status,
      },
    })
  );
};

export function useVintedQuickExportPolling(
  productId: string,
  localFeedback: PersistedVintedQuickListFeedback | null,
  setFeedbackStatus: (
    status: VintedQuickListFeedbackStatus | null,
    options?: VintedFeedbackOptions
  ) => void
): void {
  const queryClient = useQueryClient();
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!localFeedback) return;
    if (
      localFeedback.status !== 'processing' &&
      localFeedback.status !== 'queued'
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
    let polling = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    attemptRef.current = 0;

    const syncTrackedListing = async (): Promise<void> => {
      if (cancelled || polling) return;
      polling = true;

      try {
        const listings = await fetchQueryV2(queryClient, {
          queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
          queryFn: () => fetchProductListings(productId),
          staleTime: 0,
          logError: false,
          meta: {
            source: 'products.components.VintedQuickListButton.trackListing',
            operation: 'list',
            resource: 'integrations.product-listings',
            domain: 'integrations',
            tags: ['integrations', 'vinted', 'quick-list', 'tracking'],
            description:
              'Tracks the queued Vinted quick export listing until it resolves.',
          },
        })();

        if (cancelled || !Array.isArray(listings)) return;

        const trackedListing = findTrackedVintedListing(listings, localFeedback);
        if (!trackedListing) {
          scheduleNext();
          return;
        }

        const normalizedListingStatus = normalizeMarketplaceStatus(
          trackedListing.status ?? ''
        );
        const feedbackOptions = buildTrackedVintedFeedbackOptions(
          trackedListing,
          localFeedback
        );

        if (SUCCESS_STATUSES.has(normalizedListingStatus)) {
          setFeedbackStatus('completed', feedbackOptions);
          setVintedBadgeStatus(queryClient, productId, 'active');
          void invalidateProductListingsAndBadges(queryClient, productId);
          void invalidateProducts(queryClient);
          return;
        }

        if (
          normalizedListingStatus === 'auth_required' ||
          normalizedListingStatus === 'needs_login'
        ) {
          setFeedbackStatus('auth_required', feedbackOptions);
          setVintedBadgeStatus(queryClient, productId, 'auth_required');
          void invalidateProducts(queryClient);
          return;
        }

        if (FAILURE_STATUSES.has(normalizedListingStatus)) {
          setFeedbackStatus('failed', {
            ...feedbackOptions,
            failureReason: trackedListing.failureReason ?? localFeedback.failureReason ?? null,
          });
          setVintedBadgeStatus(
            queryClient,
            productId,
            normalizedListingStatus
          );
          void invalidateProducts(queryClient);
          return;
        }

        scheduleNext();
      } catch (error: unknown) {
        if (!cancelled) {
          if (isMissingProductListingsError(error)) {
            queryClient.removeQueries({
              queryKey: normalizeQueryKey(productListingsQueryKey(productId)),
            });
            setFeedbackStatus(null);
            return;
          }
          logClientCatch(error, {
            source: 'VintedQuickListButton',
            action: 'trackListing',
            productId,
            requestId: localFeedback.requestId ?? null,
            listingId: localFeedback.listingId ?? null,
            level: 'warn',
          });
          scheduleNext();
        }
      } finally {
        polling = false;
      }
    };

    const scheduleNext = (): void => {
      if (cancelled) return;
      const delay = getBackoffDelay(attemptRef.current);
      attemptRef.current += 1;
      timeoutId = setTimeout(() => {
        if (!cancelled) void syncTrackedListing();
      }, delay);
    };

    const handleVisibilityChange = (): void => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        attemptRef.current = 0;
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        void syncTrackedListing();
      } else if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    void syncTrackedListing();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [localFeedback, productId, queryClient, setFeedbackStatus]);
}
