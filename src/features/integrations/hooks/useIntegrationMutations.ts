import type {
  BaseActiveTemplatePreferencePayload,
  BaseActiveTemplatePreferenceResponse,
  BaseDefaultConnectionPreferencePayload,
  BaseDefaultConnectionPreferenceResponse,
  BaseDefaultInventoryPreferencePayload,
  BaseDefaultInventoryPreferenceResponse,
  BaseSyncAllImagesResponse,
  IntegrationAllegroApiRequest,
  IntegrationAllegroApiResponse,
  IntegrationBaseApiRequest,
  IntegrationBaseApiResponse,
  IntegrationConnectionActionTarget,
  IntegrationConnectionTestVariables,
  Integration,
  IntegrationConnection,
  IntegrationDisconnectResponse,
  TestConnectionResponse,
  TraderaDefaultConnectionPreferencePayload,
  TraderaDefaultConnectionPreferenceResponse,
} from '@/shared/contracts/integrations';
import type { MutationResult } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateIntegrationConnections,
  invalidateIntegrations,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export function useCreateIntegration(): MutationResult<
  Integration,
  { name: string; slug: string }
  > {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createMutationV2<Integration, { name: string; slug: string }>({
    mutationFn: (variables) => api.post<Integration>('/api/v2/integrations', variables),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useCreateIntegration',
      operation: 'create',
      resource: 'integrations',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'create'],
      description: 'Creates integrations.'},
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
        ? `/api/v2/integrations/connections/${variables.connectionId}`
        : `/api/v2/integrations/${variables.integrationId}/connections`;
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
      description: 'Runs integrations connections.'},
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
        `/api/v2/integrations/connections/${connectionId}${query}`,
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
      description: 'Deletes integrations connections.'},
    invalidate: (queryClient, _data, variables) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

export function useTestConnection() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<TestConnectionResponse, IntegrationConnectionTestVariables>({
    mutationFn: ({
      integrationId,
      connectionId,
      type = 'test',
      ...rest
    }): Promise<TestConnectionResponse> =>
      api.post<TestConnectionResponse>(
        `/api/v2/integrations/${integrationId}/connections/${connectionId}/${type}`,
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
      description: 'Runs integrations connections test.'},
  });
}

export function useDisconnectAllegro() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<IntegrationDisconnectResponse, IntegrationConnectionActionTarget>({
    mutationFn: ({ integrationId, connectionId }): Promise<IntegrationDisconnectResponse> =>
      api.post<IntegrationDisconnectResponse>(
        `/api/v2/integrations/${integrationId}/connections/${connectionId}/allegro/disconnect`,
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
      description: 'Runs integrations connections allegro disconnect.',
    },
    invalidate: (queryClient, _data, variables) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

export function useDisconnectLinkedIn() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<IntegrationDisconnectResponse, IntegrationConnectionActionTarget>({
    mutationFn: ({ integrationId, connectionId }): Promise<IntegrationDisconnectResponse> =>
      api.post<IntegrationDisconnectResponse>(
        `/api/v2/integrations/${integrationId}/connections/${connectionId}/linkedin/disconnect`,
        { integrationId, connectionId }
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useDisconnectLinkedIn',
      operation: 'action',
      resource: 'integrations.connections.linkedin.disconnect',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'linkedin', 'disconnect'],
      description: 'Runs integrations connections linkedin disconnect.',
    },
    invalidate: (queryClient, _data, variables) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  });
}

export function useBaseApiRequest() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<IntegrationBaseApiResponse, IntegrationBaseApiRequest>({
    mutationFn: ({ integrationId, connectionId, ...rest }) =>
      api.post<IntegrationBaseApiResponse>(
        `/api/v2/integrations/${integrationId}/connections/${connectionId}/base/request`,
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
      description: 'Runs integrations connections base request.',
    },
  });
}

