'use client';

import type {
  CatalogOption as CatalogRecord,
  ImportListItem,
  WarehouseOption,
} from '@/shared/contracts/data-import-export';
import type {
  BaseImportRunDetailResponse,
  BaseImportRunRecord,
  BaseImportStartResponse,
  BaseImportMode,
  ImportParameterCacheResponse,
  BaseInventory,
  IntegrationWithConnections,
  ImageRetryPreset,
  BaseImportStartResponse as ImportResponse,
  IntegrationTemplate as Template,
} from '@/shared/contracts/integrations';
import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  importExportKeys,
  integrationKeys,
  productMetadataKeys,
} from '@/shared/lib/query-key-exports';

export type { ImportParameterCacheResponse };
export type { CatalogRecord };

// --- Queries ---

export function useIntegrationConnections(): ListQuery<IntegrationWithConnections> {
  const queryKey = integrationKeys.withConnections();
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<IntegrationWithConnections[]>('/api/v2/integrations/with-connections'),
    meta: {
      source: 'importExport.hooks.useIntegrationConnections',
      operation: 'list',
      resource: 'integrations.connections',
      domain: 'integrations',
      queryKey,
      tags: ['integrations', 'connections'],
    },
  });
}

export function useCatalogs(): ListQuery<CatalogRecord> {
  const queryKey = productMetadataKeys.catalogs();
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<CatalogRecord[]>('/api/catalogs'),
    meta: {
      source: 'importExport.hooks.useCatalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'catalogs'],
    },
  });
}

export function useTemplates(scope: 'import' | 'export'): ListQuery<Template> {
  const endpoint =
    scope === 'import'
      ? '/api/v2/templates/import'
      : '/api/v2/templates/export';
  const queryKey = importExportKeys.templates(scope);

  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<Template[]>(endpoint, { cache: 'no-store' }),
    meta: {
      source: 'importExport.hooks.useTemplates',
      operation: 'list',
      resource: `integrations.import-export.templates.${scope}`,
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'templates', scope],
    },
  });
}

type ImportPreferenceOptions<T> = {
  fallback?: T;
  enabled?: boolean;
};

export function useImportPreference<T>(
  key: string,
  endpoint: string,
  options?: ImportPreferenceOptions<T>
): SingleQuery<T> {
  const queryKey = importExportKeys.pref(key);
  return createSingleQueryV2({
    id: key,
    queryKey,
    queryFn: async (): Promise<T> => {
      try {
        return await api.get<T>(endpoint, { cache: 'no-store' });
      } catch (error) {
        if (options?.fallback !== undefined) return options.fallback;
        throw error;
      }
    },
    enabled: options?.enabled ?? true,
    meta: {
      source: 'importExport.hooks.useImportPreference',
      operation: 'detail',
      resource: 'integrations.import-export.preference',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'preferences'],
    },
  });
}

// --- Mutations ---

export function useSavePreferenceMutation(): MutationResult<
  unknown,
  { endpoint: string; data: unknown }
  > {
  const mutationKey = importExportKeys.preferences();

  return createUpdateMutationV2({
    mutationFn: ({ endpoint, data }: { endpoint: string; data: unknown }) =>
      api.post<unknown>(endpoint, data),
    mutationKey,
    meta: {
      source: 'importExport.hooks.useSavePreferenceMutation',
      operation: 'update',
      resource: 'integrations.import-export.preference',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'preferences', 'save'],
    },
    invalidate: async (queryClient, _data, { endpoint }) => {
      void queryClient.invalidateQueries({ queryKey: importExportKeys.preferences() });
      const key = endpoint.split('/').pop();
      if (key) {
        await queryClient.invalidateQueries({ queryKey: importExportKeys.pref(key) });
      }
    },
  });
}

export function useTemplateMutation(
  scope: 'import' | 'export',
  id?: string
): MutationResult<unknown, { data?: unknown; isDelete?: boolean }> {
  const endpoint =
    scope === 'import'
      ? '/api/v2/templates/import'
      : '/api/v2/templates/export';
  const mutationKey = importExportKeys.templates(scope);

  return createMutationV2({
    mutationFn: ({
      data,
      isDelete = false,
    }: {
      data?: unknown;
      isDelete?: boolean;
    }): Promise<unknown> => {
      const url = id ? `${endpoint}/${id}` : endpoint;
      if (isDelete) return api.delete(url);
      return id ? api.put(url, data) : api.post(url, data);
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useTemplateMutation',
      operation: 'action',
      resource: `integrations.import-export.templates.${scope}`,
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'templates', scope, 'save'],
    },
    invalidateKeys: [importExportKeys.templates(scope)],
  });
}

