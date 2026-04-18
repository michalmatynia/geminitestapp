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
  type SelectorRegistryClassifySuggestionsRequest,
  type SelectorRegistryClassifySuggestionsResponse,
  selectorRegistryClassifySuggestionsResponseSchema,
  type SelectorRegistryProbeRequest,
  type SelectorRegistryProbeResponse,
  selectorRegistryProbeResponseSchema,
  type SelectorRegistryProbeSessionArchiveRequest,
  type SelectorRegistryProbeSessionArchiveResponse,
  selectorRegistryProbeSessionArchiveResponseSchema,
  type SelectorRegistryProbeSessionDeleteRequest,
  type SelectorRegistryProbeSessionDeleteResponse,
  selectorRegistryProbeSessionDeleteResponseSchema,
  type SelectorRegistryProbeSessionRestoreRequest,
  type SelectorRegistryProbeSessionRestoreResponse,
  selectorRegistryProbeSessionRestoreResponseSchema,
  type SelectorRegistryProbeSessionSaveRequest,
  type SelectorRegistryProbeSessionSaveResponse,
  selectorRegistryProbeSessionSaveResponseSchema,
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
const PROBE_SESSIONS_ENDPOINT = '/api/v2/integrations/selectors/probe-sessions';
const PROBE_ENDPOINT = '/api/v2/integrations/selectors/probe';
const CLASSIFY_SUGGESTIONS_ENDPOINT = '/api/v2/integrations/selectors/classify-suggestions';

export const SELECTOR_REGISTRY_QUERY_KEY = [
  'integrations',
  'selector-registry',
] as const;

const buildSelectorRegistryQueryKey = (options?: {
  namespace?: SelectorRegistryNamespace | null;
  profile?: string | null;
  effective?: boolean;
  includeArchived?: boolean;
}) => [
  ...SELECTOR_REGISTRY_QUERY_KEY,
  {
    namespace: options?.namespace ?? null,
    profile: options?.profile?.trim() ?? null,
    effective: options?.effective ?? true,
    includeArchived: options?.includeArchived ?? false,
  },
] as const;

const buildSelectorRegistryParams = (options?: {
  namespace?: SelectorRegistryNamespace | null;
  profile?: string | null;
  effective?: boolean;
  includeArchived?: boolean;
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
  if (options?.includeArchived === true) {
    params['includeArchived'] = 'true';
  }

  return params;
};

export function useSelectorRegistry(options?: {
  namespace?: SelectorRegistryNamespace | null;
  profile?: string | null;
  effective?: boolean;
  includeArchived?: boolean;
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

export function useSaveSelectorRegistryProbeSessionMutation(): MutationResult<
  SelectorRegistryProbeSessionSaveResponse,
  SelectorRegistryProbeSessionSaveRequest
> {
  return createMutationV2<
    SelectorRegistryProbeSessionSaveResponse,
    SelectorRegistryProbeSessionSaveRequest
  >({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'probe-sessions', 'save'],
    mutationFn: async (
      payload: SelectorRegistryProbeSessionSaveRequest
    ): Promise<SelectorRegistryProbeSessionSaveResponse> => {
      const data = await api.post<SelectorRegistryProbeSessionSaveResponse>(
        PROBE_SESSIONS_ENDPOINT,
        payload
      );
      return selectorRegistryProbeSessionSaveResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useSaveSelectorRegistryProbeSessionMutation',
      operation: 'create',
      resource: 'integrations.selector-registry.probe-session',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'probe-sessions'],
      description: 'Persists a live-scripter DOM probe session for later selector-registry review.',
    },
  });
}

export function useDeleteSelectorRegistryProbeSessionMutation(): MutationResult<
  SelectorRegistryProbeSessionDeleteResponse,
  SelectorRegistryProbeSessionDeleteRequest
> {
  return createDeleteMutationV2<
    SelectorRegistryProbeSessionDeleteResponse,
    SelectorRegistryProbeSessionDeleteRequest
  >({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'probe-sessions', 'delete'],
    mutationFn: async (
      payload: SelectorRegistryProbeSessionDeleteRequest
    ): Promise<SelectorRegistryProbeSessionDeleteResponse> => {
      const data = await api.delete<SelectorRegistryProbeSessionDeleteResponse>(
        PROBE_SESSIONS_ENDPOINT,
        {
          body: JSON.stringify(payload),
        }
      );
      return selectorRegistryProbeSessionDeleteResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useDeleteSelectorRegistryProbeSessionMutation',
      operation: 'delete',
      resource: 'integrations.selector-registry.probe-session',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'probe-sessions'],
      description: 'Deletes a persisted DOM probe session from selector-registry review.',
    },
  });
}

export function useArchiveSelectorRegistryProbeSessionMutation(): MutationResult<
  SelectorRegistryProbeSessionArchiveResponse,
  SelectorRegistryProbeSessionArchiveRequest
