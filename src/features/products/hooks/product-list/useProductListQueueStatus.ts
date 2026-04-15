'use client';

// useProductListQueueStatus: tracks background queue statuses related to
// product workflows (AI paths, image studio, integrations). Exposes helpers
// to surface queue health at the product-list level and invalidates caches
// when queue-driven work completes. Runs on client runtime to integrate with
// UI state and avoids heavy server-side imports.

// useProductListQueueStatus: watches a set of queued product IDs and
// triggers per-row completion highlights when items are removed from the
// queue and remain visible. Keeps previous-set tracking local and inexpensive.

import { useEffect, useRef } from 'react';

export function useProductListQueueStatus({
  queuedProductIds,
  visibleProductIdSet,
  triggerJobCompletionHighlight,
}: {
  queuedProductIds: Set<string>;
  visibleProductIdSet: Set<string>;
  triggerJobCompletionHighlight: (productId: string) => void;
}) {
  const previousQueuedProductIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const previousQueuedProductIds = previousQueuedProductIdsRef.current;
    if (previousQueuedProductIds) {
      previousQueuedProductIds.forEach((productId: string) => {
        if (!queuedProductIds.has(productId) && visibleProductIdSet.has(productId)) {
          triggerJobCompletionHighlight(productId);
        }
      });
    }
    previousQueuedProductIdsRef.current = new Set(queuedProductIds);
  }, [queuedProductIds, triggerJobCompletionHighlight, visibleProductIdSet]);
}
