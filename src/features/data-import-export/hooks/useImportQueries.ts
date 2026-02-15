'use client';

import { useQueryClient } from '@tanstack/react-query';


import type { CatalogOption as CatalogRecord, Template, ImageRetryPreset, BaseInventory, WarehouseOption, ImportListItem, ImportResponse } from '@/features/data-import-export/types/imports';
import type { IntegrationWithConnections } from '@/features/integrations';
import { api } from '@/shared/lib/api-client';
import {
  createListQuery,
  createSingleQuery,
  createCreateMutation,
} from '@/shared/lib/query-factories';
import { importExportKeys, integrationKeys, productMetadataKeys } from '@/shared/lib/query-key-exports';
import type { 
  ListQuery, 
  SingleQuery, 
  MutationResult
} from '@/shared/types/query-result-types';

export type { CatalogRecord };

// --- Queries ---

export function useIntegrationConnections(): ListQuery<IntegrationWithConnections> {
  return createListQuery({
    queryKey: integrationKeys.withConnections(),
    queryFn: () => api.get<IntegrationWithConnections[]>('/api/integrations/with-connections'),
  });
}

export function useCatalogs(): ListQuery<CatalogRecord> {
  return createListQuery({
    queryKey: productMetadataKeys.catalogs(),
    queryFn: () => api.get<CatalogRecord[]>('/api/catalogs'),
  });
}

export function useTemplates(scope: 'import' | 'export'): ListQuery<Template> {
  const endpoint = scope === 'import' 
    ? '/api/integrations/import-templates' 
    : '/api/integrations/export-templates';
    
  return createListQuery({
    queryKey: importExportKeys.templates(scope),
    queryFn: () => api.get<Template[]>(endpoint, { cache: 'no-store' }),
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
  return createSingleQuery({
    queryKey: importExportKeys.pref(key),
    queryFn: async (): Promise<T> => {
      try {
        return await api.get<T>(endpoint, { cache: 'no-store' });
      } catch (error) {
        if (options?.fallback !== undefined) return options.fallback;
        throw error;
      }
    },
    options: {
      enabled: options?.enabled ?? true,
    },
  });
}

// --- Mutations ---

export function useSavePreferenceMutation(): MutationResult<unknown, { endpoint: string; data: unknown }> {
  const queryClient = useQueryClient();
  
  return createCreateMutation({
    mutationFn: ({ endpoint, data }: { endpoint: string; data: unknown }) => api.post<unknown>(endpoint, data),
    options: {
      onSuccess: (_: unknown, { endpoint }: { endpoint: string; data: unknown }) => {
        void queryClient.invalidateQueries({ queryKey: importExportKeys.preferences() });
        const key = endpoint.split('/').pop();
        if (key) {
          void queryClient.invalidateQueries({ queryKey: importExportKeys.pref(key) });
        }
      }
    },
  });
}

export function useTemplateMutation(scope: 'import' | 'export', id?: string): MutationResult<unknown, { data?: unknown; isDelete?: boolean }> {
  const queryClient = useQueryClient();
  const endpoint = scope === 'import' 
    ? '/api/integrations/import-templates' 
    : '/api/integrations/export-templates';
    
  return createCreateMutation({
    mutationFn: ({ data, isDelete = false }: { data?: unknown; isDelete?: boolean }): Promise<unknown> => {
      const url = id ? `${endpoint}/${id}` : endpoint;
      if (isDelete) return api.delete(url);
      return id ? api.put(url, data) : api.post(url, data);
    },
    options: {
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
            const nextTemplate = maybeTemplate;
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
      }
    },
  });
}

export function useInventories(connectionId?: string, enabled: boolean = true): ListQuery<BaseInventory> {
  return createListQuery({
    queryKey: importExportKeys.inventories(connectionId),
    queryFn: async (): Promise<BaseInventory[]> => {
      const data = await api.post<{ inventories: BaseInventory[] }>('/api/integrations/imports/base', { action: 'inventories', connectionId });
      return data.inventories;
    },
    options: { enabled },
  });
}

export function useWarehouses(inventoryId: string, connectionId?: string, includeAll: boolean = false, enabled: boolean = true): SingleQuery<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }> {
  return createSingleQuery({
    queryKey: importExportKeys.warehouses(inventoryId, connectionId, includeAll),
    queryFn: () => api.post<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }>('/api/integrations/imports/base', { 
      action: 'warehouses', 
      inventoryId, 
      connectionId, 
      includeAllWarehouses: includeAll 
    }),
    options: {
      enabled: enabled && !!inventoryId,
    },
  });
}

export function useParameters(inventoryId: string, productId: string, enabled: boolean = true): SingleQuery<{ parameters?: Array<{ id: string; name: string }> }> {
  return createSingleQuery({
    queryKey: importExportKeys.parameters(inventoryId, productId),
    queryFn: () => api.post<{ parameters?: Array<{ id: string; name: string }> }>('/api/integrations/imports/base/parameters', { 
      inventoryId, 
      productId 
    }),
    options: {
      enabled: enabled && !!inventoryId && !!productId,
    },
  });
}

export function useImportList(
  inventoryId: string,
  params: {
    limit?: string | number;
    uniqueOnly?: boolean;
    page?: number;
    pageSize?: number;
    searchName?: string;
    searchSku?: string;
  },
  enabled: boolean = true
): SingleQuery<{ products?: ImportListItem[]; total?: number; filtered?: number; available?: number; existing?: number; skuDuplicates?: number; page?: number; pageSize?: number; totalPages?: number }> {
  return createSingleQuery({
    queryKey: importExportKeys.importList(inventoryId, params),
    queryFn: () => {
      const { limit, uniqueOnly, page, pageSize, searchName, searchSku } = params;
      return api.get<{
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
        params: {
          action: 'list',
          inventoryId,
          limit: limit === 'all' ? undefined : Number(limit),
          uniqueOnly,
          page,
          pageSize,
          searchName,
          searchSku,
        }
      });
    },
    options: {
      enabled: enabled && !!inventoryId,
    },
  });
}

export function useImportMutation(): MutationResult<ImportResponse, {
  inventoryId: string;
  catalogId: string;
  templateId?: string;
  limit?: number;
  imageMode: 'links' | 'download';
  uniqueOnly: boolean;
  allowDuplicateSku: boolean;
  selectedIds?: string[];
}> {
  return createCreateMutation({
    mutationFn: (params) => api.post<ImportResponse>('/api/integrations/imports/base', {
      action: 'import',
      ...params,
    }),
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
  
  return createCreateMutation({
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
          })
        ] : []),
      ]);
    },
    options: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: importExportKeys.preferences() });
      }
    },
  });
}

export function useClearInventoryMutation(): MutationResult<void, void> {
  return createCreateMutation({
    mutationFn: async () => {
      await Promise.all([
        api.post('/api/integrations/imports/base/sample-product', { inventoryId: '', saveOnly: true }),
        api.post('/api/integrations/imports/base/parameters', { inventoryId: '', productId: '', clearOnly: true }),
      ]);
    },
  });
}
