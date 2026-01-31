"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
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

export function useUpsertConnection(): UseMutationResult<IntegrationConnection, Error, { integrationId: string; connectionId?: string | null; payload: Record<string, unknown> }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      integrationId, 
      connectionId, 
      payload 
    }: { 
      integrationId: string; 
      connectionId?: string | null; 
      payload: Record<string, unknown> 
    }): Promise<IntegrationConnection> => {
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
    onSuccess: (_data: IntegrationConnection, variables: { integrationId: string }): void => {
      void queryClient.invalidateQueries({ queryKey: ["integration-connections", variables.integrationId] });
    },
  });
}

export function useDeleteConnection(): UseMutationResult<Record<string, unknown>, Error, { integrationId: string; connectionId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      integrationId: _integrationId, 
      connectionId 
    }: { 
      integrationId: string; 
      connectionId: string 
    }): Promise<Record<string, unknown>> => {
      const res = await fetch(`/api/integrations/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        throw new Error((error?.error as string) || "Failed to delete connection");
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: (_data: Record<string, unknown>, variables: { integrationId: string }): void => {
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
      const data = (await res.json()) as Record<string, unknown>;
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
