"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { Integration, IntegrationConnection } from "@/features/integrations/types/integrations-ui";

export function useCreateIntegration(): UseMutationResult<Integration, Error, { name: string; slug: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; slug: string }): Promise<Integration> => {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        throw new Error((error?.error as string) || "Failed to create integration");
      }
      return (await res.json()) as Integration;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

type UpsertConnectionVariables = {
  integrationId: string;
  connectionId?: string | null;
  payload: Record<string, unknown>;
};

type DeleteConnectionVariables = {
  integrationId: string;
  connectionId: string;
};

export function useUpsertConnection(): UseMutationResult<IntegrationConnection, Error, UpsertConnectionVariables> {
  const queryClient = useQueryClient();

  const mutationOptions: UseMutationOptions<
    IntegrationConnection,
    Error,
    UpsertConnectionVariables
  > = {
    mutationFn: async ({ 
      integrationId, 
      connectionId, 
      payload 
    }: UpsertConnectionVariables): Promise<IntegrationConnection> => {
      const url = connectionId
        ? `/api/integrations/connections/${connectionId}`
        : `/api/integrations/${integrationId}/connections`;
      
      const res = await fetch(url, {
        method: connectionId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        throw new Error((error?.error as string) || "Failed to save connection");
      }
      return (await res.json()) as IntegrationConnection;
    },
    onSuccess: (_data: IntegrationConnection, variables: UpsertConnectionVariables): void => {
      void queryClient.invalidateQueries({ queryKey: ["integration-connections", variables.integrationId] });
    },
  };

  return useMutation(mutationOptions);
}

export function useDeleteConnection(): UseMutationResult<Record<string, unknown>, Error, DeleteConnectionVariables> {
  const queryClient = useQueryClient();

  return useMutation<Record<string, unknown>, Error, DeleteConnectionVariables>({
    mutationFn: async ({ 
      integrationId: _integrationId, 
      connectionId 
    }: DeleteConnectionVariables): Promise<Record<string, unknown>> => {
      const res = await fetch(`/api/integrations/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        throw new Error((error?.error as string) || "Failed to delete connection");
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: (_data: Record<string, unknown>, variables: DeleteConnectionVariables): void => {
      void queryClient.invalidateQueries({ queryKey: ["integration-connections", variables.integrationId] });
    },
  });
}

export function useTestConnection(): UseMutationResult<Record<string, unknown>, Error, { integrationId: string; connectionId: string; type?: "test" | "base/test" | "allegro/test" }> {
  return useMutation({
    mutationFn: async ({ 
      integrationId, 
      connectionId, 
      type = "test" 
    }: { 
      integrationId: string; 
      connectionId: string; 
      type?: "test" | "base/test" | "allegro/test" 
    }): Promise<Record<string, unknown>> => {
      const res = await fetch(`/api/integrations/${integrationId}/connections/${connectionId}/${type}`, {
        method: "POST",
      });
      
      const contentType = res.headers.get("content-type") || "";
      let data: Record<string, unknown>;
      
      if (contentType.includes("application/json")) {
        data = (await res.json()) as Record<string, unknown>;
      } else {
        data = { error: await res.text() };
      }

      if (!res.ok) {
        const message = (data.error as string) || (data.message as string) || res.statusText || "Connection test failed";
        const error = new Error(message);
        Object.assign(error, { data, status: res.status });
        throw error;
      }
      return data;
    },
  });
}

export function useDisconnectAllegro(): UseMutationResult<Record<string, unknown>, Error, { integrationId: string; connectionId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId, connectionId }: { integrationId: string; connectionId: string }): Promise<Record<string, unknown>> => {
      const res = await fetch(`/api/integrations/${integrationId}/connections/${connectionId}/allegro/disconnect`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        throw new Error((error?.error as string) || "Failed to disconnect Allegro");
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: (_: Record<string, unknown>, variables: { integrationId: string; connectionId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["integration-connections", variables.integrationId] });
    },
  });
}

export function useBaseApiRequest(): UseMutationResult<
  { data?: unknown },
  Error,
  { integrationId: string; connectionId: string; method: string; parameters: unknown }
> {
  return useMutation({
    mutationFn: async ({ integrationId, connectionId, method, parameters }: { integrationId: string; connectionId: string; method: string; parameters: unknown }): Promise<{ data?: unknown }> => {
      const res = await fetch(
        `/api/integrations/${integrationId}/connections/${connectionId}/base/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, parameters }),
        }
      );
      const payload = (await res.json()) as { error?: string; data?: unknown };
      if (!res.ok) {
        throw new Error(payload.error || "Request failed.");
      }
      return payload;
    },
  });
}

export function useAllegroApiRequest(): UseMutationResult<
  { status: number; statusText: string; data?: unknown; refreshed?: boolean },
  Error,
  { integrationId: string; connectionId: string; method: string; path: string; body?: unknown }
> {
  return useMutation({
    mutationFn: async ({ integrationId, connectionId, method, path, body }: { integrationId: string; connectionId: string; method: string; path: string; body?: unknown }): Promise<{ status: number; statusText: string; data?: unknown; refreshed?: boolean }> => {
      const res = await fetch(
        `/api/integrations/${integrationId}/connections/${connectionId}/allegro/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, path, body }),
        }
      );
      const payload = (await res.json()) as {
        error?: string;
        status?: number;
        statusText?: string;
        data?: unknown;
        refreshed?: boolean;
      };
      if (!res.ok) {
        throw new Error(payload.error || "Request failed.");
      }
      return {
        status: payload.status ?? res.status,
        statusText: payload.statusText ?? "",
        data: payload.data,
        refreshed: payload.refreshed,
      };
    },
  });
}

export function useUpdatePreferredTemplate(): UseMutationResult<
  void,
  Error,
  { templateId: string }
> {
  return useMutation({
    mutationFn: async ({ templateId }: { templateId: string }): Promise<void> => {
      await fetch("/api/integrations/exports/base/templates/preferred", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
    },
  });
}

export function useUpdatePreferredInventory(): UseMutationResult<
  void,
  Error,
  { inventoryId: string; connectionId: string }
> {
  return useMutation({
    mutationFn: async ({ inventoryId, connectionId }: { inventoryId: string; connectionId: string }): Promise<void> => {
      await fetch("/api/integrations/exports/base/inventories/preferred", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId, connectionId }),
      });
    },
  });
}