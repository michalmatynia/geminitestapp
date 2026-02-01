"use client";

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from "@tanstack/react-query";
import type { IntegrationWithConnections } from "@/features/integrations";
import type { CatalogOption as CatalogRecord, Template, ImageRetryPreset } from "@/features/data-import-export/types/imports";

export type { CatalogRecord };

export const importKeys = {
  all: ["import-export"] as const,
  connections: () => [...importKeys.all, "connections"] as const,
  catalogs: () => [...importKeys.all, "catalogs"] as const,
  templates: (scope: "import" | "export") => [...importKeys.all, "templates", scope] as const,
  preferences: () => [...importKeys.all, "preferences"] as const,
  pref: (key: string) => [...importKeys.preferences(), key] as const,
  inventories: (connectionId?: string) => [...importKeys.all, "inventories", { connectionId }] as const,
  warehouses: (inventoryId: string, connectionId?: string, includeAll?: boolean) => 
    [...importKeys.all, "warehouses", { inventoryId, connectionId, includeAll }] as const,
  parameters: (inventoryId: string, productId: string) => 
    [...importKeys.all, "parameters", { inventoryId, productId }] as const,
  importList: (inventoryId: string, limit?: string | number, uniqueOnly?: boolean) =>
    [...importKeys.all, "import-list", { inventoryId, limit, uniqueOnly }] as const,
};

// --- Queries ---

export function useIntegrationConnections(): UseQueryResult<IntegrationWithConnections[], Error> {
  return useQuery({
    queryKey: importKeys.connections(),
    queryFn: async () => {
      const res = await fetch("/api/integrations/with-connections");
      if (!res.ok) throw new Error("Failed to load integrations");
      return (await res.json()) as IntegrationWithConnections[];
    },
  });
}

export function useCatalogs(): UseQueryResult<CatalogRecord[], Error> {
  return useQuery({
    queryKey: importKeys.catalogs(),
    queryFn: async () => {
      const res = await fetch("/api/catalogs");
      if (!res.ok) throw new Error("Failed to load catalogs");
      return (await res.json()) as CatalogRecord[];
    },
  });
}

export function useTemplates(scope: "import" | "export"): UseQueryResult<Template[], Error> {
  const endpoint = scope === "import" 
    ? "/api/integrations/import-templates" 
    : "/api/integrations/export-templates";
    
  return useQuery({
    queryKey: importKeys.templates(scope),
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Failed to load ${scope} templates`);
      return (await res.json()) as Template[];
    },
  });
}

export function useImportPreference<T>(key: string, endpoint: string): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: importKeys.pref(key),
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Failed to load preference: ${key}`);
      return (await res.json()) as T;
    },
  });
}

// --- Mutations ---

export function useSavePreferenceMutation(): UseMutationResult<any, Error, { endpoint: string; data: any }> {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: any }): Promise<any> => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save preference");
      return (await res.json()) as any;
    },
    onSuccess: (_data: any, { endpoint }: { endpoint: string }) => {
      // Extract key from endpoint to invalidate specific pref
      const key = endpoint.split("/").pop();
      if (key) {
        void queryClient.invalidateQueries({ queryKey: importKeys.pref(key) });
      }
    }
  });
}

export function useTemplateMutation(scope: "import" | "export", id?: string): UseMutationResult<any, Error, { data?: any; isDelete?: boolean }> {
  const queryClient = useQueryClient();
  const endpoint = scope === "import" 
    ? "/api/integrations/import-templates" 
    : "/api/integrations/export-templates";
    
  return useMutation({
    mutationFn: async ({ data, isDelete = false }: { data?: any; isDelete?: boolean }): Promise<any> => {
      const url = id ? `${endpoint}/${id}` : endpoint;
      const method = isDelete ? "DELETE" : (id ? "PUT" : "POST");
      
      const res = await fetch(url, {
        method,
        headers: isDelete ? {} : { "Content-Type": "application/json" },
        body: isDelete ? undefined : JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error(`Failed to ${isDelete ? "delete" : "save"} template`);
      return (await res.json()) as any;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.templates(scope) });
    }
  });
}

