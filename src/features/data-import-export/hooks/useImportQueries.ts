"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IntegrationWithConnections } from "@/features/integrations";
import type { CatalogOption, Template, ImageRetryPreset } from "@/features/data-import-export/types/imports";

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

export function useIntegrationConnections() {
  return useQuery({
    queryKey: importKeys.connections(),
    queryFn: async () => {
      const res = await fetch("/api/integrations/with-connections");
      if (!res.ok) throw new Error("Failed to load integrations");
      return (await res.json()) as IntegrationWithConnections[];
    },
  });
}

export function useCatalogs() {
  return useQuery({
    queryKey: importKeys.catalogs(),
    queryFn: async () => {
      const res = await fetch("/api/catalogs");
      if (!res.ok) throw new Error("Failed to load catalogs");
      return (await res.json()) as CatalogOption[];
    },
  });
}

export function useTemplates(scope: "import" | "export") {
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

export function useImportPreference<T>(key: string, endpoint: string) {
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

export function useSavePreferenceMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ endpoint, data }: { endpoint: string; data: any }) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save preference");
      return res.json();
    },
    onSuccess: (_, { endpoint }) => {
      // Extract key from endpoint to invalidate specific pref
      const key = endpoint.split("/").pop();
      if (key) {
        void queryClient.invalidateQueries({ queryKey: importKeys.pref(key) });
      }
    }
  });
}

export function useTemplateMutation(scope: "import" | "export", id?: string) {
  const queryClient = useQueryClient();
  const endpoint = scope === "import" 
    ? "/api/integrations/import-templates" 
    : "/api/integrations/export-templates";
    
  return useMutation({
    mutationFn: async ({ data, isDelete = false }: { data?: any; isDelete?: boolean }) => {
      const url = id ? `${endpoint}/${id}` : endpoint;
      const method = isDelete ? "DELETE" : (id ? "PUT" : "POST");
      
      const res = await fetch(url, {
        method,
        headers: isDelete ? {} : { "Content-Type": "application/json" },
        body: isDelete ? undefined : JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error(`Failed to ${isDelete ? "delete" : "save"} template`);
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importKeys.templates(scope) });
    }
  });
}

export function useInventories(connectionId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: importKeys.inventories(connectionId),
    queryFn: async () => {
      const res = await fetch("/api/integrations/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "inventories", connectionId }),
      });
      if (!res.ok) throw new Error("Failed to load inventories");
      const data = await res.json();
      return data.inventories as any[];
    },
    enabled,
  });
}

export function useWarehouses(inventoryId: string, connectionId?: string, includeAll: boolean = false, enabled: boolean = true) {
  return useQuery({
    queryKey: importKeys.warehouses(inventoryId, connectionId, includeAll),
    queryFn: async () => {
      const res = await fetch("/api/integrations/imports/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "warehouses", inventoryId, connectionId, includeAllWarehouses: includeAll }),
      });
      if (!res.ok) throw new Error("Failed to load warehouses");
      return await res.json();
    },
    enabled: enabled && !!inventoryId,
  });
}

export function useParameters(inventoryId: string, productId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: importKeys.parameters(inventoryId, productId),
    queryFn: async () => {
      const res = await fetch("/api/integrations/imports/base/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId, productId }),
      });
      if (!res.ok) throw new Error("Failed to load parameters");
      return await res.json();
    },
    enabled: enabled && !!inventoryId && !!productId,
  });
}