export function useInventories(
  connectionId?: string,
  enabled: boolean = true
): ListQuery<BaseInventory> {
  const queryKey = importExportKeys.inventories(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<BaseInventory[]> => {
      const data = await api.post<{ inventories: BaseInventory[] }>(
        '/api/v2/integrations/imports/base',
        { action: 'inventories', connectionId }
      );
      return data.inventories;
    },
    enabled,
    meta: {
      source: 'importExport.hooks.useInventories',
      operation: 'list',
      resource: 'integrations.import-export.inventories',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'inventories'],
    },
  });
}

export function useWarehouses(
  inventoryId: string,
  connectionId?: string,
  includeAll: boolean = false,
  enabled: boolean = true
): SingleQuery<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }> {
  const queryKey = importExportKeys.warehouses(inventoryId, connectionId, includeAll);
  return createSingleQueryV2({
    id: inventoryId || null,
    queryKey,
    queryFn: () =>
      api.post<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }>(
        '/api/v2/integrations/imports/base',
        {
          action: 'warehouses',
          inventoryId,
          connectionId,
          includeAllWarehouses: includeAll,
        }
      ),
    enabled: enabled && !!inventoryId,
    meta: {
      source: 'importExport.hooks.useWarehouses',
      operation: 'detail',
      resource: 'integrations.import-export.warehouses',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'warehouses'],
    },
  });
}

export function useParameters(
  inventoryId: string,
  productId: string,
  enabled: boolean = true
): SingleQuery<{ parameters?: Array<{ id: string; name: string }> }> {
  const queryKey = importExportKeys.parameters(inventoryId, productId);
  return createSingleQueryV2({
    id: inventoryId && productId ? `${inventoryId}-${productId}` : null,
    queryKey,
    queryFn: () =>
      api.post<{ parameters?: Array<{ id: string; name: string }> }>(
        '/api/v2/integrations/imports/base/parameters',
        {
          inventoryId,
          productId,
        }
      ),
    enabled: enabled && !!inventoryId && !!productId,
    meta: {
      source: 'importExport.hooks.useParameters',
      operation: 'detail',
      resource: 'integrations.import-export.parameters',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'parameters'],
    },
  });
}

export function useImportParameterCache(
  enabled: boolean = true
): SingleQuery<ImportParameterCacheResponse> {
  const queryKey = importExportKeys.pref('parameter-cache');
  return createSingleQueryV2({
    id: 'parameter-cache',
    queryKey,
    queryFn: () =>
      api.get<ImportParameterCacheResponse>('/api/v2/integrations/imports/base/parameters', {
        cache: 'no-store',
      }),
    enabled,
    meta: {
      source: 'importExport.hooks.useImportParameterCache',
      operation: 'detail',
      resource: 'integrations.import-export.parameter-cache',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'parameters', 'cache'],
    },
  });
}

export function useRefreshImportParameterCacheMutation(): MutationResult<
  { keys?: string[]; values?: Record<string, string> },
  { inventoryId: string; connectionId?: string }
  > {
  const mutationKey = importExportKeys.lists();

  return createMutationV2({
    mutationFn: async ({
      inventoryId,
      connectionId,
    }: {
      inventoryId: string;
      connectionId?: string;
    }): Promise<{ keys?: string[]; values?: Record<string, string> }> => {
      const normalizedInventoryId = inventoryId.trim();
      if (!normalizedInventoryId) {
        throw new Error('Inventory ID is required to load source fields.');
      }

      const normalizedConnectionId = connectionId?.trim();
      return api.post<{ keys?: string[]; values?: Record<string, string> }>(
        '/api/v2/integrations/imports/base/parameters',
        {
          inventoryId: normalizedInventoryId,
          sampleSize: 8,
          ...(normalizedConnectionId ? { connectionId: normalizedConnectionId } : {}),
        }
      );
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useRefreshImportParameterCacheMutation',
      operation: 'action',
      resource: 'integrations.import-export.parameter-cache.refresh',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'parameters', 'refresh'],
    },
    invalidateKeys: [
      importExportKeys.pref('sample-product'),
      importExportKeys.pref('parameter-cache'),
    ],
  });
}

