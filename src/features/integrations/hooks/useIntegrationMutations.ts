'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';

import type { Integration, IntegrationConnection } from '@/features/integrations/types/integrations-ui';
import { api } from '@/shared/lib/api-client';
import { invalidateIntegrations } from '@/shared/lib/query-invalidation';
import { createCreateMutation, createDeleteMutation } from '@/shared/lib/mutation-factories';

import { invalidateIntegrationConnections } from './integrationCache';

export function useCreateIntegration(): UseMutationResult<Integration, Error, { name: string; slug: string }> {
  return createCreateMutation({
    createFn: (payload: { name: string; slug: string }) => api.post<Integration>('/api/integrations', payload),
    invalidateFn: (queryClient) => {
      void invalidateIntegrations(queryClient);
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
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  };

  return useMutation(mutationOptions);
}

export function useDeleteConnection(): UseMutationResult<Record<string, unknown>, Error, DeleteConnectionVariables> {
  return createDeleteMutation({
    deleteFn: ({ 
      connectionId 
    }: DeleteConnectionVariables) => api.delete<Record<string, unknown>>(`/api/integrations/connections/${connectionId}`),
    invalidateFn: (queryClient, variables) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

type TestConnectionType = 'test' | 'base/test' | 'allegro/test';
type TestConnectionVariables = {
  integrationId: string;
  connectionId: string;
  type?: TestConnectionType;
  body?: Record<string, unknown>;
  timeoutMs?: number;
};

export function useTestConnection(): UseMutationResult<Record<string, unknown>, Error, TestConnectionVariables> {
  return useMutation({
    mutationFn: ({
      integrationId,
      connectionId,
      type = 'test',
      body,
      timeoutMs,
    }: TestConnectionVariables) =>
      api.post<Record<string, unknown>>(
        `/api/integrations/${integrationId}/connections/${connectionId}/${type}`,
        body ?? {},
        typeof timeoutMs === 'number' ? { timeout: timeoutMs } : undefined
      ),
  });
}

export function useDisconnectAllegro(): UseMutationResult<Record<string, unknown>, Error, { integrationId: string; connectionId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ integrationId: _integrationId, connectionId }: { integrationId: string; connectionId: string }) => 
      api.post<Record<string, unknown>>(`/api/integrations/connections/${connectionId}/allegro/disconnect`, {}),
    onSuccess: (_: Record<string, unknown>, variables: { integrationId: string; connectionId: string }) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
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
