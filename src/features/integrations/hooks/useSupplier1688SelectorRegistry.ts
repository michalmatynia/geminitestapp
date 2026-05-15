'use client';

import type {
  Supplier1688SelectorRegistryDeleteRequest,
  Supplier1688SelectorRegistryDeleteResponse,
  Supplier1688SelectorRegistryListResponse,
  Supplier1688SelectorRegistryProfileActionRequest,
  Supplier1688SelectorRegistryProfileActionResponse,
  Supplier1688SelectorRegistrySaveRequest,
  Supplier1688SelectorRegistrySaveResponse,
  Supplier1688SelectorRegistrySyncRequest,
  Supplier1688SelectorRegistrySyncResponse,
} from '@/shared/contracts/integrations/supplier-1688-selector-registry';
import type { MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import { createMutationV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';

const ENDPOINT = '/api/v2/integrations/1688/selectors';

type Supplier1688SelectorRegistryQueryKey = readonly ['integrations', '1688', 'selectors', string];

const registryKey = (profile?: string | null): Supplier1688SelectorRegistryQueryKey => {
  const normalized = profile?.trim();
  return [
    'integrations',
    '1688',
    'selectors',
    normalized !== undefined && normalized.length > 0 ? normalized : '1688',
  ] as const;
};

const buildUrl = (profile?: string | null): string => {
  const normalized = profile?.trim();
  if (normalized === undefined || normalized.length === 0) return ENDPOINT;
  return `${ENDPOINT}?profile=${encodeURIComponent(normalized)}`;
};

const baseMeta = {
  domain: 'integrations',
  tags: ['integrations', '1688', 'selectors'],
} as const;

async function requestJson<TResponse>(
  url: string,
  init?: RequestInit
): Promise<TResponse> {
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
      text.length > 0 ? text : `1688 selector registry request failed with ${response.status}.`
    );
  }
  return (await response.json()) as TResponse;
}

export function useSupplier1688SelectorRegistry(options?: {
  profile?: string | null;
}): SingleQuery<Supplier1688SelectorRegistryListResponse> {
  const profile = options?.profile ?? '1688';
  const queryKey = registryKey(profile);
  return createSingleQueryV2<Supplier1688SelectorRegistryListResponse>({
    queryKey,
    queryFn: async (): Promise<Supplier1688SelectorRegistryListResponse> =>
      requestJson<Supplier1688SelectorRegistryListResponse>(buildUrl(profile)),
    meta: {
      ...baseMeta,
      source: 'integrations.hooks.useSupplier1688SelectorRegistry',
      operation: 'list',
      resource: 'supplier-1688.selector-registry',
      queryKey,
      description: 'Loads 1688 selector registry entries.',
    },
  });
}

export function useSyncSupplier1688SelectorRegistryMutation(): MutationResult<
  Supplier1688SelectorRegistrySyncResponse,
  Supplier1688SelectorRegistrySyncRequest
> {
  return createMutationV2<
    Supplier1688SelectorRegistrySyncResponse,
    Supplier1688SelectorRegistrySyncRequest
  >({
    mutationFn: async (
      payload: Supplier1688SelectorRegistrySyncRequest
    ): Promise<Supplier1688SelectorRegistrySyncResponse> =>
      requestJson<Supplier1688SelectorRegistrySyncResponse>(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: (_data, variables) => [registryKey(variables.profile)],
    meta: {
      ...baseMeta,
      source: 'integrations.hooks.useSyncSupplier1688SelectorRegistryMutation',
      operation: 'create',
      resource: 'supplier-1688.selector-registry.sync',
      description: 'Syncs 1688 selector registry entries.',
    },
  });
}

export function useSaveSupplier1688SelectorRegistryEntryMutation(): MutationResult<
  Supplier1688SelectorRegistrySaveResponse,
  Supplier1688SelectorRegistrySaveRequest
> {
  return createMutationV2<
    Supplier1688SelectorRegistrySaveResponse,
    Supplier1688SelectorRegistrySaveRequest
  >({
    mutationFn: async (
      payload: Supplier1688SelectorRegistrySaveRequest
    ): Promise<Supplier1688SelectorRegistrySaveResponse> =>
      requestJson<Supplier1688SelectorRegistrySaveResponse>(ENDPOINT, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: (_data, variables) => [registryKey(variables.profile)],
    meta: {
      ...baseMeta,
      source: 'integrations.hooks.useSaveSupplier1688SelectorRegistryEntryMutation',
      operation: 'update',
      resource: 'supplier-1688.selector-registry.entry',
      description: 'Saves a 1688 selector registry entry.',
    },
  });
}

export function useDeleteSupplier1688SelectorRegistryEntryMutation(): MutationResult<
  Supplier1688SelectorRegistryDeleteResponse,
  Supplier1688SelectorRegistryDeleteRequest
> {
  return createMutationV2<
    Supplier1688SelectorRegistryDeleteResponse,
    Supplier1688SelectorRegistryDeleteRequest
  >({
    mutationFn: async (
      payload: Supplier1688SelectorRegistryDeleteRequest
    ): Promise<Supplier1688SelectorRegistryDeleteResponse> =>
      requestJson<Supplier1688SelectorRegistryDeleteResponse>(ENDPOINT, {
        method: 'DELETE',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: (_data, variables) => [registryKey(variables.profile)],
    meta: {
      ...baseMeta,
      source: 'integrations.hooks.useDeleteSupplier1688SelectorRegistryEntryMutation',
      operation: 'delete',
      resource: 'supplier-1688.selector-registry.entry',
      description: 'Deletes a 1688 selector registry entry.',
    },
  });
}

export function useMutateSupplier1688SelectorRegistryProfileMutation(): MutationResult<
  Supplier1688SelectorRegistryProfileActionResponse,
  Supplier1688SelectorRegistryProfileActionRequest
> {
  return createMutationV2<
    Supplier1688SelectorRegistryProfileActionResponse,
    Supplier1688SelectorRegistryProfileActionRequest
  >({
    mutationFn: async (
      payload: Supplier1688SelectorRegistryProfileActionRequest
    ): Promise<Supplier1688SelectorRegistryProfileActionResponse> =>
      requestJson<Supplier1688SelectorRegistryProfileActionResponse>(ENDPOINT, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    invalidateKeys: () => [['integrations', '1688', 'selectors']],
    meta: {
      ...baseMeta,
      source: 'integrations.hooks.useMutateSupplier1688SelectorRegistryProfileMutation',
      operation: 'update',
      resource: 'supplier-1688.selector-registry.profile',
      description: 'Mutates a 1688 selector registry profile.',
    },
  });
}
