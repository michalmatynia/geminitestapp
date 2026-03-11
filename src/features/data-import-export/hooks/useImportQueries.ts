'use client';

import type {
  BaseActiveTemplatePreferencePayload,
  BaseImportInventoriesPayload,
  BaseImportInventoriesResponse,
  BaseImportListPayload,
  BaseImportListResponse,
  BaseImportParametersClearResponse,
  BaseImportParametersPayload,
  BaseImportParametersResponse,
  BaseImportWarehousesPayload,
  BaseImportWarehousesResponse,
  BaseActiveTemplatePreferenceResponse,
  BaseDefaultConnectionPreferencePayload,
  BaseDefaultConnectionPreferenceResponse,
  BaseDefaultInventoryPreferencePayload,
  BaseDefaultInventoryPreferenceResponse,
  BaseImageRetryPresetsPayload,
  BaseImageRetryPresetsResponse,
  BaseSampleProductPayload,
  BaseSampleProductResponse,
  BaseStockFallbackPreferencePayload,
  BaseStockFallbackPreferenceResponse,
  CatalogOption as CatalogRecord,
  ImportExportTemplateCreateInput,
  BaseImportRunDetailResponse,
  BaseImportRunResumePayload,
  BaseImportRunStartPayload,
  BaseImportStartResponse,
  BaseImportItemStatus,
  ImportParameterCacheResponse,
  BaseInventory,
  IntegrationWithConnections,
  ImageRetryPreset,
  BaseImportStartResponse as ImportResponse,
  IntegrationTemplate as Template,
} from '@/shared/contracts/integrations';
import type {
  ProductParameter,
  ProductSimpleParameter,
} from '@/shared/contracts/products';
import type { DeleteResponse, ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui';
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
      description: 'Loads integrations connections.'},
  });
}

export function useCatalogs(): ListQuery<CatalogRecord> {
  const queryKey = productMetadataKeys.catalogs();
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<CatalogRecord[]>('/api/v2/products/entities/catalogs'),
    meta: {
      source: 'importExport.hooks.useCatalogs',
      operation: 'list',
      resource: 'products.metadata.catalogs',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'catalogs'],
      description: 'Loads products metadata catalogs.'},
  });
}

export function useProductParameters(catalogId: string | null): ListQuery<ProductParameter> {
  const queryKey = productMetadataKeys.parameters(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductParameter[]>('/api/v2/products/parameters', {
        params: { catalogId },
        cache: 'no-store',
      });
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'importExport.hooks.useProductParameters',
      operation: 'list',
      resource: 'products.metadata.parameters',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'products', 'parameters'],
      description: 'Loads products metadata parameters for import export.'},
  });
}

export function useProductSimpleParameters(
  catalogId: string | null
): ListQuery<ProductSimpleParameter> {
  const queryKey = productMetadataKeys.simpleParameters(catalogId ?? null);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<ProductSimpleParameter[]> => {
      if (!catalogId) return [];
      return await api.get<ProductSimpleParameter[]>(
        `/api/v2/products/simple-parameters?catalogId=${encodeURIComponent(catalogId)}`
      );
    },
    enabled: Boolean(catalogId),
    meta: {
      source: 'importExport.hooks.useProductSimpleParameters',
      operation: 'list',
      resource: 'products.metadata.simple-parameters',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'products', 'simple-parameters'],
      description: 'Loads products metadata simple parameters for import export.'},
  });
}

export function useTemplates(scope: 'import' | 'export'): ListQuery<Template> {
  const endpoint = scope === 'import' ? '/api/v2/templates/import' : '/api/v2/templates/export';
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
      description: 'Loads use templates.'},
  });
}

type ImportPreferenceOptions<T> = {
  fallback?: T;
  enabled?: boolean;
};

type RefreshImportParameterCacheVariables = {
  inventoryId: string;
  connectionId: string;
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
      description: 'Loads integrations import export preference.'},
  });
}

// --- Mutations ---

export function useSavePreferenceMutation(): MutationResult<
  BaseActiveTemplatePreferenceResponse,
  { endpoint: string; data: BaseActiveTemplatePreferencePayload }
  > {
  const mutationKey = importExportKeys.preferences();

  return createUpdateMutationV2({
    mutationFn: ({
      endpoint,
      data,
    }: {
      endpoint: string;
      data: BaseActiveTemplatePreferencePayload;
    }) => api.post<BaseActiveTemplatePreferenceResponse>(endpoint, data),
    mutationKey,
    meta: {
      source: 'importExport.hooks.useSavePreferenceMutation',
      operation: 'update',
      resource: 'integrations.import-export.preference',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'preferences', 'save'],
      description: 'Updates integrations import export preference.'},
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
): MutationResult<
  Template | DeleteResponse,
  { data?: ImportExportTemplateCreateInput; isDelete?: boolean }
> {
  const endpoint = scope === 'import' ? '/api/v2/templates/import' : '/api/v2/templates/export';
  const mutationKey = importExportKeys.templates(scope);

  return createMutationV2({
    mutationFn: ({
      data,
      isDelete = false,
    }: {
      data?: ImportExportTemplateCreateInput;
      isDelete?: boolean;
    }): Promise<Template | DeleteResponse> => {
      const url = id ? `${endpoint}/${id}` : endpoint;
      if (isDelete) return api.delete<DeleteResponse>(url);
      return id ? api.put<Template>(url, data) : api.post<Template>(url, data);
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useTemplateMutation',
      operation: 'action',
      resource: `integrations.import-export.templates.${scope}`,
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'templates', scope, 'save'],
      description: 'Runs use template mutation.'},
    invalidateKeys: [importExportKeys.templates(scope)],
  });
}

