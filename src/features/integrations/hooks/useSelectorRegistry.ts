/* eslint-disable complexity */
import {
  type SelectorRegistryDeleteRequest,
  type SelectorRegistryDeleteResponse,
  selectorRegistryDeleteResponseSchema,
  type SelectorRegistryListResponse,
  selectorRegistryListResponseSchema,
  type SelectorRegistryNamespace,
  type SelectorRegistryProfileActionRequest,
  type SelectorRegistryProfileActionResponse,
  selectorRegistryProfileActionResponseSchema,
  type SelectorRegistrySaveRequest,
  type SelectorRegistrySaveResponse,
  selectorRegistrySaveResponseSchema,
  type SelectorRegistrySyncRequest,
  type SelectorRegistrySyncResponse,
  selectorRegistrySyncResponseSchema,
} from '@/shared/contracts/integrations/selector-registry';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';

const ENDPOINT = '/api/v2/integrations/selectors';

export const SELECTOR_REGISTRY_QUERY_KEY = [
  'integrations',
  'selector-registry',
] as const;

const buildSelectorRegistryQueryKey = (options?: {
  namespace?: SelectorRegistryNamespace | null;
  profile?: string | null;
  effective?: boolean;
}) => [
  ...SELECTOR_REGISTRY_QUERY_KEY,
  {
    namespace: options?.namespace ?? null,
    profile: options?.profile?.trim() ?? null,
    effective: options?.effective ?? true,
  },
] as const;

const buildSelectorRegistryParams = (options?: {
  namespace?: SelectorRegistryNamespace | null;
  profile?: string | null;
  effective?: boolean;
}): Record<string, string> => {
  const params: Record<string, string> = {};
  const namespace = options?.namespace ?? null;
  const profile = options?.profile?.trim() ?? null;

  if (namespace !== null) {
    params['namespace'] = namespace;
  }
  if (profile !== null && profile.length > 0) {
    params['profile'] = profile;
  }
  if (options?.effective === false) {
    params['effective'] = 'false';
  }

  return params;
};

export function useSelectorRegistry(options?: {
  namespace?: SelectorRegistryNamespace | null;
  profile?: string | null;
  effective?: boolean;
}): ListQuery<SelectorRegistryListResponse, SelectorRegistryListResponse> {
  const queryKey = buildSelectorRegistryQueryKey(options);

  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<SelectorRegistryListResponse> => {
      const params = buildSelectorRegistryParams(options);
      const requestOptions =
        Object.keys(params).length > 0 ? { params } : undefined;
      const data = await api.get<SelectorRegistryListResponse>(
        ENDPOINT,
        requestOptions
      );
      return selectorRegistryListResponseSchema.parse(data);
    },
    meta: {
      source: 'integrations.hooks.useSelectorRegistry',
      operation: 'list',
      resource: 'integrations.selector-registry',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'selector-registry'],
      description: 'Loads the unified selector registry across marketplace namespaces.',
    },
  });
}

export function useSyncSelectorRegistryMutation(): MutationResult<
  SelectorRegistrySyncResponse,
  SelectorRegistrySyncRequest
> {
  return createMutationV2<SelectorRegistrySyncResponse, SelectorRegistrySyncRequest>({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'sync'],
    mutationFn: async (
      payload: SelectorRegistrySyncRequest
    ): Promise<SelectorRegistrySyncResponse> => {
      const data = await api.post<SelectorRegistrySyncResponse>(ENDPOINT, payload);
      return selectorRegistrySyncResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useSyncSelectorRegistryMutation',
      operation: 'action',
      resource: 'integrations.selector-registry.sync',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'sync'],
      description: 'Syncs a selector registry namespace/profile from code into storage.',
    },
  });
}

export function useSaveSelectorRegistryEntryMutation(): MutationResult<
  SelectorRegistrySaveResponse,
  SelectorRegistrySaveRequest
> {
  return createMutationV2<SelectorRegistrySaveResponse, SelectorRegistrySaveRequest>({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'save'],
    mutationFn: async (
      payload: SelectorRegistrySaveRequest
    ): Promise<SelectorRegistrySaveResponse> => {
      const data = await api.put<SelectorRegistrySaveResponse>(ENDPOINT, payload);
      return selectorRegistrySaveResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useSaveSelectorRegistryEntryMutation',
      operation: 'update',
      resource: 'integrations.selector-registry.entry',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'save'],
      description: 'Creates or updates a selector registry override.',
    },
  });
}

export function useDeleteSelectorRegistryEntryMutation(): MutationResult<
  SelectorRegistryDeleteResponse,
  SelectorRegistryDeleteRequest
> {
  return createDeleteMutationV2<SelectorRegistryDeleteResponse, SelectorRegistryDeleteRequest>({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'delete'],
    mutationFn: async (
      payload: SelectorRegistryDeleteRequest
    ): Promise<SelectorRegistryDeleteResponse> => {
      const data = await api.delete<SelectorRegistryDeleteResponse>(ENDPOINT, {
        body: JSON.stringify(payload),
      });
      return selectorRegistryDeleteResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useDeleteSelectorRegistryEntryMutation',
      operation: 'delete',
      resource: 'integrations.selector-registry.entry',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'delete'],
      description: 'Deletes a selector registry profile override.',
    },
  });
}

export function useMutateSelectorRegistryProfileMutation(): MutationResult<
  SelectorRegistryProfileActionResponse,
  SelectorRegistryProfileActionRequest
> {
  return createMutationV2<
    SelectorRegistryProfileActionResponse,
    SelectorRegistryProfileActionRequest
  >({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'profile-action'],
    mutationFn: async (
      payload: SelectorRegistryProfileActionRequest
    ): Promise<SelectorRegistryProfileActionResponse> => {
      const data = await api.patch<SelectorRegistryProfileActionResponse>(ENDPOINT, payload);
      return selectorRegistryProfileActionResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useMutateSelectorRegistryProfileMutation',
      operation: 'action',
      resource: 'integrations.selector-registry.profile',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'profile'],
      description: 'Clones, renames, or deletes selector registry profiles.',
    },
  });
}
