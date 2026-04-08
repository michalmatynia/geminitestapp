import { z } from 'zod';

import { productParameterSchema, type ProductParameter } from '@/shared/contracts/products/parameters';
import {
  traderaParameterMapperCatalogFetchResponseSchema,
  type TraderaParameterMapperCatalogFetchRequest,
  type TraderaParameterMapperCatalogFetchResponse,
} from '@/shared/contracts/integrations/tradera-parameter-mapper';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useTraderaParameterMapperParameters(
  catalogId?: string | null
): ListQuery<ProductParameter> {
  const normalizedCatalogId = catalogId?.trim() ?? '';
  const queryKey = [
    ...QUERY_KEYS.products.lists(),
    'parameters',
    { catalogId: normalizedCatalogId || null },
  ] as const;

  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductParameter[]> => {
      if (!normalizedCatalogId) {
        return [];
      }

      const data = await api.get<ProductParameter[]>(
        `/api/v2/products/parameters?catalogId=${encodeURIComponent(normalizedCatalogId)}`
      );
      return z.array(productParameterSchema).parse(data);
    },
    enabled: Boolean(normalizedCatalogId),
    meta: {
      source: 'integrations.hooks.useTraderaParameterMapperParameters',
      operation: 'list',
      resource: 'products.parameters',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'tradera', 'parameters'],
      description: 'Loads product parameters for the Tradera parameter mapper.',
    },
  });
}

export function useFetchTraderaParameterMapperCatalogMutation() {
  return createMutationV2<
    TraderaParameterMapperCatalogFetchResponse,
    TraderaParameterMapperCatalogFetchRequest
  >({
    mutationKey: QUERY_KEYS.integrations.marketplace.mutation('tradera-parameter-mapper-fetch'),
    mutationFn: async (
      payload: TraderaParameterMapperCatalogFetchRequest
    ): Promise<TraderaParameterMapperCatalogFetchResponse> => {
      const data = await api.post<TraderaParameterMapperCatalogFetchResponse>(
        '/api/v2/integrations/tradera/parameter-mapper/catalog/fetch',
        payload,
        {
          timeout: 120_000,
        }
      );
      return traderaParameterMapperCatalogFetchResponseSchema.parse(data);
    },
    meta: {
      source: 'integrations.hooks.useFetchTraderaParameterMapperCatalogMutation',
      operation: 'action',
      resource: 'integrations.tradera.parameter-mapper.catalog.fetch',
      domain: 'integrations',
      tags: ['integrations', 'tradera', 'parameter-mapper', 'catalog-fetch'],
      description: 'Fetches category-specific Tradera dropdown catalogs.',
    },
  });
}
