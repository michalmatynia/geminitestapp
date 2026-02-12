'use client';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';


export const listingBadgesQueryKey = QUERY_KEYS.integrations.productListingsBadges();
export const integrationJobsQueryKey = QUERY_KEYS.jobs.integrations();
export const aiPathsJobQueueQueryKey = QUERY_KEYS.ai.aiPaths.jobQueue();
export const aiPathsQueueStatusQueryKey = QUERY_KEYS.ai.aiPaths.queueStatus();

export const getProductListingsQueryKey = (productId: string): readonly unknown[] =>
  QUERY_KEYS.integrations.listings(productId);

const invalidateByKey = (queryClient: QueryClient, queryKey: readonly unknown[]): void => {
  void queryClient.invalidateQueries({ queryKey });
};

export const invalidateProductListingsAndBadges = (
  queryClient: QueryClient,
  productId: string
): void => {
  invalidateByKey(queryClient, getProductListingsQueryKey(productId));
  invalidateByKey(queryClient, listingBadgesQueryKey);
};

export const invalidateListingRuntimeQueues = (queryClient: QueryClient): void => {
  invalidateByKey(queryClient, integrationJobsQueryKey);
  invalidateByKey(queryClient, aiPathsJobQueueQueryKey);
  invalidateByKey(queryClient, aiPathsQueueStatusQueryKey);
};

export const invalidateListingsBadgesAndQueues = (
  queryClient: QueryClient,
  productId: string
): void => {
  invalidateProductListingsAndBadges(queryClient, productId);
  invalidateListingRuntimeQueues(queryClient);
};

export const cancelProductListingsAndJobs = async (
  queryClient: QueryClient,
  productId: string
): Promise<void> => {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: getProductListingsQueryKey(productId) }),
    queryClient.cancelQueries({ queryKey: integrationJobsQueryKey }),
  ]);
};
