import {
  type TraderaSelectorRegistryDeleteRequest,
  type TraderaSelectorRegistryDeleteResponse,
  traderaSelectorRegistryDeleteResponseSchema,
  type TraderaSelectorRegistryListResponse,
  traderaSelectorRegistryListResponseSchema,
  type TraderaSelectorRegistryProfileActionRequest,
  type TraderaSelectorRegistryProfileActionResponse,
  traderaSelectorRegistryProfileActionResponseSchema,
  type TraderaSelectorRegistrySaveRequest,
  type TraderaSelectorRegistrySaveResponse,
  traderaSelectorRegistrySaveResponseSchema,
  type TraderaSelectorRegistrySyncRequest,
  type TraderaSelectorRegistrySyncResponse,
  traderaSelectorRegistrySyncResponseSchema,
} from '@/shared/contracts/integrations/tradera-selector-registry';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';

export {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  TRADERA_SETTINGS_KEYS,
} from '@/features/integrations/constants/tradera';

export const TRADERA_SELECTOR_REGISTRY_QUERY_KEY = [
  'integrations',
  'tradera',
  'selector-registry',
] as const;

export function useTraderaSelectorRegistry(options?: {
  profile?: string | null;
}): ListQuery<
  TraderaSelectorRegistryListResponse,
  TraderaSelectorRegistryListResponse
> {
  const normalizedProfile = options?.profile?.trim() ?? '';
  const queryKey =
    normalizedProfile.length > 0
      ? [...TRADERA_SELECTOR_REGISTRY_QUERY_KEY, { profile: normalizedProfile }]
      : TRADERA_SELECTOR_REGISTRY_QUERY_KEY;

  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<TraderaSelectorRegistryListResponse> => {
      const data = await api.get<TraderaSelectorRegistryListResponse>(
        '/api/v2/integrations/tradera/selectors',
        normalizedProfile.length > 0 ? { params: { profile: normalizedProfile } } : undefined
      );
      return traderaSelectorRegistryListResponseSchema.parse(data);
    },
    meta: {
      source: 'integrations.hooks.useTraderaSelectorRegistry',
      operation: 'list',
      resource: 'integrations.tradera.selector-registry',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'tradera', 'selector-registry'],
      description: 'Loads the Tradera selector registry stored in Mongo.',
    },
  });
}

export function useSyncTraderaSelectorRegistryMutation(): MutationResult<
  TraderaSelectorRegistrySyncResponse,
  TraderaSelectorRegistrySyncRequest
> {
  return createMutationV2<
    TraderaSelectorRegistrySyncResponse,
    TraderaSelectorRegistrySyncRequest
  >({
    mutationKey: [...TRADERA_SELECTOR_REGISTRY_QUERY_KEY, 'sync'],
    mutationFn: async (
      payload: TraderaSelectorRegistrySyncRequest
    ): Promise<TraderaSelectorRegistrySyncResponse> => {
      const data = await api.post<TraderaSelectorRegistrySyncResponse>(
        '/api/v2/integrations/tradera/selectors',
        payload
      );
      return traderaSelectorRegistrySyncResponseSchema.parse(data);
    },
    invalidateKeys: [TRADERA_SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useSyncTraderaSelectorRegistryMutation',
      operation: 'action',
      resource: 'integrations.tradera.selector-registry.sync',
      domain: 'integrations',
      tags: ['integrations', 'tradera', 'selector-registry', 'sync'],
      description: 'Syncs the Tradera selector registry from code into Mongo.',
    },
  });
}

export function useSaveTraderaSelectorRegistryEntryMutation(): MutationResult<
  TraderaSelectorRegistrySaveResponse,
  TraderaSelectorRegistrySaveRequest
> {
  return createMutationV2<
    TraderaSelectorRegistrySaveResponse,
    TraderaSelectorRegistrySaveRequest
  >({
    mutationKey: [...TRADERA_SELECTOR_REGISTRY_QUERY_KEY, 'save'],
    mutationFn: async (
      payload: TraderaSelectorRegistrySaveRequest
    ): Promise<TraderaSelectorRegistrySaveResponse> => {
      const data = await api.put<TraderaSelectorRegistrySaveResponse>(
        '/api/v2/integrations/tradera/selectors',
        payload
      );
      return traderaSelectorRegistrySaveResponseSchema.parse(data);
    },
    invalidateKeys: [TRADERA_SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useSaveTraderaSelectorRegistryEntryMutation',
      operation: 'update',
      resource: 'integrations.tradera.selector-registry.entry',
      domain: 'integrations',
      tags: ['integrations', 'tradera', 'selector-registry', 'save'],
      description: 'Creates or updates a Tradera selector registry entry in Mongo.',
    },
  });
}

export function useDeleteTraderaSelectorRegistryEntryMutation(): MutationResult<
  TraderaSelectorRegistryDeleteResponse,
  TraderaSelectorRegistryDeleteRequest
> {
  return createDeleteMutationV2<
    TraderaSelectorRegistryDeleteResponse,
    TraderaSelectorRegistryDeleteRequest
  >({
    mutationKey: [...TRADERA_SELECTOR_REGISTRY_QUERY_KEY, 'delete'],
    mutationFn: async (
      payload: TraderaSelectorRegistryDeleteRequest
    ): Promise<TraderaSelectorRegistryDeleteResponse> => {
      const data = await api.delete<TraderaSelectorRegistryDeleteResponse>(
        '/api/v2/integrations/tradera/selectors',
        { body: JSON.stringify(payload) }
      );
      return traderaSelectorRegistryDeleteResponseSchema.parse(data);
    },
    invalidateKeys: [TRADERA_SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useDeleteTraderaSelectorRegistryEntryMutation',
      operation: 'delete',
      resource: 'integrations.tradera.selector-registry.entry',
      domain: 'integrations',
      tags: ['integrations', 'tradera', 'selector-registry', 'delete'],
      description: 'Deletes a Tradera selector profile override from Mongo.',
    },
  });
}

export function useMutateTraderaSelectorRegistryProfileMutation(): MutationResult<
  TraderaSelectorRegistryProfileActionResponse,
  TraderaSelectorRegistryProfileActionRequest
> {
  return createMutationV2<
    TraderaSelectorRegistryProfileActionResponse,
    TraderaSelectorRegistryProfileActionRequest
  >({
    mutationKey: [...TRADERA_SELECTOR_REGISTRY_QUERY_KEY, 'profile-action'],
    mutationFn: async (
      payload: TraderaSelectorRegistryProfileActionRequest
    ): Promise<TraderaSelectorRegistryProfileActionResponse> => {
      const data = await api.patch<TraderaSelectorRegistryProfileActionResponse>(
        '/api/v2/integrations/tradera/selectors',
        payload
      );
      return traderaSelectorRegistryProfileActionResponseSchema.parse(data);
    },
    invalidateKeys: [TRADERA_SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useMutateTraderaSelectorRegistryProfileMutation',
      operation: 'action',
      resource: 'integrations.tradera.selector-registry.profile',
      domain: 'integrations',
      tags: ['integrations', 'tradera', 'selector-registry', 'profile'],
      description: 'Clones, renames, or deletes Tradera selector registry profiles in Mongo.',
    },
  });
}
