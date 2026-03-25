'use client';

import {
  createKangurGameCatalogEntries,
  getKangurGameCatalogFacets,
  type KangurGameCatalogFacets,
} from '@/features/kangur/games';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { kangurGameCatalogFacetsSchema } from '@/shared/contracts/kangur-games';

type GameCatalogFacetsQueryOptions = {
  enabled?: boolean;
};

const buildGameCatalogFacetsFallback = (): KangurGameCatalogFacets =>
  getKangurGameCatalogFacets(createKangurGameCatalogEntries());

const fetchGameCatalogFacets = async (): Promise<KangurGameCatalogFacets> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameCatalogFacets',
      action: 'fetch-game-catalog-facets',
      description: 'Loads Kangur game catalog classification facets from the API.',
    }),
    async () => {
      const payload = await api.get<KangurGameCatalogFacets>('/api/kangur/game-catalog-facets');
      return kangurGameCatalogFacetsSchema.parse(payload);
    },
    {
      fallback: buildGameCatalogFacetsFallback,
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameCatalogFacets = (
  options?: GameCatalogFacetsQueryOptions
): ListQuery<KangurGameCatalogFacets, KangurGameCatalogFacets> =>
  createListQueryV2<KangurGameCatalogFacets, KangurGameCatalogFacets>({
    queryKey: QUERY_KEYS.kangur.gameCatalogFacets(),
    queryFn: async (): Promise<KangurGameCatalogFacets> => await fetchGameCatalogFacets(),
    placeholderData: buildGameCatalogFacetsFallback,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameCatalogFacets',
      operation: 'list',
      resource: 'kangur.game-catalog-facets',
      domain: 'kangur',
      tags: ['kangur', 'games', 'catalog', 'facets'],
      description: 'Loads reusable Kangur game catalog classification facets.',
    },
  });
