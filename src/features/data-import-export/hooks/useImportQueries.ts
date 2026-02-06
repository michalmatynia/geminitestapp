'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

import type { CatalogOption as CatalogRecord, Template, ImageRetryPreset, BaseInventory, WarehouseOption, ImportListItem, ImportResponse } from '@/features/data-import-export/types/imports';
import type { IntegrationWithConnections } from '@/features/integrations';

export type { CatalogRecord };

export const importKeys = {
  all: ['import-export'] as const,
  connections: () => [...importKeys.all, 'connections'] as const,
  catalogs: () => [...importKeys.all, 'catalogs'] as const,
  templates: (scope: 'import' | 'export') => [...importKeys.all, 'templates', scope] as const,
  preferences: () => [...importKeys.all, 'preferences'] as const,
  pref: (key: string) => [...importKeys.preferences(), key] as const,
  inventories: (connectionId?: string) => [...importKeys.all, 'inventories', { connectionId }] as const,
  warehouses: (inventoryId: string, connectionId?: string, includeAll?: boolean) => 
    [...importKeys.all, 'warehouses', { inventoryId, connectionId, includeAll }] as const,
  parameters: (inventoryId: string, productId: string) => 
    [...importKeys.all, 'parameters', { inventoryId, productId }] as const,
  importList: (inventoryId: string, params: { limit?: string | number; uniqueOnly?: boolean; page?: number; pageSize?: number; searchName?: string; searchSku?: string }) =>
    [...importKeys.all, 'import-list', { inventoryId, ...params }] as const,
};

// --- Queries ---

export function useIntegrationConnections(): UseQueryResult<IntegrationWithConnections[], Error> {
  return useQuery({
    queryKey: importKeys.connections(),
    queryFn: async (): Promise<IntegrationWithConnections[]> => {
      const res = await fetch('/api/integrations/with-connections');
      if (!res.ok) throw new Error('Failed to load integrations');
      return (await res.json()) as IntegrationWithConnections[];
    },
  });
}

export function useCatalogs(): UseQueryResult<CatalogRecord[], Error> {
  return useQuery({
    queryKey: importKeys.catalogs(),
    queryFn: async (): Promise<CatalogRecord[]> => {
      const res = await fetch('/api/catalogs');
      if (!res.ok) throw new Error('Failed to load catalogs');
      return (await res.json()) as CatalogRecord[];
    },
  });
}

