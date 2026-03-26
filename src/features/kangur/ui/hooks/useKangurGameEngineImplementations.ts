'use client';

import {
  createDefaultKangurGameEngineImplementations,
  filterKangurGameEngineImplementations,
  type KangurGameEngineImplementationFilter,
} from '@/features/kangur/games';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type { ListQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  kangurGameEngineImplementationsSchema,
  type KangurGameEngineId,
  type KangurGameEngineImplementation,
  type KangurGameEngineImplementationOwnership,
} from '@/shared/contracts/kangur-games';

type GameEngineImplementationsQueryOptions = KangurGameEngineImplementationFilter & {
  enabled?: boolean;
};

const buildGameEngineImplementationsFallback = (
  options?: GameEngineImplementationsQueryOptions
): KangurGameEngineImplementation[] =>
  filterKangurGameEngineImplementations(
    createDefaultKangurGameEngineImplementations(),
    options
  );

const fetchGameEngineImplementations = async (
  options?: GameEngineImplementationsQueryOptions
): Promise<KangurGameEngineImplementation[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameEngineImplementations',
      action: 'fetch-game-engine-implementations',
      description: 'Loads Kangur game engine implementation ownership from the API.',
      context: {
        engineId: options?.engineId ?? null,
        ownership: options?.ownership ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | undefined> = {
        engineId: options?.engineId,
        ownership: options?.ownership,
      };
      const payload = await api.get<KangurGameEngineImplementation[]>(
        '/api/kangur/game-engine-implementations',
        {
          params,
        }
      );
      return kangurGameEngineImplementationsSchema.parse(payload);
    },
    {
      fallback: () => buildGameEngineImplementationsFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameEngineImplementations = (
  options?: GameEngineImplementationsQueryOptions
): ListQuery<KangurGameEngineImplementation, KangurGameEngineImplementation[]> =>
  createListQueryV2<KangurGameEngineImplementation, KangurGameEngineImplementation[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameEngineImplementations(),
      {
        engineId: options?.engineId ?? null,
        ownership: options?.ownership ?? null,
      },
    ],
    queryFn: async (): Promise<KangurGameEngineImplementation[]> =>
      await fetchGameEngineImplementations(options),
    select: (implementations) => filterKangurGameEngineImplementations(implementations, options),
    placeholderData: () => buildGameEngineImplementationsFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameEngineImplementations',
      operation: 'list',
      resource: 'kangur.game-engine-implementations',
      domain: 'kangur',
      tags: ['kangur', 'games', 'engines', 'implementations'],
      description: 'Loads Kangur game engine implementation ownership metadata.',
    },
  });

export type {
  GameEngineImplementationsQueryOptions as UseKangurGameEngineImplementationsOptions,
  KangurGameEngineImplementation,
  KangurGameEngineImplementationFilter,
  KangurGameEngineId,
  KangurGameEngineImplementationOwnership,
};
