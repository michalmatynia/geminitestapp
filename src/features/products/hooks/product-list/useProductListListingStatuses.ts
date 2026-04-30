'use client';

// useProductListListingStatuses: detects listing lifecycle transitions by
// observing listing-related statuses (in-flight → terminal). Exposes maps and
// helpers to surface row badges when a product's listing changes state and to
// trigger UI highlights or to invalidate caches for completed listings.

// useProductListListingStatuses: watches badge status maps for visible rows and
// detects transitions from 'in-flight' -> 'completed'. When such transitions are
// observed for visible products, triggers a UI highlight via
// triggerJobCompletionHighlight to provide visual feedback for background
// operations (listing, AI runs, scans). Keeps previous-state tracking local and
// inexpensive.
import { useEffect, useMemo, useRef } from 'react';

import {
  LISTING_COMPLETED_STATUSES,
  LISTING_IN_FLIGHT_STATUSES,
  normalizeListingStatus,
} from '@/features/products/hooks/product-list-state-utils';
import type { ProductWithImages } from '@/shared/contracts/products/product';

type ProductListListingStatusesResult = {
  visibleListingBadgeStatuses: Map<string, string>;
};

type UseProductListListingStatusesInput = {
  data: ProductWithImages[];
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeStatuses: Map<string, string>;
  playwrightProgrammableBadgeStatuses: Map<string, string>;
  vintedBadgeStatuses: Map<string, string>;
  scrapedSourceBadgeStatuses: Map<string, string>;
  visibleProductIdSet: Set<string>;
  triggerJobCompletionHighlight: (productId: string) => void;
};

const setNormalizedListingStatus = (
  statuses: Map<string, string>,
  productId: string,
  source: string,
  status: string | undefined
): void => {
  const normalizedStatus = normalizeListingStatus(status);
  if (normalizedStatus.length > 0) {
    statuses.set(`${productId}:${source}`, normalizedStatus);
  }
};

const collectCompletedProductIds = ({
  previousStatuses,
  visibleListingBadgeStatuses,
  visibleProductIdSet,
}: {
  previousStatuses: Map<string, string>;
  visibleListingBadgeStatuses: Map<string, string>;
  visibleProductIdSet: Set<string>;
}): Set<string> => {
  const completedProductIds = new Set<string>();
  previousStatuses.forEach((previousStatus: string, key: string) => {
    if (!LISTING_IN_FLIGHT_STATUSES.has(previousStatus)) return;

    const currentStatus = visibleListingBadgeStatuses.get(key);
    if (currentStatus === undefined || !LISTING_COMPLETED_STATUSES.has(currentStatus)) return;

    const productId = key.split(':')[0];
    if (productId === undefined || productId.length === 0 || !visibleProductIdSet.has(productId)) return;
    completedProductIds.add(productId);
  });
  return completedProductIds;
};

export function useProductListListingStatuses({
  data,
  integrationBadgeStatuses,
  traderaBadgeStatuses,
  playwrightProgrammableBadgeStatuses,
  vintedBadgeStatuses,
  scrapedSourceBadgeStatuses,
  visibleProductIdSet,
  triggerJobCompletionHighlight,
}: UseProductListListingStatusesInput): ProductListListingStatusesResult {
  const previousListingBadgeStatusesRef = useRef<Map<string, string> | null>(null);

  const visibleListingBadgeStatuses = useMemo(() => {
    const statuses = new Map<string, string>();
    for (const product of data) {
      setNormalizedListingStatus(statuses, product.id, 'base', integrationBadgeStatuses.get(product.id));
      setNormalizedListingStatus(statuses, product.id, 'tradera', traderaBadgeStatuses.get(product.id));
      setNormalizedListingStatus(
        statuses,
        product.id,
        'playwright-programmable',
        playwrightProgrammableBadgeStatuses.get(product.id)
      );
      setNormalizedListingStatus(statuses, product.id, 'vinted', vintedBadgeStatuses.get(product.id));
      setNormalizedListingStatus(
        statuses,
        product.id,
        'scraped-source',
        scrapedSourceBadgeStatuses.get(product.id)
      );
    }
    return statuses;
  }, [
    data,
    integrationBadgeStatuses,
    playwrightProgrammableBadgeStatuses,
    scrapedSourceBadgeStatuses,
    traderaBadgeStatuses,
    vintedBadgeStatuses,
  ]);

  useEffect(() => {
    const previousStatuses = previousListingBadgeStatusesRef.current;
    if (previousStatuses !== null) {
      const completedProductIds = collectCompletedProductIds({
        previousStatuses,
        visibleListingBadgeStatuses,
        visibleProductIdSet,
      });
      completedProductIds.forEach((productId: string) => {
        triggerJobCompletionHighlight(productId);
      });
    }

    previousListingBadgeStatusesRef.current = new Map(visibleListingBadgeStatuses);
  }, [triggerJobCompletionHighlight, visibleListingBadgeStatuses, visibleProductIdSet]);

  return {
    visibleListingBadgeStatuses,
  };
}
