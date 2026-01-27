"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Integration, IntegrationConnection } from "@/features/integrations/types/integrations-ui";

export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; slug: string }) => {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create integration");
      return (await res.json()) as Integration;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

export function useUpsertConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      integrationId, 
      connectionId, 
      payload 
    }: { 
      integrationId: string; 
      connectionId?: string | null; 
      payload: any 
    }) => {
      const url = connectionId
        ? `/api/integrations/connections/${connectionId}`
        : `/api/integrations/${integrationId}/connections`;
      
      const res = await fetch(url, {
        method: connectionId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error("Failed to save connection");
      return (await res.json()) as IntegrationConnection;
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["integration-connections", variables.integrationId] });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      integrationId, 
      connectionId 
    }: { 
      integrationId: string; 
      connectionId: string 
    }) => {
      const res = await fetch(`/api/integrations/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete connection");
      return (await res.json());
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["integration-connections", variables.integrationId] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async ({ 
      integrationId, 
      connectionId, 
      type = "test" 
    }: { 
      integrationId: string; 
      connectionId: string; 
      type?: "test" | "base/test" | "allegro/test" 
    }) => {
      const res = await fetch(`/api/integrations/${integrationId}/connections/${connectionId}/${type}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw { ...data, status: res.status, statusText: res.statusText };
      return data;
    },
  });
}
