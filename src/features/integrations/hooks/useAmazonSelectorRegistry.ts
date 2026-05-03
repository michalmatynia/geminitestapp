'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

const ENDPOINT = '/api/v2/integrations/amazon/selectors';

const registryKey = (profile?: string | null) =>
  ['integrations', 'amazon', 'selectors', profile?.trim() || 'amazon'] as const;

const buildUrl = (profile?: string | null): string => {
  const normalized = profile?.trim();
  if (!normalized) return ENDPOINT;
  return `${ENDPOINT}?profile=${encodeURIComponent(normalized)}`;
};

async function requestJson<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
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
    throw new Error(text || `Amazon selector registry request failed with ${response.status}.`);
  }
  return (await response.json()) as TResponse;
}

export function useAmazonSelectorRegistry(options?: { profile?: string | null }) {
  const profile = options?.profile ?? 'amazon';
  return useQuery({
    queryKey: registryKey(profile),
    queryFn: async (): Promise<AmazonSelectorRegistryListResponse> =>
      requestJson<AmazonSelectorRegistryListResponse>(buildUrl(profile)),
  });
}

export function useSyncAmazonSelectorRegistryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: AmazonSelectorRegistrySyncRequest
    ): Promise<AmazonSelectorRegistrySyncResponse> =>
      requestJson<AmazonSelectorRegistrySyncResponse>(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: registryKey(variables.profile) });
    },
  });
}

export function useSaveAmazonSelectorRegistryEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: AmazonSelectorRegistrySaveRequest
    ): Promise<AmazonSelectorRegistrySaveResponse> =>
      requestJson<AmazonSelectorRegistrySaveResponse>(ENDPOINT, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: registryKey(variables.profile) });
    },
  });
}

export function useDeleteAmazonSelectorRegistryEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: AmazonSelectorRegistryDeleteRequest
    ): Promise<AmazonSelectorRegistryDeleteResponse> =>
      requestJson<AmazonSelectorRegistryDeleteResponse>(ENDPOINT, {
        method: 'DELETE',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: registryKey(variables.profile) });
    },
  });
}

export function useMutateAmazonSelectorRegistryProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: AmazonSelectorRegistryProfileActionRequest
    ): Promise<AmazonSelectorRegistryProfileActionResponse> =>
      requestJson<AmazonSelectorRegistryProfileActionResponse>(ENDPOINT, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'amazon', 'selectors'] });
    },
  });
}
