'use client';

import {
  markParsedTraderaMatchesClosed,
  matchProductParseActions,
} from '@/features/products/api/products';
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
    invalidate: async (queryClient, _response, request) => {
      const productIds = Array.from(new Set(request.matches.map((match) => match.productId)));
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