export function useAllegroApiRequest() {
  const mutationKey = QUERY_KEYS.integrations.connections();
  return createMutationV2<IntegrationAllegroApiResponse, IntegrationAllegroApiRequest>({
    mutationFn: ({ integrationId, connectionId, ...rest }) =>
      api.post<IntegrationAllegroApiResponse>(
        `/api/v2/integrations/${integrationId}/connections/${connectionId}/allegro/request`,
        {
          integrationId,
          connectionId,
          ...rest,
        }
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useAllegroApiRequest',
      operation: 'action',
      resource: 'integrations.connections.allegro.request',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'connections', 'allegro', 'request'],
      description: 'Runs integrations connections allegro request.',
    },
  });
}

export function useUpdatePreferredTemplate() {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createUpdateMutationV2<
    BaseActiveTemplatePreferenceResponse,
    BaseActiveTemplatePreferencePayload
  >({
    mutationFn: (variables) =>
      api.post<BaseActiveTemplatePreferenceResponse>(
        '/api/v2/integrations/exports/base/active-template',
        variables
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useUpdatePreferredTemplate',
      operation: 'update',
      resource: 'integrations.exports.base.preferred-template',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'exports', 'base', 'preferred-template'],
      description: 'Updates integrations exports base preferred template.'},
  });
}

export function useSyncAllBaseImagesMutation() {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createMutationV2<BaseSyncAllImagesResponse, void>({
    mutationFn: () =>
      api.post<BaseSyncAllImagesResponse>('/api/v2/integrations/images/sync-base/all', {}),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useSyncAllBaseImagesMutation',
      operation: 'action',
      resource: 'integrations.images.sync-base-all',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'images', 'sync-base'],
      description: 'Runs integrations images sync base all.'},
  });
}

export function useUpdatePreferredInventory() {
  const mutationKey = QUERY_KEYS.integrations.all;
  return createUpdateMutationV2<
    BaseDefaultInventoryPreferenceResponse,
    BaseDefaultInventoryPreferencePayload
  >({
    mutationFn: (variables) =>
      api.post<BaseDefaultInventoryPreferenceResponse>(
        '/api/v2/integrations/exports/base/default-inventory',
        variables
      ),
    mutationKey,
    meta: {
      source: 'integrations.hooks.useUpdatePreferredInventory',
      operation: 'update',
      resource: 'integrations.exports.base.preferred-inventory',
      domain: 'integrations',
      mutationKey,
      tags: ['integrations', 'exports', 'base', 'preferred-inventory'],
      description: 'Updates integrations exports base preferred inventory.'},
  });
}

export function useUpdateDefaultExportConnection() {
  return createUpdateMutationV2<
    BaseDefaultConnectionPreferenceResponse,
    BaseDefaultConnectionPreferencePayload
  >({
    mutationFn: (variables) =>
      api.post<BaseDefaultConnectionPreferenceResponse>(
        '/api/v2/integrations/exports/base/default-connection',
        variables
      ),
    mutationKey: QUERY_KEYS.integrations.selection.defaultConnection(),
    meta: {
      source: 'integrations.hooks.useUpdateDefaultExportConnection',
      operation: 'update',
      resource: 'integrations.exports.base.default-connection',
      domain: 'integrations',
      tags: ['integrations', 'exports', 'base', 'default-connection'],
      description: 'Updates integrations exports base default connection.'},
    invalidateKeys: [
      QUERY_KEYS.integrations.selection.defaultConnection(),
      QUERY_KEYS.integrations.importExport.pref('default-connection'),
    ],
  });
}

export function useUpdateDefaultTraderaConnection() {
  return createUpdateMutationV2<
    TraderaDefaultConnectionPreferenceResponse,
    TraderaDefaultConnectionPreferencePayload
  >({
    mutationFn: (variables) =>
      api.post<TraderaDefaultConnectionPreferenceResponse>(
        '/api/v2/integrations/exports/tradera/default-connection',
        variables
      ),
    mutationKey: QUERY_KEYS.integrations.selection.traderaDefaultConnection(),
    meta: {
      source: 'integrations.hooks.useUpdateDefaultTraderaConnection',
      operation: 'update',
      resource: 'integrations.exports.tradera.default-connection',
      domain: 'integrations',
      tags: ['integrations', 'exports', 'tradera', 'default-connection'],
      description: 'Updates integrations exports Tradera default connection.',
    },
    invalidateKeys: [QUERY_KEYS.integrations.selection.traderaDefaultConnection()],
  });
}
