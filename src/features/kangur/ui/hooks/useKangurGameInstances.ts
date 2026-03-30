import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import type {
  KangurGameInstance,
  KangurGameInstanceId,
  KangurGameInstancesReplacePayload,
} from '@/shared/contracts/kangur-game-instances';
import {
  kangurGameInstancesSchema,
} from '@/shared/contracts/kangur-game-instances';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import type { KangurGameId } from '@/shared/contracts/kangur-games';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

type KangurGameInstancesQueryOptions = {
  enabled?: boolean;
  enabledOnly?: boolean;
  gameId?: KangurGameId;
  instanceId?: KangurGameInstanceId;
};

const resolveGameInstancesQueryFilters = (
  options?: KangurGameInstancesQueryOptions
): {
  enabledOnly: boolean | null;
  gameId: KangurGameId | null;
  instanceId: KangurGameInstanceId | null;
} => ({
  enabledOnly: options?.enabledOnly ?? null,
  gameId: options?.gameId ?? null,
  instanceId: options?.instanceId ?? null,
});

const isGameInstancesQueryEnabled = (
  options?: KangurGameInstancesQueryOptions
): boolean => options?.enabled ?? true;

const fetchGameInstances = async (
  options?: KangurGameInstancesQueryOptions
): Promise<KangurGameInstance[]> =>
  await withKangurClientError(
    () => ({
      source: 'kangur.hooks.useKangurGameInstances',
      action: 'fetch-instances',
      description: 'Loads persisted Kangur launchable game instances from the API.',
      context: {
        enabledOnly: options?.enabledOnly ?? null,
        gameId: options?.gameId ?? null,
        instanceId: options?.instanceId ?? null,
      },
    }),
    async () => {
      const params: Record<string, string | boolean | undefined> = {
        enabledOnly: options?.enabledOnly,
        gameId: options?.gameId,
        instanceId: options?.instanceId,
      };

      const payload = await api.get<KangurGameInstance[]>('/api/kangur/game-instances', {
        params,
      });

      return kangurGameInstancesSchema.parse(payload);
    },
    {
      fallback: () => [],
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
    }
  );

const createKangurGameInstancesQuery = (
  options?: KangurGameInstancesQueryOptions
): ListQuery<KangurGameInstance, KangurGameInstance[]> =>
  createListQueryV2<KangurGameInstance, KangurGameInstance[]>({
    queryKey: [
      ...QUERY_KEYS.kangur.gameInstances(),
      resolveGameInstancesQueryFilters(options),
    ],
    queryFn: async (): Promise<KangurGameInstance[]> => await fetchGameInstances(options),
    enabled: isGameInstancesQueryEnabled(options),
    placeholderData: () => [],
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    meta: {
      source: 'kangur.hooks.useKangurGameInstances',
      operation: 'list',
      resource: 'kangur.game-instances',
      domain: 'kangur',
      tags: ['kangur', 'game-instances'],
      description: 'Loads persisted Kangur launchable game instances.',
    },
  });

export const useKangurGameInstances = (
  options?: KangurGameInstancesQueryOptions
): ListQuery<KangurGameInstance, KangurGameInstance[]> =>
  createKangurGameInstancesQuery(options);

const invalidateGameInstances = (queryClient: {
  invalidateQueries: (args: { queryKey: readonly unknown[] }) => void;
}): void => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kangur.gameInstances() });
};

export const useReplaceKangurGameInstances = (): MutationResult<
  KangurGameInstance[],
  KangurGameInstancesReplacePayload
> =>
  createUpdateMutationV2<KangurGameInstance[], KangurGameInstancesReplacePayload>({
    mutationKey: [...QUERY_KEYS.kangur.gameInstances(), 'update'],
    mutationFn: async (
      input: KangurGameInstancesReplacePayload
    ): Promise<KangurGameInstance[]> =>
      await api.post<KangurGameInstance[]>('/api/kangur/game-instances', input),
    invalidate: invalidateGameInstances,
    meta: {
      source: 'kangur.hooks.useReplaceKangurGameInstances',
      operation: 'update',
      resource: 'kangur.game-instances',
      domain: 'kangur',
      tags: ['kangur', 'game-instances', 'update'],
      description: 'Replaces persisted Kangur launchable game instances for one game.',
    },
  });
