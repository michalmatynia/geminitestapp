'use client';

import { useEffect } from 'react';

import {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  parseAiPathRunEnqueuedEventPayload,
} from '@/shared/contracts/ai-paths';
import {
  addQueuedProductId,
  removeQueuedProductId,
} from '@/features/products/state/queued-product-ops';

// Keep the badge visible longer than the last scheduled product refresh (9 s).
const AI_PATH_RUN_BADGE_TTL_MS = 30_000;

const resolveProductIdFromEvent = (event: Event): string | null => {
  const detail = (event as CustomEvent<unknown>).detail;
  const payload = parseAiPathRunEnqueuedEventPayload(detail);
  if (!payload) return null;
  if (payload.entityType !== 'product') return null;
  return payload.entityId;
};

/**
 * Listens for AI-Paths runs triggered on individual products and reflects their
 * in-progress state in the product list's "Queued" badge + completion highlight.
 *
 * The event is dispatched by useAiPathTriggerEvent (shared lib) via a CustomEvent
 * so the shared layer never imports from the products feature.
 */
export function useProductAiPathsRunSync(): void {
  useEffect(() => {
    const handler = (event: Event): void => {
      const productId = resolveProductIdFromEvent(event);
      if (!productId) return;
      addQueuedProductId(productId);
      setTimeout(() => {
        removeQueuedProductId(productId);
      }, AI_PATH_RUN_BADGE_TTL_MS);
    };
    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handler);
    return () => {
      window.removeEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handler);
    };
  }, []);
}
