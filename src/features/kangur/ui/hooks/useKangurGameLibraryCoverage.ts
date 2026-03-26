'use client';

import {
  createKangurGameCatalogEntries,
  createKangurGameLibraryCoverage,
  type KangurGameLibraryCoverage,
} from '@/features/kangur/games';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { kangurGameLibraryCoverageSchema } from '@/shared/contracts/kangur-games';

type GameLibraryCoverageQueryOptions = {
  enabled?: boolean;
};

const buildGameLibraryCoverageFallback = (): KangurGameLibraryCoverage =>
  createKangurGameLibraryCoverage(createKangurGameCatalogEntries());

const fetchGameLibraryCoverage = async (): Promise<KangurGameLibraryCoverage> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameLibraryCoverage',
      action: 'fetch-game-library-coverage',
      description: 'Loads Kangur game library coverage groups from the API.',
    }),
    async () => {
      const payload = await api.get<KangurGameLibraryCoverage>(
        '/api/kangur/game-library-coverage'
      );
      return kangurGameLibraryCoverageSchema.parse(payload);
    },
    {
      fallback: buildGameLibraryCoverageFallback,
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameLibraryCoverage = (
  options?: GameLibraryCoverageQueryOptions
): ListQuery<KangurGameLibraryCoverage, KangurGameLibraryCoverage> =>
  createListQueryV2<KangurGameLibraryCoverage, KangurGameLibraryCoverage>({
    queryKey: QUERY_KEYS.kangur.gameLibraryCoverage(),
    queryFn: fetchGameLibraryCoverage,
    placeholderData: buildGameLibraryCoverageFallback,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameLibraryCoverage',
      operation: 'list',
      resource: 'kangur.game-library-coverage',
      domain: 'kangur',
      tags: ['kangur', 'games', 'coverage'],
      description: 'Loads shared lesson coverage groups for the Kangur games library.',
    },
  });

export type {
  GameLibraryCoverageQueryOptions as UseKangurGameLibraryCoverageOptions,
  KangurGameLibraryCoverage,
};
