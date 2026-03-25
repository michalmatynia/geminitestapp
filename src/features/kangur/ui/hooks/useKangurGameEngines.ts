'use client';

import {
  createDefaultKangurGameEngines,
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
  kangurGameEnginesSchema,
  type KangurGameEngineDefinition,
  type KangurGameMechanic,
  type KangurGameStatus,
  type KangurGameSurface,
} from '@/shared/contracts/kangur-games';

type GameEnginesQueryOptions = {
  status?: KangurGameStatus;
  surface?: KangurGameSurface;
  mechanic?: KangurGameMechanic;
  enabled?: boolean;
};

const filterEngines = (
  engines: KangurGameEngineDefinition[],
  options?: GameEnginesQueryOptions
): KangurGameEngineDefinition[] => {
  let next = engines;
  const status = options?.status;
  const surface = options?.surface;
  const mechanic = options?.mechanic;

  if (status) {
    next = next.filter((engine) => engine.status === status);
  }

  if (surface) {
    next = next.filter((engine) => engine.surfaces.includes(surface));
  }

  if (mechanic) {
    next = next.filter((engine) => engine.mechanics.includes(mechanic));
  }

  return next;
};

const buildGameEnginesFallback = (
  options?: GameEnginesQueryOptions
): KangurGameEngineDefinition[] => filterEngines(createDefaultKangurGameEngines(), options);

const fetchGameEngines = async (
  options?: GameEnginesQueryOptions
): Promise<KangurGameEngineDefinition[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameEngines',
      action: 'fetch-game-engines',
      description: 'Loads Kangur game engines from the API.',
      context: {
        status: options?.status ?? null,
        surface: options?.surface ?? null,
        mechanic: options?.mechanic ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | undefined> = {
        status: options?.status,
        surface: options?.surface,
        mechanic: options?.mechanic,
      };
      const payload = await api.get<KangurGameEngineDefinition[]>('/api/kangur/game-engines', {
        params,
      });
      return kangurGameEnginesSchema.parse(payload);
    },
    {
      fallback: () => buildGameEnginesFallback(options),
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameEngines = (
  options?: GameEnginesQueryOptions
): ListQuery<KangurGameEngineDefinition, KangurGameEngineDefinition[]> =>
  createListQueryV2<KangurGameEngineDefinition, KangurGameEngineDefinition[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameEngines(),
      {
        status: options?.status ?? null,
        surface: options?.surface ?? null,
        mechanic: options?.mechanic ?? null,
      },
    ],
    queryFn: async (): Promise<KangurGameEngineDefinition[]> => await fetchGameEngines(options),
    select: (engines) => filterEngines(engines, options),
    placeholderData: () => buildGameEnginesFallback(options),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameEngines',
      operation: 'list',
      resource: 'kangur.game-engines',
      domain: 'kangur',
      tags: ['kangur', 'games', 'engines'],
      description: 'Loads Kangur game engines from the registry-backed API.',
    },
  });
