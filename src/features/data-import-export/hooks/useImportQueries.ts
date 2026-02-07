'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import type { CatalogOption as CatalogRecord, Template, ImageRetryPreset, BaseInventory, WarehouseOption, ImportListItem, ImportResponse } from '@/features/data-import-export/types/imports';
import type { IntegrationWithConnections } from '@/features/integrations';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type { CatalogRecord };

const importKeys = QUERY_KEYS.integrations.importExport;

// --- Queries ---

export function useIntegrationConnections(): UseQueryResult<IntegrationWithConnections[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.integrations.all,
    queryFn: () => api.get<IntegrationWithConnections[]>('/api/integrations/with-connections'),
  });
}

export function useCatalogs(): UseQueryResult<CatalogRecord[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.products.catalogs,
    queryFn: () => api.get<CatalogRecord[]>('/api/catalogs'),
  });
}

export function useTemplates(scope: 'import' | 'export'): UseQueryResult<Template[], Error> {
  const endpoint = scope === 'import' 
    ? '/api/integrations/import-templates' 
    : '/api/integrations/export-templates';
    
  return useQuery({
    queryKey: importKeys.templates(scope),
    queryFn: () => api.get<Template[]>(endpoint),
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
): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: importKeys.pref(key),
    queryFn: async (): Promise<T> => {
      try {
        return await api.get<T>(endpoint);
      } catch (error) {
        if (options?.fallback !== undefined) return options.fallback;
        throw error;
      }
    },
    enabled: options?.enabled ?? true,
  });
}

// --- Mutations ---

export function useSavePreferenceMutation(): UseMutationResult<unknown, Error, { endpoint: string; data: unknown }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ endpoint, data }: { endpoint: string; data: unknown }) => api.post<unknown>(endpoint, data),
    onSuccess: (_: unknown, { endpoint }: { endpoint: string; data: unknown }) => {
      const key = endpoint.split('/').pop();
      if (key) {
        void queryClient.invalidateQueries({ queryKey: importKeys.pref(key) });
      }
    }
  });
}

export function useTemplateMutation(scope: 'import' | 'export', id?: string): UseMutationResult<unknown, Error, { data?: unknown; isDelete?: boolean }> {
  const queryClient = useQueryClient();
  const endpoint = scope === 'import' 
    ? '/api/integrations/import-templates' 
    : '/api/integrations/export-templates';
    
  return useMutation({
    mutationFn: ({ data, isDelete = false }: { data?: unknown; isDelete?: boolean }): Promise<unknown> => {
      const url = id ? `${endpoint}/${id}` : endpoint;
      if (isDelete) return api.delete(url);
      return id ? api.put(url, data) : api.post(url, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.templates(scope) });
    }
  });
}

export function useInventories(connectionId?: string, enabled: boolean = true): UseQueryResult<BaseInventory[], Error> {
  return useQuery({
    queryKey: importKeys.inventories(connectionId),
    queryFn: async (): Promise<BaseInventory[]> => {
      const data = await api.post<{ inventories: BaseInventory[] }>('/api/integrations/imports/base', { action: 'inventories', connectionId });
      return data.inventories;
    },
    enabled,
  });
}

export function useWarehouses(inventoryId: string, connectionId?: string, includeAll: boolean = false, enabled: boolean = true): UseQueryResult<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }, Error> {
  return useQuery({
    queryKey: importKeys.warehouses(inventoryId, connectionId, includeAll),
    queryFn: () => api.post<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }>('/api/integrations/imports/base', { 
      action: 'warehouses', 
      inventoryId, 
      connectionId, 
      includeAllWarehouses: includeAll 
    }),
    enabled: enabled && !!inventoryId,
  });
}

export function useParameters(inventoryId: string, productId: string, enabled: boolean = true): UseQueryResult<{ parameters?: Array<{ id: string; name: string }> }, Error> {
  return useQuery({
    queryKey: importKeys.parameters(inventoryId, productId),
    queryFn: () => api.post<{ parameters?: Array<{ id: string; name: string }> }>('/api/integrations/imports/base/parameters', { 
      inventoryId, 
      productId 
    }),
    enabled: enabled && !!inventoryId && !!productId,
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
): UseQueryResult<{ products?: ImportListItem[]; total?: number; filtered?: number; available?: number; existing?: number; skuDuplicates?: number; page?: number; pageSize?: number; totalPages?: number }, Error> {
  return useQuery({
    queryKey: importKeys.importList(inventoryId, params),
    queryFn: () => {
      const { limit, uniqueOnly, page, pageSize, searchName, searchSku } = params;
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
  });
}

export function useImportMutation(): UseMutationResult<ImportResponse, Error, {
  inventoryId: string;
  catalogId: string;
  templateId?: string;
  limit?: number;
  imageMode: 'links' | 'download';
  uniqueOnly: boolean;
  allowDuplicateSku: boolean;
  selectedIds?: string[];
}> {
  return useMutation({
    mutationFn: (params) => api.post<ImportResponse>('/api/integrations/imports/base', {
      action: 'import',
      ...params,
    }),
  });
}

export function useSaveExportSettingsMutation(): UseMutationResult<void, Error, {
  exportActiveTemplateId?: string | null;
  exportInventoryId?: string | null;
  selectedBaseConnectionId?: string | null;
  exportStockFallbackEnabled?: boolean;
  imageRetryPresets?: ImageRetryPreset[];
  exportWarehouseId?: string | null;
}> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      exportActiveTemplateId?: string | null;
      exportInventoryId?: string | null;
      selectedBaseConnectionId?: string | null;
      exportStockFallbackEnabled?: boolean;
      imageRetryPresets?: ImageRetryPreset[];
      exportWarehouseId?: string | null;
    }): Promise<void> => {
      await Promise.all([
        api.post('/api/integrations/exports/base/active-template', { templateId: params.exportActiveTemplateId }),
        api.post('/api/integrations/exports/base/default-inventory', { inventoryId: params.exportInventoryId }),
        api.post('/api/integrations/exports/base/default-connection', { connectionId: params.selectedBaseConnectionId }),
        api.post('/api/integrations/exports/base/stock-fallback', { enabled: params.exportStockFallbackEnabled }),
        api.post('/api/integrations/exports/base/image-retry-presets', { presets: params.imageRetryPresets }),
        ...(params.exportInventoryId && params.exportWarehouseId !== undefined ? [
          api.post('/api/integrations/imports/base/export-warehouse', {
            warehouseId: params.exportWarehouseId,
            inventoryId: params.exportInventoryId,
          })
        ] : []),
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.preferences() });
    }
  });
}