export function useImportList(
  inventoryId: string,
  params: {
    connectionId?: string;
    catalogId?: string;
    limit?: string | number;
    uniqueOnly?: boolean;
    page?: number;
    pageSize?: number;
    searchName?: string;
    searchSku?: string;
  },
  enabled: boolean = true
): SingleQuery<{
  products?: ImportListItem[];
  total?: number;
  filtered?: number;
  available?: number;
  existing?: number;
  skuDuplicates?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}> {
  const queryKey = importExportKeys.importList(inventoryId, params);
  return createSingleQueryV2({
    id: inventoryId || null,
    queryKey,
    queryFn: () => {
      const { connectionId, catalogId, limit, uniqueOnly, page, pageSize, searchName, searchSku } =
        params;
      return api.post<{
        products?: ImportListItem[];
        total?: number;
        filtered?: number;
        available?: number;
        existing?: number;
        skuDuplicates?: number;
        page?: number;
        pageSize?: number;
        totalPages?: number;
      }>('/api/v2/integrations/imports/base', {
        action: 'list',
        connectionId,
        catalogId,
        inventoryId,
        limit: limit === 'all' ? undefined : Number(limit),
        uniqueOnly,
        page,
        pageSize,
        searchName,
        searchSku,
      });
    },
    enabled: enabled && !!inventoryId,
    meta: {
      source: 'importExport.hooks.useImportList',
      operation: 'detail',
      resource: 'integrations.import-export.import-list',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'import-list'],
    },
  });
}

export function useImportMutation(): MutationResult<
  ImportResponse,
  {
    connectionId?: string;
    inventoryId: string;
    catalogId: string;
    templateId?: string;
    limit?: number;
    imageMode: 'links' | 'download';
    uniqueOnly: boolean;
    allowDuplicateSku: boolean;
    selectedIds?: string[];
    dryRun?: boolean;
    mode?: BaseImportMode;
    requestId?: string;
  }
  > {
  const mutationKey = importExportKeys.lists();
  return createCreateMutationV2({
    mutationFn: (params) => api.post<ImportResponse>('/api/v2/integrations/imports/base/runs', params),
    mutationKey,
    meta: {
      source: 'importExport.hooks.useImportMutation',
      operation: 'create',
      resource: 'integrations.import-export.import-runs',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'import'],
    },
  });
}

export function useImportRuns(limit: number = 25): ListQuery<BaseImportRunRecord> {
  const queryKey = importExportKeys.runs();
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<BaseImportRunRecord[]> => {
      const data = await api.get<{ runs: BaseImportRunRecord[] }>(
        `/api/v2/integrations/imports/base/runs?limit=${encodeURIComponent(String(limit))}`,
        { cache: 'no-store' }
      );
      return data.runs ?? [];
    },
    meta: {
      source: 'importExport.hooks.useImportRuns',
      operation: 'list',
      resource: 'integrations.import-export.import-runs',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'import-runs'],
    },
  });
}

export function useImportRun(
  runId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    statuses?: Array<'pending' | 'processing' | 'imported' | 'updated' | 'skipped' | 'failed'>;
    page?: number;
    pageSize?: number;
    includeItems?: boolean;
  }
): SingleQuery<BaseImportRunDetailResponse> {
  const queryKey = importExportKeys.run(
    `${runId || '__none__'}:${JSON.stringify({
      statuses: options?.statuses ?? [],
      page: options?.page ?? null,
      pageSize: options?.pageSize ?? null,
      includeItems: options?.includeItems ?? null,
    })}`
  );
  return createSingleQueryV2({
    id: runId || null,
    queryKey,
    queryFn: () => {
      const search = new URLSearchParams();
      if (Array.isArray(options?.statuses) && options.statuses.length > 0) {
        search.set('statuses', options.statuses.join(','));
      }
      if (typeof options?.page === 'number') {
        search.set('page', String(options.page));
      }
      if (typeof options?.pageSize === 'number') {
        search.set('pageSize', String(options.pageSize));
      }
      if (typeof options?.includeItems === 'boolean') {
        search.set('includeItems', String(options.includeItems));
      }
      const query = search.toString();
      const endpoint = `/api/v2/integrations/imports/base/runs/${encodeURIComponent(runId)}${query ? `?${query}` : ''}`;
      return api.get<BaseImportRunDetailResponse>(endpoint, { cache: 'no-store' });
    },
    enabled: (options?.enabled ?? true) && !!runId,
    refetchInterval: options?.refetchInterval ?? false,
    meta: {
      source: 'importExport.hooks.useImportRun',
      operation: 'detail',
      resource: 'integrations.import-export.import-run',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'import-runs', 'status'],
    },
  });
}

export function useResumeImportRunMutation(
  runId: string
): MutationResult<
  BaseImportStartResponse,
  { statuses?: Array<'pending' | 'processing' | 'imported' | 'updated' | 'skipped' | 'failed'> }
> {
  const mutationKey = importExportKeys.run(runId || '__none__');
  return createMutationV2({
    mutationFn: (params) =>
      api.post<BaseImportStartResponse>(
        `/api/v2/integrations/imports/base/runs/${encodeURIComponent(runId)}/resume`,
        params
      ),
    mutationKey,
    meta: {
      source: 'importExport.hooks.useResumeImportRunMutation',
      operation: 'action',
      resource: 'integrations.import-export.import-run.resume',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'import-runs', 'resume'],
    },
  });
}

