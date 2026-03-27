'use client';

import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type {
  KangurGameContentSet,
  KangurGameContentSetId,
} from '@/shared/contracts/kangur-game-instances';
import {
  kangurGameContentSetsSchema,
} from '@/shared/contracts/kangur-game-instances';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import type { KangurGameId } from '@/shared/contracts/kangur-games';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type KangurGameContentSetsQueryOptions = {
  contentSetId?: KangurGameContentSetId;
  enabled?: boolean;
  gameId?: KangurGameId;
};

type KangurGameContentSetsReplacePayload = {
  contentSets: KangurGameContentSet[];
  gameId: KangurGameId;
};

const fetchGameContentSets = async (
  options?: KangurGameContentSetsQueryOptions
): Promise<KangurGameContentSet[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameContentSets',
      action: 'fetch-content-sets',
      description: 'Loads persisted Kangur launchable game content sets from the API.',
      context: {
        contentSetId: options?.contentSetId ?? null,
        gameId: options?.gameId ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | undefined> = {
        contentSetId: options?.contentSetId,
        gameId: options?.gameId,
      };

      const payload = await api.get<KangurGameContentSet[]>('/api/kangur/game-content-sets', {
        params,
      });

      return kangurGameContentSetsSchema.parse(payload);
    },
    {
      fallback: () => [],
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

export const useKangurGameContentSets = (
  options?: KangurGameContentSetsQueryOptions
): ListQuery<KangurGameContentSet, KangurGameContentSet[]> =>
  createListQueryV2<KangurGameContentSet, KangurGameContentSet[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameContentSets(),
      {
        contentSetId: options?.contentSetId ?? null,
        gameId: options?.gameId ?? null,
      },
    ],
    queryFn: async (): Promise<KangurGameContentSet[]> => await fetchGameContentSets(options),
    enabled: options?.enabled ?? true,
    placeholderData: () => [],
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameContentSets',
      operation: 'list',
      resource: 'kangur.game-content-sets',
      domain: 'kangur',
      tags: ['kangur', 'game-content-sets'],
      description: 'Loads persisted Kangur launchable game content sets.',
    },
  });

const invalidateGameContentSets = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.gameContentSets() });
};

export const useReplaceKangurGameContentSets = (): MutationResult<
  KangurGameContentSet[],
  KangurGameContentSetsReplacePayload
> =>
  createUpdateMutationV2<KangurGameContentSet[], KangurGameContentSetsReplacePayload>({
    mutationKey: [...QUERY_KEYS.kangur.gameContentSets(), 'update'],
    mutationFn: async (
      input: KangurGameContentSetsReplacePayload
    ): Promise<KangurGameContentSet[]> =>
      await api.post<KangurGameContentSet[]>('/api/kangur/game-content-sets', input),
    invalidate: invalidateGameContentSets,
    meta: {
      source: 'kangur.hooks.useReplaceKangurGameContentSets',
      operation: 'update',
      resource: 'kangur.game-content-sets',
      domain: 'kangur',
      tags: ['kangur', 'game-content-sets', 'update'],
      description: 'Replaces persisted Kangur launchable game content sets for one game.',
    },
  });
