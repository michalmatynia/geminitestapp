'use client';

import type {
  Integration,
  IntegrationConnection,
  TestConnectionResponse,
} from '@/shared/contracts/integrations';
import type { MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateIntegrations } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { invalidateIntegrationConnections } from './integrationCache';

export function useCreateIntegration(): MutationResult<
  Integration,
  { name: string; slug: string }
  > {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createMutationV2<Integration, { name: string; slug: string }>({
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
    invalidate: (queryClient) => invalidateIntegrations(queryClient),
  });
}

type UpsertConnectionVariables = {
  integrationId: string;
  connectionId?: string | null;
  payload: Record<string, unknown>;
  id?: string; // Standardize for createSaveMutation if needed, but here we use connectionId
};

export function useUpsertConnection() {
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
    invalidate: (queryClient, _data, variables) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

type DeleteConnectionVariables = {
  integrationId: string;
  connectionId: string;
  userPassword: string;
  replacementConnectionId?: string | null;
};

export function useDeleteConnection() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createDeleteMutationV2<Record<string, unknown>, DeleteConnectionVariables>({
    mutationFn: ({
      connectionId,
      userPassword,
      replacementConnectionId,
    }: DeleteConnectionVariables): Promise<Record<string, unknown>> => {
      const trimmedReplacementConnectionId = replacementConnectionId?.trim();
      const query = trimmedReplacementConnectionId
        ? `?replacementConnectionId=${encodeURIComponent(trimmedReplacementConnectionId)}`
        : '';
      return api.delete<Record<string, unknown>>(
        `/api/integrations/connections/${connectionId}${query}`,
        { body: JSON.stringify({ userPassword }) }
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
    invalidate: (queryClient, _data, variables) => {
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
  return createMutationV2<TestConnectionResponse, TestConnectionVariables>({
    mutationFn: ({
      integrationId,
      connectionId,
      type = 'test',
      ...rest
    }): Promise<TestConnectionResponse> =>
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
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<
    Record<string, unknown>,
    { integrationId: string; connectionId: string }
  >({
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
    invalidate: (queryClient, _data, variables) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

export function useBaseApiRequest() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<
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
  return createMutationV2<
    { status: number; statusText: string; data?: unknown; refreshed?: boolean },
    { integrationId: string; connectionId: string; method: string; path: string; body?: unknown }
  >({
    mutationFn: ({ integrationId, connectionId, ...rest }) =>
      api.post<{
        status: number;
        statusText: string;
        data?: unknown;
        refreshed?: boolean;
      }>(`/api/integrations/${integrationId}/connections/${connectionId}/allegro/request`, {
        integrationId,
        connectionId,
        ...rest,
      }),
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
  return createMutationV2<{ message?: string }, void>({
    mutationFn: () => api.post<{ message?: string }>('/api/integrations/images/sync-base/all', {}),
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

export function useUpdateDefaultExportConnection() {
  return createUpdateMutationV2<void, { connectionId: string }>({
    mutationFn: (variables) =>
      api.post<void>('/api/integrations/exports/base/default-connection', variables),
    mutationKey: QUERY_KEYS.integrations.selection.defaultConnection(),
    meta: {
      source: 'integrations.hooks.useUpdateDefaultExportConnection',
      operation: 'update',
      resource: 'integrations.exports.base.default-connection',
      domain: 'integrations',
      tags: ['integrations', 'exports', 'base', 'default-connection'],
    },
    invalidateKeys: [
      QUERY_KEYS.integrations.selection.defaultConnection(),
      QUERY_KEYS.integrations.importExport.pref('default-connection'),
    ],
  });
}