export function useInventories(connectionId?: string, enabled: boolean = true): UseQueryResult<BaseInventory[], Error> {
  return useQuery({
    queryKey: importKeys.inventories(connectionId),
    queryFn: async () => {
      const res = await fetch("/api/integrations/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "inventories", connectionId }),
      });
      if (!res.ok) throw new Error("Failed to load inventories");
      const data = await res.json() as { inventories: BaseInventory[] };
      return data.inventories;
    },
    enabled,
  });
}

export function useWarehouses(inventoryId: string, connectionId?: string, includeAll: boolean = false, enabled: boolean = true): UseQueryResult<{ warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] }, Error> {
  return useQuery({
    queryKey: importKeys.warehouses(inventoryId, connectionId, includeAll),
    queryFn: async () => {
      const res = await fetch("/api/integrations/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "warehouses", inventoryId, connectionId, includeAllWarehouses: includeAll }),
      });
      if (!res.ok) throw new Error("Failed to load warehouses");
      return (await res.json()) as { warehouses?: WarehouseOption[]; allWarehouses?: WarehouseOption[] };
    },
    enabled: enabled && !!inventoryId,
  });
}

export function useParameters(inventoryId: string, productId: string, enabled: boolean = true): UseQueryResult<{ parameters?: Array<{ id: string; name: string }> }, Error> {
  return useQuery({
    queryKey: importKeys.parameters(inventoryId, productId),
    queryFn: async () => {
      const res = await fetch("/api/integrations/imports/base/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId, productId }),
      });
      if (!res.ok) throw new Error("Failed to load parameters");
      return (await res.json()) as { parameters?: Array<{ id: string; name: string }> };
    },
    enabled: enabled && !!inventoryId && !!productId,
  });
}

export function useImportList(inventoryId: string, limit?: string | number, uniqueOnly?: boolean, enabled: boolean = true): UseQueryResult<{ products?: ImportListItem[]; total?: number; filtered?: number; available?: number; existing?: number; skuDuplicates?: number }, Error> {
  return useQuery({
    queryKey: importKeys.importList(inventoryId, limit, uniqueOnly),
    queryFn: async () => {
      const res = await fetch("/api/integrations/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          inventoryId,
          limit: limit === "all" ? undefined : Number(limit),
          uniqueOnly,
        }),
      });
      if (!res.ok) throw new Error("Failed to load import list");
      return (await res.json()) as { products?: ImportListItem[]; total?: number; filtered?: number; available?: number; existing?: number; skuDuplicates?: number };
    },
    enabled: enabled && !!inventoryId,
  });
}

export function useImportMutation(): UseMutationResult<ImportResponse, Error, {
  inventoryId: string;
  catalogId: string;
  templateId?: string;
  limit?: number;
  imageMode: "links" | "download";
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
      imageMode: "links" | "download";
      uniqueOnly: boolean;
      allowDuplicateSku: boolean;
      selectedIds?: string[];
    }): Promise<ImportResponse> => {
      const res = await fetch("/api/integrations/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          ...params,
        }),
      });
      if (!res.ok) {
        const payload = await res.json() as { error?: string };
        throw new Error(payload.error || "Import failed");
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
    }) => {
      const requests = [
        fetch("/api/integrations/exports/base/active-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: params.exportActiveTemplateId }),
        }),
        fetch("/api/integrations/exports/base/default-inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId: params.exportInventoryId }),
        }),
        fetch("/api/integrations/exports/base/default-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId: params.selectedBaseConnectionId }),
        }),
        fetch("/api/integrations/exports/base/stock-fallback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: params.exportStockFallbackEnabled }),
        }),
        fetch("/api/integrations/exports/base/image-retry-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presets: params.imageRetryPresets }),
        }),
      ];
      
      if (params.exportInventoryId && params.exportWarehouseId !== undefined) {
        requests.push(
          fetch("/api/integrations/imports/base/export-warehouse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              warehouseId: params.exportWarehouseId,
              inventoryId: params.exportInventoryId,
            }),
          })
        );
      }
      
      const responses = await Promise.all(requests);
      if (responses.some((r: Response) => !r.ok)) throw new Error("Failed to save some settings");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.preferences() });
    }
  });
}
