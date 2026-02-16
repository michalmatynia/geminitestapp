'use client';

import { useQueryClient } from '@tanstack/react-query';

import type {
  BaseInventory,
  CatalogOption as CatalogRecord,
  ImageRetryPreset,
  ImportListItem,
  ImportResponse,
  Template,
  WarehouseOption,
} from '@/features/data-import-export/types/imports';
import type { IntegrationWithConnections } from '@/features/integrations';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
  createSingleQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { importExportKeys, integrationKeys, productMetadataKeys } from '@/shared/lib/query-key-exports';
import type {
  ListQuery,
  MutationResult,
  SingleQuery,
} from '@/shared/types/query-result-types';

export type { CatalogRecord };

// --- Queries ---

export function useIntegrationConnections(): ListQuery<IntegrationWithConnections> {
  const queryKey = integrationKeys.withConnections();
  return createListQueryV2({
    queryKey,
    queryFn: () => api.get<IntegrationWithConnections[]>('/api/integrations/with-connections'),
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
  const endpoint = scope === 'import'
    ? '/api/integrations/import-templates'
    : '/api/integrations/export-templates';
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

export function useSavePreferenceMutation(): MutationResult<unknown, { endpoint: string; data: unknown }> {
  const queryClient = useQueryClient();
  const mutationKey = importExportKeys.preferences();

  return createUpdateMutationV2({
    mutationFn: ({ endpoint, data }: { endpoint: string; data: unknown }) => api.post<unknown>(endpoint, data),
    mutationKey,
    meta: {
      source: 'importExport.hooks.useSavePreferenceMutation',
      operation: 'update',
      resource: 'integrations.import-export.preference',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'preferences', 'save'],
    },
    onSuccess: (_: unknown, { endpoint }: { endpoint: string; data: unknown }) => {
      void queryClient.invalidateQueries({ queryKey: importExportKeys.preferences() });
      const key = endpoint.split('/').pop();
      if (key) {
        void queryClient.invalidateQueries({ queryKey: importExportKeys.pref(key) });
      }
    },
  });
}

export function useTemplateMutation(scope: 'import' | 'export', id?: string): MutationResult<unknown, { data?: unknown; isDelete?: boolean }> {
  const queryClient = useQueryClient();
  const endpoint = scope === 'import'
    ? '/api/integrations/import-templates'
    : '/api/integrations/export-templates';
  const mutationKey = importExportKeys.templates(scope);

  return createMutationV2({
    mutationFn: ({ data, isDelete = false }: { data?: unknown; isDelete?: boolean }): Promise<unknown> => {
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
    onSuccess: (result: unknown, variables: { data?: unknown; isDelete?: boolean }) => {
      queryClient.setQueryData<Template[]>(
        importExportKeys.templates(scope),
        (previous: Template[] | undefined): Template[] => {
          const current = previous ?? [];
          if (variables.isDelete) {
            return id ? current.filter((template: Template) => template.id !== id) : current;
          }
          if (!result || typeof result !== 'object') return current;
          const maybeTemplate = result as Partial<Template>;
          const templateId = typeof maybeTemplate.id === 'string' ? maybeTemplate.id : '';
          if (!templateId) return current;
          const nextTemplate = result as Template;
          const existingIndex = current.findIndex((template: Template) => template.id === templateId);
          if (existingIndex === -1) {
            return [nextTemplate, ...current];
          }
          return current.map((template: Template, index: number) =>
            index === existingIndex ? nextTemplate : template
          );
        }
      );
      void queryClient.invalidateQueries({ queryKey: importExportKeys.templates(scope) });
    },
  });
}

export function useInventories(connectionId?: string, enabled: boolean = true): ListQuery<BaseInventory> {
  const queryKey = importExportKeys.inventories(connectionId);
  return createListQueryV2({
    queryKey,
    queryFn: async (): Promise<BaseInventory[]> => {
      const data = await api.post<{ inventories: BaseInventory[] }>('/api/integrations/imports/base', { action: 'inventories', connectionId });
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
    queryFn: () => api.post<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }>('/api/integrations/imports/base', {
      action: 'warehouses',
      inventoryId,
      connectionId,
      includeAllWarehouses: includeAll,
    }),
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
    queryFn: () => api.post<{ parameters?: Array<{ id: string; name: string }> }>('/api/integrations/imports/base/parameters', {
      inventoryId,
      productId,
    }),
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
      const { connectionId, catalogId, limit, uniqueOnly, page, pageSize, searchName, searchSku } = params;
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
      }>('/api/integrations/imports/base', {
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

export function useImportMutation(): MutationResult<ImportResponse, {
  connectionId?: string;
  inventoryId: string;
  catalogId: string;
  templateId?: string;
  limit?: number;
  imageMode: 'links' | 'download';
  uniqueOnly: boolean;
  allowDuplicateSku: boolean;
  selectedIds?: string[];
}> {
  const mutationKey = importExportKeys.lists();
  return createCreateMutationV2({
    mutationFn: (params) => api.post<ImportResponse>('/api/integrations/imports/base', {
      action: 'import',
      ...params,
    }),
    mutationKey,
    meta: {
      source: 'importExport.hooks.useImportMutation',
      operation: 'create',
      resource: 'integrations.import-export.import',
      domain: 'integrations',
      mutationKey,
      tags: ['import-export', 'import'],
    },
  });
}

export function useSaveExportSettingsMutation(): MutationResult<void, {
  exportActiveTemplateId?: string | null;
  exportInventoryId?: string | null;
  selectedBaseConnectionId?: string | null;
  exportStockFallbackEnabled?: boolean;
  imageRetryPresets?: ImageRetryPreset[];
  exportWarehouseId?: string | null;
}> {
  const queryClient = useQueryClient();
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
        api.post('/api/integrations/exports/base/active-template', { templateId: normalizedTemplateId }),
        api.post('/api/integrations/exports/base/default-inventory', { inventoryId: normalizedInventoryId }),
        api.post('/api/integrations/exports/base/default-connection', { connectionId: normalizedConnectionId }),
        api.post('/api/integrations/exports/base/stock-fallback', { enabled: params.exportStockFallbackEnabled }),
        api.post('/api/integrations/exports/base/image-retry-presets', { presets: params.imageRetryPresets }),
        ...(normalizedInventoryId ? [
          api.post('/api/integrations/imports/base/export-warehouse', {
            warehouseId: normalizedWarehouseId,
            inventoryId: normalizedInventoryId,
          }),
        ] : []),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importExportKeys.preferences() });
    },
  });
}

export function useClearInventoryMutation(): MutationResult<void, void> {
  const mutationKey = importExportKeys.inventories(undefined);
  return createDeleteMutationV2({
    mutationFn: async () => {
      await Promise.all([
        api.post('/api/integrations/imports/base/sample-product', { inventoryId: '', saveOnly: true }),
        api.post('/api/integrations/imports/base/parameters', { inventoryId: '', productId: '', clearOnly: true }),
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
  });
}
