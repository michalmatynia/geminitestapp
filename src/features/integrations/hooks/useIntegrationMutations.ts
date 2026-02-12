'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';

import type { Integration, IntegrationConnection } from '@/features/integrations/types/integrations-ui';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { invalidateIntegrationConnections } from './integrationCache';

export function useCreateIntegration(): UseMutationResult<Integration, Error, { name: string; slug: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; slug: string }) => api.post<Integration>('/api/integrations', payload),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.all });
    },
  });
}

type UpsertConnectionVariables = {
  integrationId: string;
  connectionId?: string | null;
  payload: Record<string, unknown>;
};

type DeleteConnectionVariables = {
  integrationId: string;
  connectionId: string;
};

export function useUpsertConnection(): UseMutationResult<IntegrationConnection, Error, UpsertConnectionVariables> {
  const queryClient = useQueryClient();

  const mutationOptions: UseMutationOptions<
    IntegrationConnection,
    Error,
    UpsertConnectionVariables
  > = {
    mutationFn: ({ 
      integrationId, 
      connectionId, 
      payload 
    }: UpsertConnectionVariables): Promise<IntegrationConnection> => {
      const url = connectionId
        ? `/api/integrations/connections/${connectionId}`
        : `/api/integrations/${integrationId}/connections`;
      
      return connectionId ? api.put<IntegrationConnection>(url, payload) : api.post<IntegrationConnection>(url, payload);
    },
    onSuccess: (_data: IntegrationConnection, variables: UpsertConnectionVariables): void => {
      invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  };

  return useMutation(mutationOptions);
}

export function useDeleteConnection(): UseMutationResult<Record<string, unknown>, Error, DeleteConnectionVariables> {
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, DeleteConnectionVariables>({
    mutationFn: ({ 
      connectionId 
    }: DeleteConnectionVariables) => api.delete<Record<string, unknown>>(`/api/integrations/connections/${connectionId}`),
    onSuccess: (_data: Record<string, unknown>, variables: DeleteConnectionVariables): void => {
      invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

export function useTestConnection(): UseMutationResult<Record<string, unknown>, Error, { integrationId: string; connectionId: string; type?: 'test' | 'base/test' | 'allegro/test' }> {
  return useMutation({
    mutationFn: ({ 
      integrationId, 
      connectionId, 
      type = 'test' 
    }: { 
      integrationId: string; 
      connectionId: string; 
      type?: 'test' | 'base/test' | 'allegro/test' 
    }) => api.post<Record<string, unknown>>(`/api/integrations/${integrationId}/connections/${connectionId}/${type}`, {}),
  });
}

export function useDisconnectAllegro(): UseMutationResult<Record<string, unknown>, Error, { integrationId: string; connectionId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ integrationId: _integrationId, connectionId }: { integrationId: string; connectionId: string }) => 
      api.post<Record<string, unknown>>(`/api/integrations/connections/${connectionId}/allegro/disconnect`, {}),
    onSuccess: (_: Record<string, unknown>, variables: { integrationId: string; connectionId: string }) => {
      invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

export function useBaseApiRequest(): UseMutationResult<
  { data?: unknown },
  Error,
  { integrationId: string; connectionId: string; method: string; parameters: unknown }
  > {
  return useMutation({
    mutationFn: ({ integrationId, connectionId, method, parameters }: { integrationId: string; connectionId: string; method: string; parameters: unknown }) => 
      api.post<{ data?: unknown }>(`/api/integrations/${integrationId}/connections/${connectionId}/base/request`, { method, parameters }),
  });
}

export function useAllegroApiRequest(): UseMutationResult<
  { status: number; statusText: string; data?: unknown; refreshed?: boolean },
  Error,
  { integrationId: string; connectionId: string; method: string; path: string; body?: unknown }
  > {
  return useMutation({
    mutationFn: ({ integrationId, connectionId, method, path, body }: { integrationId: string; connectionId: string; method: string; path: string; body?: unknown }) => 
      api.post<{ status: number; statusText: string; data?: unknown; refreshed?: boolean }>(
        `/api/integrations/${integrationId}/connections/${connectionId}/allegro/request`,
        { method, path, body }
      ),
  });
}

export function useUpdatePreferredTemplate(): UseMutationResult<
  void,
  Error,
  { templateId: string }
  > {
  return useMutation({
    mutationFn: (payload: { templateId: string }) => 
      api.post<void>('/api/integrations/exports/base/templates/preferred', payload),
  });
}

export function useSyncAllBaseImagesMutation(): UseMutationResult<{ message?: string }, Error, void> {
  return useMutation({
    mutationFn: () => api.post<{ message?: string }>('/api/integrations/images/sync-base/all', {}),
  });
}

export function useUpdatePreferredInventory(): UseMutationResult<
  void,
  Error,
  { inventoryId: string; connectionId: string }
  > {
  return useMutation({
    mutationFn: (payload: { inventoryId: string; connectionId: string }) => 
      api.post<void>('/api/integrations/exports/base/inventories/preferred', payload),
  });
}