export function useTemplates(scope: 'import' | 'export'): UseQueryResult<Template[], Error> {
  const endpoint = scope === 'import' 
    ? '/api/integrations/import-templates' 
    : '/api/integrations/export-templates';
    
  return useQuery({
    queryKey: importKeys.templates(scope),
    queryFn: async (): Promise<Template[]> => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Failed to load ${scope} templates`);
      return (await res.json()) as Template[];
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
): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: importKeys.pref(key),
    queryFn: async (): Promise<T> => {
      const res = await fetch(endpoint);
      if (!res.ok) {
        if (options?.fallback !== undefined) return options.fallback;
        throw new Error(`Failed to load preference: ${key}`);
      }
      return (await res.json()) as T;
    },
    enabled: options?.enabled ?? true,
  });
}

// --- Mutations ---

export function useSavePreferenceMutation(): UseMutationResult<unknown, Error, { endpoint: string; data: unknown }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: unknown }): Promise<unknown> => {
      if (!endpoint || !endpoint.startsWith('/api/')) {
        throw new Error(`Invalid preference endpoint: ${String(endpoint)}`);
      }

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (error) {
        // Usually indicates a network-level problem (server down, request aborted) or an invalid URL.
        throw new Error(
          `Failed to reach ${endpoint}: ${error instanceof Error ? error.message : 'network error'}`
        );
      }
      if (!res.ok) throw new Error('Failed to save preference');
      return res.json();
    },
    onSuccess: (_: unknown, { endpoint }: { endpoint: string; data: unknown }) => {
      // Extract key from endpoint to invalidate specific pref
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
    mutationFn: async ({ data, isDelete = false }: { data?: unknown; isDelete?: boolean }): Promise<unknown> => {
      const url = id ? `${endpoint}/${id}` : endpoint;
      const method = isDelete ? 'DELETE' : (id ? 'PUT' : 'POST');
      
      const fetchOptions: RequestInit = {
        method,
        headers: isDelete ? {} : { 'Content-Type': 'application/json' },
      };
      if (!isDelete) fetchOptions.body = JSON.stringify(data);
      
      const res = await fetch(url, fetchOptions);
      
      if (!res.ok) throw new Error(`Failed to ${isDelete ? 'delete' : 'save'} template`);
      return res.json();
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
      const res = await fetch('/api/integrations/imports/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inventories', connectionId }),
      });
      if (!res.ok) throw new Error('Failed to load inventories');
      const data = await res.json() as { inventories: BaseInventory[] };
      return data.inventories;
    },
    enabled,
  });
}

export function useWarehouses(inventoryId: string, connectionId?: string, includeAll: boolean = false, enabled: boolean = true): UseQueryResult<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }, Error> {
  return useQuery({
    queryKey: importKeys.warehouses(inventoryId, connectionId, includeAll),
    queryFn: async (): Promise<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }> => {
      const res = await fetch('/api/integrations/imports/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'warehouses', inventoryId, connectionId, includeAllWarehouses: includeAll }),
      });
      if (!res.ok) throw new Error('Failed to load warehouses');
      return (await res.json()) as { warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] };
    },
    enabled: enabled && !!inventoryId,
  });
}

export function useParameters(inventoryId: string, productId: string, enabled: boolean = true): UseQueryResult<{ parameters?: Array<{ id: string; name: string }> }, Error> {
  return useQuery({
    queryKey: importKeys.parameters(inventoryId, productId),
    queryFn: async (): Promise<{ parameters?: Array<{ id: string; name: string }> }> => {
      const res = await fetch('/api/integrations/imports/base/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId, productId }),
      });
      if (!res.ok) throw new Error('Failed to load parameters');
      return (await res.json()) as { parameters?: Array<{ id: string; name: string }> };
    },
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
    queryFn: async (): Promise<{ products?: ImportListItem[]; total?: number; filtered?: number; available?: number; existing?: number; skuDuplicates?: number; page?: number; pageSize?: number; totalPages?: number }> => {
      const { limit, uniqueOnly, page, pageSize, searchName, searchSku } = params;
      const res = await fetch('/api/integrations/imports/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          inventoryId,
          limit: limit === 'all' ? undefined : Number(limit),
          uniqueOnly,
          page,
          pageSize,
          searchName,
          searchSku,
        }),
      });
      if (!res.ok) throw new Error('Failed to load import list');
      return (await res.json()) as { products?: ImportListItem[]; total?: number; filtered?: number; available?: number; existing?: number; skuDuplicates?: number; page?: number; pageSize?: number; totalPages?: number };
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
    mutationFn: async (params: {
      inventoryId: string;
      catalogId: string;
      templateId?: string;
      limit?: number;
      imageMode: 'links' | 'download';
      uniqueOnly: boolean;
      allowDuplicateSku: boolean;
      selectedIds?: string[];
    }): Promise<ImportResponse> => {
      const res = await fetch('/api/integrations/imports/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          ...params,
        }),
      });
      if (!res.ok) {
        const payload = await res.json() as { error?: string };
        throw new Error(payload.error || 'Import failed');
      }
      return (await res.json()) as ImportResponse;
    },
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
      const requests = [
        fetch('/api/integrations/exports/base/active-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: params.exportActiveTemplateId }),
        }),
        fetch('/api/integrations/exports/base/default-inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inventoryId: params.exportInventoryId }),
        }),
        fetch('/api/integrations/exports/base/default-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId: params.selectedBaseConnectionId }),
        }),
        fetch('/api/integrations/exports/base/stock-fallback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: params.exportStockFallbackEnabled }),
        }),
        fetch('/api/integrations/exports/base/image-retry-presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presets: params.imageRetryPresets }),
        }),
      ];
      
      if (params.exportInventoryId && params.exportWarehouseId !== undefined) {
        requests.push(
          fetch('/api/integrations/imports/base/export-warehouse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              warehouseId: params.exportWarehouseId,
              inventoryId: params.exportInventoryId,
            }),
          })
        );
      }
      
      const responses = await Promise.all(requests);
      if (responses.some((r: Response) => !r.ok)) throw new Error('Failed to save some settings');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.preferences() });
    }
  });
}
