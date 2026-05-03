'use client';

import type { QueryClient } from '@tanstack/react-query';

import {
  markParsedTraderaMatchesClosed,
  matchProductParseActions,
} from '@/features/products/api/products';
import type { ListingBadgesPayload } from '@/shared/contracts/integrations/listings';
import type {
  ProductParseActionsMarkTraderaClosedRequest,
  ProductParseActionsMarkTraderaClosedResponse,
  ProductParseActionsMatchRequest,
  ProductParseActionsMatchResponse,
} from '@/shared/contracts/products';
import type { UpdateMutation } from '@/shared/contracts/ui/queries';
import { createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { invalidateProductsAndCounts } from './productCache';

const setClosedTraderaBadges = (
  queryClient: QueryClient,
  productIds: readonly string[]
): void => {
  if (productIds.length === 0) return;
  const closedProductIds = new Set(productIds);
  queryClient.setQueriesData<ListingBadgesPayload>(
    { queryKey: QUERY_KEYS.integrations.productListingsBadges() },
    (current) => {
      if (!current) return current;
      let changed = false;
      const next: ListingBadgesPayload = { ...current };

      for (const productId of closedProductIds) {
        const currentEntry = current[productId];
        if (currentEntry === undefined || currentEntry.tradera === 'closed') continue;
        next[productId] = { ...currentEntry, tradera: 'closed' };
        changed = true;
      }

      return changed ? next : current;
    }
  );
};

export function useMatchProductParseActions(): UpdateMutation<
  ProductParseActionsMatchResponse,
  ProductParseActionsMatchRequest
> {
  return createUpdateMutationV2({
    mutationFn: async (
      request: ProductParseActionsMatchRequest
    ): Promise<ProductParseActionsMatchResponse> => matchProductParseActions(request),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useMatchProductParseActions',
      operation: 'update',
      resource: 'products.parse-actions.match',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'parse-actions', 'match'],
      description: 'Parses pasted marketplace action text and matches products.',
    },
  });
}

export function useMarkParsedTraderaMatchesClosed(): UpdateMutation<
  ProductParseActionsMarkTraderaClosedResponse,
  ProductParseActionsMarkTraderaClosedRequest
> {
  return createUpdateMutationV2({
    mutationFn: async (
      request: ProductParseActionsMarkTraderaClosedRequest
    ): Promise<ProductParseActionsMarkTraderaClosedResponse> =>
      markParsedTraderaMatchesClosed(request),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useMarkParsedTraderaMatchesClosed',
      operation: 'update',
      resource: 'products.parse-actions.tradera.mark-closed',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'parse-actions', 'tradera', 'closed'],
      description: 'Marks matched Tradera listings closed from pasted action text.',
    },
    invalidate: async (queryClient, response, request) => {
      const closedProductIds = new Set(
        response.results
          .filter((result) => result.status === 'updated' || result.status === 'skipped')
          .map((result) => result.productId)
      );
      const productIds = Array.from(new Set(request.matches.map((match) => match.productId)));
      setClosedTraderaBadges(queryClient, Array.from(closedProductIds));
      await Promise.all([
        invalidateProductsAndCounts(queryClient),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.details(),
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.integrations.productListingsBadges(),
        }),
        ...productIds.map((productId: string) =>
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.integrations.listings(productId),
          })
        ),
      ]);
    },
  });
}