export function useCancelImportRunMutation(
  runId: string
): MutationResult<BaseImportStartResponse, void> {
  const mutationKey = importExportKeys.run(runId || '__none__');
  return createMutationV2({
    mutationFn: () =>
      api.post<BaseImportStartResponse>(
        `/api/v2/integrations/imports/base/runs/${encodeURIComponent(runId)}/cancel`,
        {}
      ),
    mutationKey,
    meta: {
      source: 'importExport.hooks.useCancelImportRunMutation',
      operation: 'action',
      resource: 'integrations.import-export.import-run.cancel',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'import-runs', 'cancel'],
    },
  });
}

export function useSaveExportSettingsMutation(): MutationResult<
  void,
  {
    exportActiveTemplateId?: string | null;
    exportInventoryId?: string | null;
    selectedBaseConnectionId?: string | null;
    exportStockFallbackEnabled?: boolean;
    imageRetryPresets?: ImageRetryPreset[];
    exportWarehouseId?: string | null;
  }
  > {
  const mutationKey = importExportKeys.preferences();

  return createUpdateMutationV2({
    mutationFn: async (params: {
      exportActiveTemplateId?: string | null;
      exportInventoryId?: string | null;
      selectedBaseConnectionId?: string | null;
      exportStockFallbackEnabled?: boolean;
      imageRetryPresets?: ImageRetryPreset[];
      exportWarehouseId?: string | null;
    }): Promise<void> => {
      const normalizedTemplateId = params.exportActiveTemplateId?.trim() || null;
      const normalizedInventoryId = params.exportInventoryId?.trim() || null;
      const normalizedConnectionId = params.selectedBaseConnectionId?.trim() || null;
      const normalizedWarehouseId = params.exportWarehouseId?.trim() || null;
      await Promise.all([
        api.post('/api/v2/integrations/exports/base/active-template', {
          templateId: normalizedTemplateId,
          connectionId: normalizedConnectionId,
          inventoryId: normalizedInventoryId,
        }),
        api.post('/api/v2/integrations/exports/base/default-inventory', {
          inventoryId: normalizedInventoryId,
        }),
        api.post('/api/v2/integrations/exports/base/default-connection', {
          connectionId: normalizedConnectionId,
        }),
        api.post('/api/v2/integrations/exports/base/stock-fallback', {
          enabled: params.exportStockFallbackEnabled,
        }),
        api.post('/api/v2/integrations/exports/base/image-retry-presets', {
          presets: params.imageRetryPresets,
        }),
        ...(normalizedInventoryId
          ? [
            api.post('/api/v2/integrations/imports/base/export-warehouse', {
              warehouseId: normalizedWarehouseId,
              inventoryId: normalizedInventoryId,
            }),
          ]
          : []),
      ]);
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useSaveExportSettingsMutation',
      operation: 'update',
      resource: 'integrations.import-export.export-settings',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'export-settings', 'save'],
    },
    invalidateKeys: [
      importExportKeys.preferences(),
      integrationKeys.selection.defaultConnection(),
      integrationKeys.defaultExportInventory(),
      integrationKeys.activeExportTemplate(),
    ],
  });
}

export function useSaveDefaultConnectionMutation(): MutationResult<
  { connectionId: string | null },
  { connectionId?: string | null }
  > {
  const mutationKey = importExportKeys.preferences();

  return createUpdateMutationV2({
    mutationFn: async ({
      connectionId,
    }: {
      connectionId?: string | null;
    }): Promise<{ connectionId: string | null }> => {
      const normalizedConnectionId = connectionId?.trim() || null;
      return api.post<{ connectionId: string | null }>(
        '/api/v2/integrations/exports/base/default-connection',
        { connectionId: normalizedConnectionId }
      );
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useSaveDefaultConnectionMutation',
      operation: 'update',
      resource: 'integrations.import-export.default-connection',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'default-connection', 'save'],
    },
    invalidateKeys: [
      integrationKeys.selection.defaultConnection(),
      importExportKeys.preferences(),
      importExportKeys.pref('default-connection'),
    ],
  });
}

export function useClearInventoryMutation(): MutationResult<void, void> {
  const mutationKey = importExportKeys.inventories(undefined);
  return createDeleteMutationV2({
    mutationFn: async () => {
      await Promise.all([
        api.post('/api/v2/integrations/imports/base/sample-product', {
          inventoryId: '',
          saveOnly: true,
        }),
        api.post('/api/v2/integrations/imports/base/parameters', {
          inventoryId: '',
          productId: '',
          clearOnly: true,
        }),
      ]);
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useClearInventoryMutation',
      operation: 'delete',
      resource: 'integrations.import-export.inventory-cache',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'inventory', 'clear'],
    },
    invalidateKeys: [
      importExportKeys.pref('sample-product'),
      importExportKeys.pref('parameter-cache'),
    ],
  });
}