> {
  return createMutationV2<
    SelectorRegistryProbeSessionArchiveResponse,
    SelectorRegistryProbeSessionArchiveRequest
  >({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'probe-sessions', 'archive'],
    mutationFn: async (
      payload: SelectorRegistryProbeSessionArchiveRequest
    ): Promise<SelectorRegistryProbeSessionArchiveResponse> => {
      const data = await api.patch<SelectorRegistryProbeSessionArchiveResponse>(
        PROBE_SESSIONS_ENDPOINT,
        payload
      );
      return selectorRegistryProbeSessionArchiveResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useArchiveSelectorRegistryProbeSessionMutation',
      operation: 'update',
      resource: 'integrations.selector-registry.probe-session.archive',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'probe-sessions', 'archive'],
      description: 'Archives a persisted DOM probe session without hard deleting it.',
    },
  });
}

export function useRestoreSelectorRegistryProbeSessionMutation(): MutationResult<
  SelectorRegistryProbeSessionRestoreResponse,
  SelectorRegistryProbeSessionRestoreRequest
> {
  return createMutationV2<
    SelectorRegistryProbeSessionRestoreResponse,
    SelectorRegistryProbeSessionRestoreRequest
  >({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'probe-sessions', 'restore'],
    mutationFn: async (
      payload: SelectorRegistryProbeSessionRestoreRequest
    ): Promise<SelectorRegistryProbeSessionRestoreResponse> => {
      const data = await api.put<SelectorRegistryProbeSessionRestoreResponse>(
        PROBE_SESSIONS_ENDPOINT,
        payload
      );
      return selectorRegistryProbeSessionRestoreResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useRestoreSelectorRegistryProbeSessionMutation',
      operation: 'update',
      resource: 'integrations.selector-registry.probe-session',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'probe-sessions'],
      description: 'Restores an archived DOM probe session back into active selector-registry review.',
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

type ClassifyRolePayload = {
  namespace: SelectorRegistryNamespace;
  profile: string;
  key: string;
};

export function useClassifySelectorRoleMutation(): MutationResult<
  SelectorRegistryProfileActionResponse,
  ClassifyRolePayload
> {
  return createMutationV2<SelectorRegistryProfileActionResponse, ClassifyRolePayload>({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'classify-role'],
    mutationFn: async (payload: ClassifyRolePayload): Promise<SelectorRegistryProfileActionResponse> => {
      const data = await api.patch<SelectorRegistryProfileActionResponse>(ENDPOINT, {
        action: 'classify_role' as const,
        ...payload,
      });
      return selectorRegistryProfileActionResponseSchema.parse(data);
    },
    invalidateKeys: [SELECTOR_REGISTRY_QUERY_KEY],
    meta: {
      source: 'integrations.hooks.useClassifySelectorRoleMutation',
      operation: 'action',
      resource: 'integrations.selector-registry.role',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'classify'],
      description: 'Uses an AI model to classify the role of a selector registry entry.',
    },
  });
}

export function useProbeSelectorMutation(): MutationResult<
  SelectorRegistryProbeResponse,
  SelectorRegistryProbeRequest
> {
  return createMutationV2<SelectorRegistryProbeResponse, SelectorRegistryProbeRequest>({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'probe'],
    mutationFn: async (
      payload: SelectorRegistryProbeRequest
    ): Promise<SelectorRegistryProbeResponse> => {
      const data = await api.post<SelectorRegistryProbeResponse>(PROBE_ENDPOINT, payload);
      return selectorRegistryProbeResponseSchema.parse(data);
    },
    meta: {
      source: 'integrations.hooks.useProbeSelectorMutation',
      operation: 'action',
      resource: 'integrations.selector-registry.probe',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'probe'],
      description: 'Launches a Playwright session to probe a selector on the target marketplace URL.',
    },
  });
}

export function useClassifyProbeSuggestionsMutation(): MutationResult<
  SelectorRegistryClassifySuggestionsResponse,
  SelectorRegistryClassifySuggestionsRequest
> {
  return createMutationV2<
    SelectorRegistryClassifySuggestionsResponse,
    SelectorRegistryClassifySuggestionsRequest
  >({
    mutationKey: [...SELECTOR_REGISTRY_QUERY_KEY, 'classify-suggestions'],
    mutationFn: async (
      payload: SelectorRegistryClassifySuggestionsRequest
    ): Promise<SelectorRegistryClassifySuggestionsResponse> => {
      const data = await api.post<SelectorRegistryClassifySuggestionsResponse>(
        CLASSIFY_SUGGESTIONS_ENDPOINT,
        payload
      );
      return selectorRegistryClassifySuggestionsResponseSchema.parse(data);
    },
    meta: {
      source: 'integrations.hooks.useClassifyProbeSuggestionsMutation',
      operation: 'action',
      resource: 'integrations.selector-registry.classify-suggestions',
      domain: 'integrations',
      tags: ['integrations', 'selector-registry', 'classify', 'probe'],
      description: 'Uses Brain AI to classify roles of live DOM probe suggestions in batches.',
    },
  });
}
