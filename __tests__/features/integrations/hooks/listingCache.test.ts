import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  aiPathsJobQueueQueryKey,
  aiPathsQueueStatusQueryKey,
  cancelProductListingsAndJobs,
  getProductListingsQueryKey,
  integrationJobsQueryKey,
  invalidateListingRuntimeQueues,
  invalidateProductListingsAndBadges,
  listingBadgesQueryKey,
} from '@/features/integrations/hooks/listingCache';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

describe('listingCache helpers', () => {
  const invalidateQueries = vi.fn().mockResolvedValue(undefined);
  const cancelQueries = vi.fn().mockResolvedValue(undefined);

  const queryClient = {
    invalidateQueries,
    cancelQueries,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses normalized ai-paths queue keys', () => {
    expect(aiPathsJobQueueQueryKey).toEqual(QUERY_KEYS.ai.aiPaths.jobQueue({}));
    expect(aiPathsQueueStatusQueryKey).toEqual(QUERY_KEYS.ai.aiPaths.queueStatus());
  });

  it('invalidates listings and badges keys for a product', () => {
    void invalidateProductListingsAndBadges(queryClient as never, 'prod-1');

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: getProductListingsQueryKey('prod-1'),
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: listingBadgesQueryKey,
    });
  });

  it('invalidates runtime queue keys', () => {
    void invalidateListingRuntimeQueues(queryClient as never);

    expect(invalidateQueries).toHaveBeenCalledTimes(3);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: integrationJobsQueryKey,
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: [...QUERY_KEYS.ai.aiPaths.lists(), 'job-queue'],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: [...QUERY_KEYS.ai.aiPaths.all, 'queue-status'],
    });
  });

  it('cancels listings and integration jobs queries for a product', async () => {
    await cancelProductListingsAndJobs(queryClient as never, 'prod-1');

    expect(cancelQueries).toHaveBeenCalledTimes(2);
    expect(cancelQueries).toHaveBeenNthCalledWith(1, {
      queryKey: getProductListingsQueryKey('prod-1'),
    });
    expect(cancelQueries).toHaveBeenNthCalledWith(2, {
      queryKey: integrationJobsQueryKey,
    });
  });
});
