/**
 * Compatibility layer for listing cache management.
 * Unified helpers are now defined in src/shared/lib/query-invalidation.ts
 */

export * from '@/shared/lib/query-invalidation';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';

export const listingBadgesQueryKey = QUERY_KEYS.integrations.productListingsBadges();
export const integrationJobsQueryKey = QUERY_KEYS.jobs.integrations();
export const aiPathsJobQueueQueryKey = QUERY_KEYS.ai.aiPaths.jobQueue({});
export const aiPathsQueueStatusQueryKey = QUERY_KEYS.ai.aiPaths.queueStatus();

export const getProductListingsQueryKey = (productId: string): readonly unknown[] =>
  QUERY_KEYS.integrations.listings(productId);

export const cancelProductListingsAndJobs = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: getProductListingsQueryKey(productId) }),
    queryClient.cancelQueries({ queryKey: integrationJobsQueryKey }),
  ]);
};
