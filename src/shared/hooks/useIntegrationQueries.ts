import type {
  BaseImportInventoriesPayload,
  BaseImportInventoriesResponse,
  BaseImportWarehousesPayload,
  BaseImportWarehousesResponse,
} from '@/shared/contracts/integrations/import-export';
import type {
  BaseDefaultConnectionPreferenceResponse,
  BaseDefaultInventoryPreferenceResponse,
  Scanner1688DefaultConnectionPreferenceResponse,
  TraderaDefaultConnectionPreferenceResponse,
  VintedDefaultConnectionPreferenceResponse,
} from '@/shared/contracts/integrations/preferences';
import type { BaseInventory } from '@/shared/contracts/integrations/base-com';
import type { CategoryMappingWithDetails } from '@/shared/contracts/integrations/listings';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { ListQuery, SingleQuery } from '@/shared/contracts/ui/queries';
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
  const isEnabled = options?.enabled ?? Boolean(connectionId);
  const queryKey = marketplaceKeys.mappings(connectionId, 'all');

  return createListQueryV2({
    queryKey,
    queryFn: () =>
      api.get<CategoryMappingWithDetails[]>(
        `/api/marketplace/mappings?connectionId=${connectionId}`
      ),
    enabled: isEnabled && Boolean(connectionId),
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

export function useDefaultExportInventory(): SingleQuery<BaseDefaultInventoryPreferenceResponse> {
  const queryKey = integrationKeys.defaultExportInventory();
  const queryFn = async (): Promise<BaseDefaultInventoryPreferenceResponse> =>
    api.get<BaseDefaultInventoryPreferenceResponse>(
      '/api/v2/integrations/exports/base/default-inventory'
    );

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

export function useDefaultExportConnection(): SingleQuery<BaseDefaultConnectionPreferenceResponse> {
  const queryKey = integrationKeys.selection.defaultConnection();
  const queryFn = async (): Promise<BaseDefaultConnectionPreferenceResponse> =>
    api.get<BaseDefaultConnectionPreferenceResponse>(
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

export function useDefaultTraderaConnection(): SingleQuery<TraderaDefaultConnectionPreferenceResponse> {
  const queryKey = integrationKeys.selection.traderaDefaultConnection();
  const queryFn = async (): Promise<TraderaDefaultConnectionPreferenceResponse> =>
    api.get<TraderaDefaultConnectionPreferenceResponse>(
      '/api/v2/integrations/exports/tradera/default-connection'
    );

  return createSingleQueryV2({
    id: 'default-tradera-connection',
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useDefaultTraderaConnection',
      operation: 'detail',
      resource: 'integrations.default-tradera-connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'tradera', 'connection'],
      description: 'Loads integrations default Tradera connection.',
    },
  });
}

export function useDefaultVintedConnection(): SingleQuery<VintedDefaultConnectionPreferenceResponse> {
  const queryKey = integrationKeys.selection.vintedDefaultConnection();
  const queryFn = async (): Promise<VintedDefaultConnectionPreferenceResponse> =>
    api.get<VintedDefaultConnectionPreferenceResponse>(
      '/api/v2/integrations/exports/vinted/default-connection'
    );

  return createSingleQueryV2({
    id: 'default-vinted-connection',
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useDefaultVintedConnection',
      operation: 'detail',
      resource: 'integrations.default-vinted-connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'vinted', 'connection'],
      description: 'Loads integrations default Vinted connection.',
    },
  });
}

export function useDefault1688Connection(): SingleQuery<Scanner1688DefaultConnectionPreferenceResponse> {
  const queryKey = integrationKeys.selection.scanner1688DefaultConnection();
  const queryFn = async (): Promise<Scanner1688DefaultConnectionPreferenceResponse> =>
    api.get<Scanner1688DefaultConnectionPreferenceResponse>(
      '/api/v2/integrations/exports/1688/default-connection'
    );

  return createSingleQueryV2({
    id: 'default-1688-connection',
    queryKey,
    queryFn,
    meta: {
      source: 'shared.hooks.useDefault1688Connection',
      operation: 'detail',
      resource: 'integrations.default-1688-connection',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', '1688', 'connection'],
      description: 'Loads integrations default 1688 connection.',
    },
  });
}

export function useBaseInventories(
  connectionId: string,
  enabled: boolean = true
): ListQuery<BaseInventory> {
  const queryKey = integrationKeys.baseInventories(connectionId);
  const queryFn = async (): Promise<BaseInventory[]> => {
    const data = await api.post<BaseImportInventoriesResponse>(
      '/api/v2/integrations/imports/base',
      {
        action: 'inventories',
        connectionId,
      } satisfies BaseImportInventoriesPayload
    );
    if (data.error) {
      throw new ApiError(data.error, 400);
    }
    return Array.isArray(data.inventories) ? data.inventories : [];
  };

  return createListQueryV2({
    queryKey,
    queryFn,
    enabled: enabled && Boolean(connectionId),
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

export function useBaseWarehouses(
  connectionId: string,
  inventoryId: string,
  includeAllWarehouses: boolean = false,
  enabled: boolean = true
): SingleQuery<BaseImportWarehousesResponse> {
  const queryKey = [
    ...integrationKeys.baseInventories(connectionId),
    'warehouses',
    inventoryId || 'all',
    includeAllWarehouses,
  ] as const;
  const queryFn = async (): Promise<BaseImportWarehousesResponse> => {
    const normalizedConnectionId = connectionId.trim();
    const normalizedInventoryId = inventoryId.trim();
    if (!normalizedConnectionId) {
      throw new Error('Base.com connection is required to load warehouses.');
    }
    if (!normalizedInventoryId) {
      throw new Error('Base.com inventory is required to load warehouses.');
    }
    return api.post<BaseImportWarehousesResponse>('/api/v2/integrations/imports/base', {
      action: 'warehouses',
      connectionId: normalizedConnectionId,
      inventoryId: normalizedInventoryId,
      includeAllWarehouses,
    } satisfies BaseImportWarehousesPayload);
  };

  return createSingleQueryV2({
    id: inventoryId || null,
    queryKey,
    queryFn,
    enabled: enabled && Boolean(connectionId.trim()) && Boolean(inventoryId.trim()),
    meta: {
      source: 'shared.hooks.useBaseWarehouses',
      operation: 'detail',
      resource: 'integrations.base-warehouses',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'warehouses'],
      description: 'Loads Base.com warehouses for an inventory.',
    },
  });
}
