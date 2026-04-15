'use client';

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
