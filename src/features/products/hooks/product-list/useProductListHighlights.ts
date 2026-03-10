'use client';

import { useCallback, useRef, useState } from 'react';

import { PRODUCT_ROW_HIGHLIGHT_TOTAL_MS } from '@/features/products/hooks/product-list-state-utils';

export function useProductListHighlights() {
  const [jobCompletionHighlights, setJobCompletionHighlights] = useState<Record<string, number>>(
    {}
  );
  const jobHighlightTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const triggerJobCompletionHighlight = useCallback((productId: string): void => {
    if (!productId) return;

    setJobCompletionHighlights((prev: Record<string, number>) => ({
      ...prev,
      [productId]: (prev[productId] ?? 0) + 1,
    }));

    const existingTimeout = jobHighlightTimeoutsRef.current.get(productId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      setJobCompletionHighlights((prev: Record<string, number>) => {
        if (!(productId in prev)) return prev;
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      jobHighlightTimeoutsRef.current.delete(productId);
    }, PRODUCT_ROW_HIGHLIGHT_TOTAL_MS);

    jobHighlightTimeoutsRef.current.set(productId, timeoutId);
  }, []);

  return {
    jobCompletionHighlights,
    triggerJobCompletionHighlight,
  };
}
