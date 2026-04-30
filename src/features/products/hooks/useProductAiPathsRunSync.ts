'use client';
'use no memo';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { ProductAiRunFeedback } from '@/features/products/lib/product-ai-run-feedback';

import {
  EMPTY_PRODUCT_AI_RUN_STATUS_BY_PRODUCT_ID,
  type ProductAiRunStatusSetter,
} from './useProductAiPathsRunSync.model';
import { startProductAiPathsRunSync } from './useProductAiPathsRunSync.runtime';

const clearProductAiRunStatuses = (setStatus: ProductAiRunStatusSetter): void => {
  setStatus((prev) => (prev.size === 0 ? prev : EMPTY_PRODUCT_AI_RUN_STATUS_BY_PRODUCT_ID));
};

const noopProductAiPathsRunSyncCleanup = (): void => {};

/**
 * Listens for AI-Paths runs triggered on individual products and reflects their
 * in-progress state in the product list's run badge + completion highlight.
 */
export function useProductAiPathsRunSync({
  enabled = true,
}: {
  enabled?: boolean;
} = {}): ReadonlyMap<string, ProductAiRunFeedback> {
  const queryClient = useQueryClient();
  const [productAiRunStatusByProductId, setProductAiRunStatusByProductId] = useState<
    ReadonlyMap<string, ProductAiRunFeedback>
  >(() => EMPTY_PRODUCT_AI_RUN_STATUS_BY_PRODUCT_ID);

  useEffect(() => {
    if (!enabled) {
      clearProductAiRunStatuses(setProductAiRunStatusByProductId);
      return noopProductAiPathsRunSyncCleanup;
    }

    return startProductAiPathsRunSync({
      queryClient,
      setProductAiRunStatusByProductId,
    });
  }, [enabled, queryClient]);

  return productAiRunStatusByProductId;
}
