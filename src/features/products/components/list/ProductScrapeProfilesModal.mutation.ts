'use client';

import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type {
  ProductScrapeProfileRunLaunchResponse,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import {
  invalidateListingBadges,
  invalidateProductsAndCounts,
} from '@/shared/lib/query-invalidation';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildLaunchToastMessage,
  buildToastMessage,
  isQueuedScrapeProfileRun,
  launchResultVariant,
  refreshProductListQueriesFresh,
  resultVariant,
  runScrapeProfile,
} from './ProductScrapeProfilesModal.controller.helpers';

export const useRunScrapeProfileMutation = (
  setQueuedRun: (queuedRun: ProductScrapeProfileRunQueuedResponse | null) => void,
  setResult: (result: ProductScrapeProfileRunResponse | null) => void,
  onRunQueued?: (queuedRun: ProductScrapeProfileRunQueuedResponse) => void
): UseMutationResult<
  ProductScrapeProfileRunLaunchResponse,
  Error,
  ProductScrapeProfileRunRequest
> => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutationV2<ProductScrapeProfileRunLaunchResponse, ProductScrapeProfileRunRequest>({
    mutationFn: runScrapeProfile,
    meta: {
      source: 'products.components.ProductScrapeProfilesModal.runScrapeProfile',
      operation: 'create',
      resource: 'products.scrape-profiles.run',
      domain: 'products',
      tags: ['products', 'scrape-profiles', 'run'],
      description: 'Runs a product scrape profile.',
    },
    onSuccess: async (response) => {
      if (isQueuedScrapeProfileRun(response)) {
        setResult(null);
        setQueuedRun(response);
        onRunQueued?.(response);
        toast(buildLaunchToastMessage(response), { variant: launchResultVariant(response) });
        return;
      }
      setQueuedRun(null);
      setResult(response);
      if (!response.dryRun) {
        await invalidateProductsAndCounts(queryClient);
        await Promise.all([
          refreshProductListQueriesFresh(queryClient),
          invalidateListingBadges(queryClient),
        ]);
      }
      toast(buildToastMessage(response), { variant: resultVariant(response) });
    },
    onError: (error) => {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to run scrape profile.', {
        variant: 'error',
      });
    },
  });
};