export function useInventories(
  connectionId: string,
  enabled: boolean = true
): ListQuery<BaseInventory> {
  const queryKey = importExportKeys.inventories(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<BaseInventory[]> => {
      const normalizedConnectionId = connectionId.trim();
      if (!normalizedConnectionId) {
        throw new Error('Base.com connection is required to load inventories.');
      }
      const data = await api.post<BaseImportInventoriesResponse>(
        '/api/v2/integrations/imports/base',
        {
          action: 'inventories',
          connectionId: normalizedConnectionId,
        } satisfies BaseImportInventoriesPayload
      );
      return data.inventories;
    },
    enabled: enabled && !!connectionId.trim(),
    meta: {
      source: 'importExport.hooks.useInventories',
      operation: 'list',
      resource: 'integrations.import-export.inventories',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'inventories'],
      description: 'Loads integrations import export inventories.'},
  });
}

export function useWarehouses(
  inventoryId: string,
  connectionId: string,
  includeAll: boolean = false,
  enabled: boolean = true
): SingleQuery<BaseImportWarehousesResponse> {
  const queryKey = importExportKeys.warehouses(inventoryId, connectionId, includeAll);
  return createSingleQueryV2({
    id: inventoryId || null,
    queryKey,
    queryFn: () => {
      const normalizedConnectionId = connectionId.trim();
      if (!normalizedConnectionId) {
        throw new Error('Base.com connection is required to load warehouses.');
      }
      return api.post<BaseImportWarehousesResponse>(
        '/api/v2/integrations/imports/base',
        {
          action: 'warehouses',
          inventoryId,
          connectionId: normalizedConnectionId,
          includeAllWarehouses: includeAll,
        } satisfies BaseImportWarehousesPayload
      );
    },
    enabled: enabled && !!inventoryId && !!connectionId.trim(),
    meta: {
      source: 'importExport.hooks.useWarehouses',
      operation: 'detail',
      resource: 'integrations.import-export.warehouses',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'warehouses'],
      description: 'Loads integrations import export warehouses.'},
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
      description: 'Loads integrations import export parameter cache.'},
  });
}

export function useRefreshImportParameterCacheMutation(): MutationResult<
  BaseImportParametersResponse,
  RefreshImportParameterCacheVariables
  > {
  const mutationKey = importExportKeys.lists();

  return createMutationV2({
    mutationFn: async ({
      inventoryId,
      connectionId,
    }: RefreshImportParameterCacheVariables): Promise<BaseImportParametersResponse> => {
      const normalizedInventoryId = inventoryId.trim();
      if (!normalizedInventoryId) {
        throw new Error('Inventory ID is required to load source fields.');
      }

      const normalizedConnectionId = connectionId.trim();
      if (!normalizedConnectionId) {
        throw new Error('Base.com connection is required to load source fields.');
      }
      return api.post<BaseImportParametersResponse>(
        '/api/v2/integrations/imports/base/parameters',
        {
          inventoryId: normalizedInventoryId,
          sampleSize: 8,
          connectionId: normalizedConnectionId,
        } satisfies BaseImportParametersPayload
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
      description: 'Runs integrations import export parameter cache refresh.'},
    invalidateKeys: [
      importExportKeys.pref('sample-product'),
      importExportKeys.pref('parameter-cache'),
    ],
  });
}

export function useImportList(
  inventoryId: string,
  params: {
    connectionId: string;
    catalogId?: string;
    limit?: string | number;
    uniqueOnly?: boolean;
    page?: number;
    pageSize?: number;
    searchName?: string;
    searchSku?: string;
  },
  enabled: boolean = true
): SingleQuery<BaseImportListResponse> {
  const queryKey = importExportKeys.importList(inventoryId, params);
  return createSingleQueryV2({
    id: inventoryId || null,
    queryKey,
    queryFn: () => {
      const { connectionId, catalogId, limit, uniqueOnly, page, pageSize, searchName, searchSku } =
        params;
      const normalizedConnectionId = connectionId.trim();
      if (!normalizedConnectionId) {
        throw new Error('Base.com connection is required to load import list.');
      }
      return api.post<BaseImportListResponse>(
        '/api/v2/integrations/imports/base',
        {
          action: 'list',
          connectionId: normalizedConnectionId,
          catalogId,
          inventoryId,
          limit: limit === 'all' ? undefined : Number(limit),
          uniqueOnly,
          page,
          pageSize,
          searchName,
          searchSku,
        } satisfies BaseImportListPayload
      );
    },
    enabled: enabled && !!inventoryId && !!params.connectionId.trim(),
    meta: {
      source: 'importExport.hooks.useImportList',
      operation: 'detail',
      resource: 'integrations.import-export.import-list',
      domain: 'integrations',
      queryKey,
      tags: ['import-export', 'import-list'],
      description: 'Loads integrations import export import list.'},
  });
}

export function useImportMutation(): MutationResult<
  ImportResponse,
  BaseImportRunStartPayload
  > {
  const mutationKey = importExportKeys.lists();
  return createCreateMutationV2({
    mutationFn: (params) => {
      const normalizedConnectionId = params.connectionId.trim();
      if (!normalizedConnectionId) {
        throw new Error('Base.com connection is required to start import.');
      }
      return api.post<ImportResponse>('/api/v2/integrations/imports/base/runs', {
        ...params,
        connectionId: normalizedConnectionId,
      });
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useImportMutation',
      operation: 'create',
      resource: 'integrations.import-export.import-runs',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'import'],
      description: 'Creates integrations import export import runs.'},
  });
}

