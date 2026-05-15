'use client';

import type {
  AmazonSelectorRegistryDeleteRequest,
  AmazonSelectorRegistryDeleteResponse,
  AmazonSelectorRegistryListResponse,
  AmazonSelectorRegistryProfileActionRequest,
  AmazonSelectorRegistryProfileActionResponse,
  AmazonSelectorRegistrySaveRequest,
  AmazonSelectorRegistrySaveResponse,
  AmazonSelectorRegistrySyncRequest,
  AmazonSelectorRegistrySyncResponse,
} from '@/shared/contracts/integrations/amazon-selector-registry';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { useMutationV2, useSingleQueryV2 } from '@/shared/lib/query-factories-v2';

const ENDPOINT = '/api/v2/integrations/amazon/selectors';

type AmazonSelectorRegistryQueryKey = readonly ['integrations', 'amazon', 'selectors', string];

const registryKey = (profile?: string | null): AmazonSelectorRegistryQueryKey => {
  const normalized = profile?.trim();
  return [
    'integrations',
    'amazon',
    'selectors',
    normalized !== undefined && normalized.length > 0 ? normalized : 'amazon',
  ] as const;
};

const buildUrl = (profile?: string | null): string => {
  const normalized = profile?.trim();
  if (normalized === undefined || normalized.length === 0) return ENDPOINT;
  return `${ENDPOINT}?profile=${encodeURIComponent(normalized)}`;
};

const baseMeta = {
  domain: 'integrations',
  tags: ['integrations', 'amazon', 'selectors'],
} as const;

async function requestJson<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body !== undefined && init.body !== null
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      text.length > 0 ? text : `Amazon selector registry request failed with ${response.status}.`
    );
  }
  return (await response.json()) as TResponse;
}

export function useAmazonSelectorRegistry(options?: {
  profile?: string | null;
}): SingleQuery<AmazonSelectorRegistryListResponse> {
  const profile = options?.profile ?? 'amazon';
  const queryKey = registryKey(profile);
  return useSingleQueryV2<AmazonSelectorRegistryListResponse>({
    queryKey: registryKey(profile),
    queryFn: async (): Promise<AmazonSelectorRegistryListResponse> =>
      requestJson<AmazonSelectorRegistryListResponse>(buildUrl(profile)),
    meta: {
      ...baseMeta,
      domain: 'integrations',
      source: 'integrations.hooks.useAmazonSelectorRegistry',
      operation: 'list',
      resource: 'amazon.selector-registry',
      queryKey,
      description: 'Loads Amazon selector registry entries.',
    },
  });
}

export function useSyncAmazonSelectorRegistryMutation(): MutationResult<
  AmazonSelectorRegistrySyncResponse,
  AmazonSelectorRegistrySyncRequest
> {
  return useMutationV2<AmazonSelectorRegistrySyncResponse, AmazonSelectorRegistrySyncRequest>({
    mutationFn: async (
      payload: AmazonSelectorRegistrySyncRequest
    ): Promise<AmazonSelectorRegistrySyncResponse> =>
      requestJson<AmazonSelectorRegistrySyncResponse>(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: (_data, variables) => [registryKey(variables.profile)],
    meta: {
      ...baseMeta,
      domain: 'integrations',
      source: 'integrations.hooks.useSyncAmazonSelectorRegistryMutation',
      operation: 'create',
      resource: 'amazon.selector-registry.sync',
      description: 'Syncs Amazon selector registry entries.',
    },
  });
}

export function useSaveAmazonSelectorRegistryEntryMutation(): MutationResult<
  AmazonSelectorRegistrySaveResponse,
  AmazonSelectorRegistrySaveRequest
> {
  return useMutationV2<AmazonSelectorRegistrySaveResponse, AmazonSelectorRegistrySaveRequest>({
    mutationFn: async (
      payload: AmazonSelectorRegistrySaveRequest
    ): Promise<AmazonSelectorRegistrySaveResponse> =>
      requestJson<AmazonSelectorRegistrySaveResponse>(ENDPOINT, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: (_data, variables) => [registryKey(variables.profile)],
    meta: {
      ...baseMeta,
      domain: 'integrations',
      source: 'integrations.hooks.useSaveAmazonSelectorRegistryEntryMutation',
      operation: 'update',
      resource: 'amazon.selector-registry.entry',
      description: 'Saves an Amazon selector registry entry.',
    },
  });
}

export function useDeleteAmazonSelectorRegistryEntryMutation(): MutationResult<
  AmazonSelectorRegistryDeleteResponse,
  AmazonSelectorRegistryDeleteRequest
> {
  return useMutationV2<
    AmazonSelectorRegistryDeleteResponse,
    AmazonSelectorRegistryDeleteRequest
  >({
    mutationFn: async (
      payload: AmazonSelectorRegistryDeleteRequest
    ): Promise<AmazonSelectorRegistryDeleteResponse> =>
      requestJson<AmazonSelectorRegistryDeleteResponse>(ENDPOINT, {
        method: 'DELETE',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: (_data, variables) => [registryKey(variables.profile)],
    meta: {
      ...baseMeta,
      domain: 'integrations',
      source: 'integrations.hooks.useDeleteAmazonSelectorRegistryEntryMutation',
      operation: 'delete',
      resource: 'amazon.selector-registry.entry',
      description: 'Deletes an Amazon selector registry entry.',
    },
  });
}

export function useMutateAmazonSelectorRegistryProfileMutation(): MutationResult<
  AmazonSelectorRegistryProfileActionResponse,
  AmazonSelectorRegistryProfileActionRequest
> {
  return useMutationV2<
    AmazonSelectorRegistryProfileActionResponse,
    AmazonSelectorRegistryProfileActionRequest
  >({
    mutationFn: async (
      payload: AmazonSelectorRegistryProfileActionRequest
    ): Promise<AmazonSelectorRegistryProfileActionResponse> =>
      requestJson<AmazonSelectorRegistryProfileActionResponse>(ENDPOINT, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: () => [['integrations', 'amazon', 'selectors']],
    meta: {
      ...baseMeta,
      domain: 'integrations',
      source: 'integrations.hooks.useMutateAmazonSelectorRegistryProfileMutation',
      operation: 'update',
      resource: 'amazon.selector-registry.profile',
      description: 'Mutates an Amazon selector registry profile.',
    },
  });
}
