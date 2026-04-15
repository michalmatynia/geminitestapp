'use client';

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

export function useProductListListingStatuses({
  data,
  integrationBadgeStatuses,
  traderaBadgeStatuses,
  playwrightProgrammableBadgeStatuses,
  vintedBadgeStatuses,
  visibleProductIdSet,
  triggerJobCompletionHighlight,
}: {
  data: ProductWithImages[];
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeStatuses: Map<string, string>;
  playwrightProgrammableBadgeStatuses: Map<string, string>;
  vintedBadgeStatuses: Map<string, string>;
  visibleProductIdSet: Set<string>;
  triggerJobCompletionHighlight: (productId: string) => void;
}) {
  const previousListingBadgeStatusesRef = useRef<Map<string, string> | null>(null);

  const visibleListingBadgeStatuses = useMemo(() => {
    const statuses = new Map<string, string>();
    for (const product of data) {
      const baseStatus = normalizeListingStatus(integrationBadgeStatuses.get(product.id));
      if (baseStatus) {
        statuses.set(`${product.id}:base`, baseStatus);
      }
      const traderaStatus = normalizeListingStatus(traderaBadgeStatuses.get(product.id));
      if (traderaStatus) {
        statuses.set(`${product.id}:tradera`, traderaStatus);
      }
      const playwrightProgrammableStatus = normalizeListingStatus(
        playwrightProgrammableBadgeStatuses.get(product.id)
      );
      if (playwrightProgrammableStatus) {
        statuses.set(`${product.id}:playwright-programmable`, playwrightProgrammableStatus);
      }
      const vintedStatus = normalizeListingStatus(vintedBadgeStatuses.get(product.id));
      if (vintedStatus) {
        statuses.set(`${product.id}:vinted`, vintedStatus);
      }
    }
    return statuses;
  }, [data, integrationBadgeStatuses, playwrightProgrammableBadgeStatuses, traderaBadgeStatuses, vintedBadgeStatuses]);

  useEffect(() => {
    const previousStatuses = previousListingBadgeStatusesRef.current;
    if (previousStatuses) {
      const completedProductIds = new Set<string>();

      previousStatuses.forEach((previousStatus: string, key: string) => {
        if (!LISTING_IN_FLIGHT_STATUSES.has(previousStatus)) return;

        const currentStatus = visibleListingBadgeStatuses.get(key);
        if (!currentStatus || !LISTING_COMPLETED_STATUSES.has(currentStatus)) return;

        const productId = key.split(':')[0];
        if (!productId || !visibleProductIdSet.has(productId)) return;
        completedProductIds.add(productId);
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