export function useImportRun(
  runId: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    statuses?: BaseImportItemStatus[];
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
      description: 'Loads integrations import export import run.'},
  });
}

export function useResumeImportRunMutation(
  runId: string
): MutationResult<
  BaseImportStartResponse,
  BaseImportRunResumePayload
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
      description: 'Runs integrations import export import run resume.'},
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
      description: 'Runs integrations import export import run cancel.'},
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
      const requests: Array<Promise<unknown>> = [
        api.post<BaseActiveTemplatePreferenceResponse>(
          '/api/v2/integrations/exports/base/active-template',
          {
            templateId: normalizedTemplateId,
            connectionId: normalizedConnectionId,
            inventoryId: normalizedInventoryId,
          } satisfies BaseActiveTemplatePreferencePayload
        ),
        api.post<BaseDefaultInventoryPreferenceResponse>(
          '/api/v2/integrations/exports/base/default-inventory',
          {
            inventoryId: normalizedInventoryId,
          } satisfies BaseDefaultInventoryPreferencePayload
        ),
        api.post<BaseDefaultConnectionPreferenceResponse>(
          '/api/v2/integrations/exports/base/default-connection',
          {
            connectionId: normalizedConnectionId,
          } satisfies BaseDefaultConnectionPreferencePayload
        ),
        api.post<BaseStockFallbackPreferenceResponse>(
          '/api/v2/integrations/exports/base/stock-fallback',
          {
            enabled: Boolean(params.exportStockFallbackEnabled),
          } satisfies BaseStockFallbackPreferencePayload
        ),
      ];
      if (Array.isArray(params.imageRetryPresets)) {
        requests.push(
          api.post<BaseImageRetryPresetsResponse>(
            '/api/v2/integrations/exports/base/image-retry-presets',
            {
              presets: params.imageRetryPresets,
            } satisfies BaseImageRetryPresetsPayload
          )
        );
      }
      if (normalizedInventoryId) {
        requests.push(
          api.post('/api/v2/integrations/exports/base/export-warehouse', {
            warehouseId: normalizedWarehouseId,
            inventoryId: normalizedInventoryId,
          })
        );
      }
      await Promise.all(requests);
    },
    mutationKey,
    meta: {
      source: 'importExport.hooks.useSaveExportSettingsMutation',
      operation: 'update',
      resource: 'integrations.import-export.export-settings',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'export-settings', 'save'],
      description: 'Updates integrations import export export settings.'},
    invalidateKeys: [
      importExportKeys.preferences(),
      integrationKeys.selection.defaultConnection(),
      integrationKeys.defaultExportInventory(),
      integrationKeys.activeExportTemplate(),
    ],
  });
}

export function useSaveDefaultConnectionMutation(): MutationResult<
  BaseDefaultConnectionPreferenceResponse,
  BaseDefaultConnectionPreferencePayload
  > {
  const mutationKey = importExportKeys.preferences();

  return createUpdateMutationV2({
    mutationFn: async ({
      connectionId,
    }: BaseDefaultConnectionPreferencePayload): Promise<BaseDefaultConnectionPreferenceResponse> => {
      const normalizedConnectionId = connectionId?.trim() || null;
      return api.post<BaseDefaultConnectionPreferenceResponse>(
        '/api/v2/integrations/exports/base/default-connection',
        {
          connectionId: normalizedConnectionId,
        } satisfies BaseDefaultConnectionPreferencePayload
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
      description: 'Updates integrations import export default connection.'},
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
        api.post<BaseSampleProductResponse>('/api/v2/integrations/imports/base/sample-product', {
          inventoryId: '',
          saveOnly: true,
        } satisfies BaseSampleProductPayload),
        api.post<BaseImportParametersClearResponse>(
          '/api/v2/integrations/imports/base/parameters',
          {
            inventoryId: '',
            productId: '',
            clearOnly: true,
          } satisfies BaseImportParametersPayload
        ),
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
      description: 'Deletes integrations import export inventory cache.'},
    invalidateKeys: [
      importExportKeys.pref('sample-product'),
      importExportKeys.pref('parameter-cache'),
    ],
  });
}
