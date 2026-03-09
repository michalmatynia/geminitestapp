import type {
  BaseInventory,
  CategoryMappingWithDetails,
  IntegrationWithConnections,
} from '@/shared/contracts/integrations';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui';
import { api, ApiError } from '@/shared/lib/api-client';
import { createListQueryV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { integrationKeys, marketplaceKeys } from '@/shared/lib/query-key-exports';

export function useIntegrationsWithConnections(): ListQuery<IntegrationWithConnections> {
  const queryKey = integrationKeys.withConnections();
  const queryFn = async (): Promise<IntegrationWithConnections[]> =>
    api.get<IntegrationWithConnections[]>('/api/v2/integrations/with-connections');

  return createListQueryV2({
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useIntegrationsWithConnections',
      operation: 'list',
      resource: 'integrations.with-connections',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'with-connections'],
      description: 'Loads integrations with connections.',
    },
  });
}

export function useCategoryMappingsByConnection(
  connectionId: string,
  options?: { enabled?: boolean }
): ListQuery<CategoryMappingWithDetails> {
  const isEnabled = options?.enabled ?? !!connectionId;
  const queryKey = marketplaceKeys.mappings(connectionId, 'all');

  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?connectionId=${connectionId}`
      ),
    enabled: isEnabled && !!connectionId,
    meta: {
      source: 'shared.hooks.useCategoryMappingsByConnection',
      operation: 'list',
      resource: 'marketplace.mappings.connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'marketplace', 'mappings'],
      description: 'Loads marketplace mappings for a connection.',
    },
  });
}

export function useDefaultExportInventory(): SingleQuery<{ inventoryId?: string | null }> {
  const queryKey = integrationKeys.defaultExportInventory();
  const queryFn = async (): Promise<{ inventoryId?: string | null }> =>
    api.get<{ inventoryId?: string | null }>('/api/v2/integrations/exports/base/default-inventory');

  return createSingleQueryV2({
    id: 'default-export-inventory',
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useDefaultExportInventory',
      operation: 'detail',
      resource: 'integrations.default-export-inventory',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'inventory'],
      description: 'Loads integrations default export inventory.',
    },
  });
}

export function useDefaultExportConnection(): SingleQuery<{ connectionId?: string | null }> {
  const queryKey = integrationKeys.selection.defaultConnection();
  const queryFn = async (): Promise<{ connectionId?: string | null }> =>
    api.get<{ connectionId?: string | null }>(
      '/api/v2/integrations/exports/base/default-connection'
    );

  return createSingleQueryV2({
    id: 'default-export-connection',
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useDefaultExportConnection',
      operation: 'detail',
      resource: 'integrations.default-export-connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'connection'],
      description: 'Loads integrations default export connection.',
    },
  });
}

export function useBaseInventories(
  connectionId: string,
  enabled: boolean = true
): ListQuery<BaseInventory> {
  const queryKey = integrationKeys.baseInventories(connectionId);
  const queryFn = async (): Promise<BaseInventory[]> => {
    const data = await api.post<{ inventories?: BaseInventory[]; error?: string }>(
      '/api/v2/integrations/imports/base',
      {
        action: 'inventories',
        connectionId,
      }
    );
    if (data.error) {
      throw new ApiError(data.error, 400);
    }
    return Array.isArray(data.inventories) ? data.inventories : [];
  };

  return createListQueryV2({
    queryKey,
    queryFn,
    enabled: enabled && !!connectionId,
    meta: {
      source: 'shared.hooks.useBaseInventories',
      operation: 'list',
      resource: 'integrations.base-inventories',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'inventories'],
      description: 'Loads integrations base inventories.',
    },
  });
}
