'use client';

import { useQueryClient } from '@tanstack/react-query';

import type { Integration, IntegrationConnection, TestConnectionResponse } from '@/shared/contracts/integrations';
import type { MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateIntegrations } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { invalidateIntegrationConnections } from './integrationCache';

export function useCreateIntegration(): MutationResult<Integration, { name: string; slug: string }> {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.integrations.all;
  return createCreateMutationV2<Integration, { name: string; slug: string }>({
    mutationFn: (variables) => api.post<Integration>('/api/integrations', variables),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useCreateIntegration',
      operation: 'create',
      resource: 'integrations',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'create'],
    },
    onSuccess: () => {
      void invalidateIntegrations(queryClient);
    },
  });
}

type UpsertConnectionVariables = {
  integrationId: string;
  connectionId?: string | null;
  payload: Record<string, unknown>;
  id?: string; // Standardize for createSaveMutation if needed, but here we use connectionId
};

export function useUpsertConnection() {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<IntegrationConnection, UpsertConnectionVariables & { id?: string }>({
    mutationFn: async (variables): Promise<IntegrationConnection> => {
      const hasConnection = Boolean(variables.connectionId);
      const url = hasConnection
        ? `/api/integrations/connections/${variables.connectionId}`
        : `/api/integrations/${variables.integrationId}/connections`;
      const body = variables.payload;
      if (hasConnection) {
        return api.put<IntegrationConnection>(url, body);
      }
      return api.post<IntegrationConnection>(url, body);
    },
    mutationKey,
    meta: {
      source: 'integrations.hooks.useUpsertConnection',
      operation: 'action',
      resource: 'integrations.connections',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'upsert'],
    },
    onSuccess: (_data, variables): void => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

type DeleteConnectionVariables = {
  integrationId: string;
  connectionId: string;
  replacementConnectionId?: string | null;
};

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createDeleteMutationV2<Record<string, unknown>, DeleteConnectionVariables>({
    mutationFn: ({
      connectionId,
      replacementConnectionId,
    }: DeleteConnectionVariables): Promise<Record<string, unknown>> => {
      const trimmedReplacementConnectionId = replacementConnectionId?.trim();
      const query = trimmedReplacementConnectionId
        ? `?replacementConnectionId=${encodeURIComponent(trimmedReplacementConnectionId)}`
        : '';
      return api.delete<Record<string, unknown>>(
        `/api/integrations/connections/${connectionId}${query}`
      );
    },
    mutationKey,
    meta: {
      source: 'integrations.hooks.useDeleteConnection',
      operation: 'delete',
      resource: 'integrations.connections',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'delete'],
    },
    onSuccess: (_data, variables): void => {
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

export function useTestConnection() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createCreateMutationV2<TestConnectionResponse, TestConnectionVariables>({
    mutationFn: ({ integrationId, connectionId, type = 'test', ...rest }): Promise<TestConnectionResponse> =>
      api.post<TestConnectionResponse>(
        `/api/integrations/${integrationId}/connections/${connectionId}/${type}`,
        { integrationId, connectionId, type, ...rest }
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useTestConnection',
      operation: 'action',
      resource: 'integrations.connections.test',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'test'],
    },
  });
}

export function useDisconnectAllegro() {
  const queryClient = useQueryClient();
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createCreateMutationV2<Record<string, unknown>, { integrationId: string; connectionId: string }>({
    mutationFn: ({ integrationId, connectionId }): Promise<Record<string, unknown>> =>
      api.post<Record<string, unknown>>(
        `/api/integrations/connections/${connectionId}/allegro/disconnect`,
        { integrationId, connectionId }
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useDisconnectAllegro',
      operation: 'action',
      resource: 'integrations.connections.allegro.disconnect',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'allegro', 'disconnect'],
    },
    onSuccess: (_data, variables) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

export function useBaseApiRequest() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createCreateMutationV2<
    { data?: unknown },
    { integrationId: string; connectionId: string; method: string; parameters: unknown }
  >({
    mutationFn: ({ integrationId, connectionId, ...rest }) =>
      api.post<{ data?: unknown }>(
        `/api/integrations/${integrationId}/connections/${connectionId}/base/request`,
        { integrationId, connectionId, ...rest }
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useBaseApiRequest',
      operation: 'action',
      resource: 'integrations.connections.base.request',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'base', 'request'],
    },
  });
}

export function useAllegroApiRequest() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createCreateMutationV2<
    { status: number; statusText: string; data?: unknown; refreshed?: boolean },
    { integrationId: string; connectionId: string; method: string; path: string; body?: unknown }
  >({
    mutationFn: ({ integrationId, connectionId, ...rest }) =>
      api.post<{
        status: number;
        statusText: string;
        data?: unknown;
        refreshed?: boolean;
      }>(
        `/api/integrations/${integrationId}/connections/${connectionId}/allegro/request`,
        { integrationId, connectionId, ...rest }
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useAllegroApiRequest',
      operation: 'action',
      resource: 'integrations.connections.allegro.request',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'allegro', 'request'],
    },
  });
}

export function useUpdatePreferredTemplate() {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createUpdateMutationV2<void, { templateId: string }>({
    mutationFn: (variables) =>
      api.post<void>('/api/integrations/exports/base/templates/preferred', variables),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useUpdatePreferredTemplate',
      operation: 'update',
      resource: 'integrations.exports.base.preferred-template',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'exports', 'base', 'preferred-template'],
    },
  });
}

export function useSyncAllBaseImagesMutation() {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createCreateMutationV2<{ message?: string }, void>({
    mutationFn: () =>
      api.post<{ message?: string }>('/api/integrations/images/sync-base/all', {}),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useSyncAllBaseImagesMutation',
      operation: 'action',
      resource: 'integrations.images.sync-base-all',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'images', 'sync-base'],
    },
  });
}

export function useUpdatePreferredInventory() {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createUpdateMutationV2<void, { inventoryId: string; connectionId: string }>({
    mutationFn: (variables) =>
      api.post<void>('/api/integrations/exports/base/inventories/preferred', variables),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useUpdatePreferredInventory',
      operation: 'update',
      resource: 'integrations.exports.base.preferred-inventory',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'exports', 'base', 'preferred-inventory'],
    },
  });
}
