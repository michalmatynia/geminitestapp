'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

const ENDPOINT = '/api/v2/integrations/1688/selectors';

const registryKey = (profile?: string | null) =>
  ['integrations', '1688', 'selectors', profile?.trim() || '1688'] as const;

const buildUrl = (profile?: string | null): string => {
  const normalized = profile?.trim();
  if (!normalized) return ENDPOINT;
  return `${ENDPOINT}?profile=${encodeURIComponent(normalized)}`;
};

async function requestJson<TResponse>(
  url: string,
  init?: RequestInit
): Promise<TResponse> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `1688 selector registry request failed with ${response.status}.`);
  }
  return (await response.json()) as TResponse;
}

export function useSupplier1688SelectorRegistry(options?: { profile?: string | null }) {
  const profile = options?.profile ?? '1688';
  return useQuery({
    queryKey: registryKey(profile),
    queryFn: async (): Promise<Supplier1688SelectorRegistryListResponse> =>
      requestJson<Supplier1688SelectorRegistryListResponse>(buildUrl(profile)),
  });
}

export function useSyncSupplier1688SelectorRegistryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Supplier1688SelectorRegistrySyncRequest
    ): Promise<Supplier1688SelectorRegistrySyncResponse> =>
      requestJson<Supplier1688SelectorRegistrySyncResponse>(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: registryKey(variables.profile) });
    },
  });
}

export function useSaveSupplier1688SelectorRegistryEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Supplier1688SelectorRegistrySaveRequest
    ): Promise<Supplier1688SelectorRegistrySaveResponse> =>
      requestJson<Supplier1688SelectorRegistrySaveResponse>(ENDPOINT, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: registryKey(variables.profile) });
    },
  });
}

export function useDeleteSupplier1688SelectorRegistryEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Supplier1688SelectorRegistryDeleteRequest
    ): Promise<Supplier1688SelectorRegistryDeleteResponse> =>
      requestJson<Supplier1688SelectorRegistryDeleteResponse>(ENDPOINT, {
        method: 'DELETE',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: registryKey(variables.profile) });
    },
  });
}

export function useMutateSupplier1688SelectorRegistryProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Supplier1688SelectorRegistryProfileActionRequest
    ): Promise<Supplier1688SelectorRegistryProfileActionResponse> =>
      requestJson<Supplier1688SelectorRegistryProfileActionResponse>(ENDPOINT, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', '1688', 'selectors'] });
    },
  });
}

