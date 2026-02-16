'use client';

import type { Integration, IntegrationConnection } from '@/features/integrations/types/integrations-ui';
import {
  createPostMutation,
  createDeleteMutation,
  createSaveMutation,
} from '@/shared/lib/api-hooks';
import { invalidateIntegrations } from '@/shared/lib/query-invalidation';

import { invalidateIntegrationConnections } from './integrationCache';

export function useCreateIntegration() {
  return createPostMutation<Integration, { name: string; slug: string }>({
    endpoint: '/api/integrations',
    onSuccess: (_data, _variables, _context, queryClient): void => {
      void invalidateIntegrations(queryClient);
    },
  })();
}

type UpsertConnectionVariables = {
  integrationId: string;
  connectionId?: string | null;
  payload: Record<string, unknown>;
  id?: string; // Standardize for createSaveMutation if needed, but here we use connectionId
};

export function useUpsertConnection() {
  return createSaveMutation<IntegrationConnection, UpsertConnectionVariables & { id?: string }>({
    createEndpoint: ({ integrationId }) => `/api/integrations/${integrationId}/connections`,
    updateEndpoint: ({ connectionId }) => `/api/integrations/connections/${connectionId}`,
    onSuccess: (_data, variables, _context, queryClient): void => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  })();
}

type DeleteConnectionVariables = {
  integrationId: string;
  connectionId: string;
};

export function useDeleteConnection() {
  return createDeleteMutation<Record<string, unknown>, DeleteConnectionVariables>({
    endpoint: ({ connectionId }) => `/api/integrations/connections/${connectionId}`,
    onSuccess: (_data, variables, _context, queryClient): void => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  })();
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
  return createPostMutation<Record<string, unknown>, TestConnectionVariables>({
    endpoint: ({ integrationId, connectionId, type = 'test' }) => 
      `/api/integrations/${integrationId}/connections/${connectionId}/${type}`,
    apiOptions: { 
      // Note: mapping body and timeout is handled by the caller or needs custom mutationFn
      // For now, keeping it simple as factories might need expansion for these options
    }
  })();
}

export function useDisconnectAllegro() {
  return createPostMutation<Record<string, unknown>, { integrationId: string; connectionId: string }>({
    endpoint: ({ connectionId }) => `/api/integrations/connections/${connectionId}/allegro/disconnect`,
    onSuccess: (_data, variables, _context, queryClient) => {
      void invalidateIntegrationConnections(queryClient, variables.integrationId);
    },
  })();
}

export function useBaseApiRequest() {
  return createPostMutation<
    { data?: unknown },
    { integrationId: string; connectionId: string; method: string; parameters: unknown }
  >({
    endpoint: ({ integrationId, connectionId }) => 
      `/api/integrations/${integrationId}/connections/${connectionId}/base/request`,
  })();
}

export function useAllegroApiRequest() {
  return createPostMutation<
    { status: number; statusText: string; data?: unknown; refreshed?: boolean },
    { integrationId: string; connectionId: string; method: string; path: string; body?: unknown }
  >({
    endpoint: ({ integrationId, connectionId }) => 
      `/api/integrations/${integrationId}/connections/${connectionId}/allegro/request`,
  })();
}

export function useUpdatePreferredTemplate() {
  return createPostMutation<void, { templateId: string }>({
    endpoint: '/api/integrations/exports/base/templates/preferred',
  })();
}

export function useSyncAllBaseImagesMutation() {
  return createPostMutation<{ message?: string }, void>({
    endpoint: '/api/integrations/images/sync-base/all',
  })();
}

export function useUpdatePreferredInventory() {
  return createPostMutation<void, { inventoryId: string; connectionId: string }>({
    endpoint: '/api/integrations/exports/base/inventories/preferred',
  })();
}
