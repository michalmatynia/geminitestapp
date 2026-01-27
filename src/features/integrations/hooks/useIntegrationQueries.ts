"use client";

import { useQuery } from "@tanstack/react-query";
import type { Integration, IntegrationConnection } from "@/features/integrations/types/integrations-ui";

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch integrations");
      }
      return (await res.json()) as Integration[];
    },
  });
}

export function useIntegrationConnections(integrationId?: string) {
  return useQuery({
    queryKey: ["integration-connections", integrationId],
    queryFn: async () => {
      if (!integrationId) return [] as IntegrationConnection[];
      const res = await fetch(`/api/integrations/${integrationId}/connections`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch connections");
      }
      return (await res.json()) as IntegrationConnection[];
    },
    enabled: !!integrationId,
  });
}

export function useConnectionSession(connectionId?: string) {
  return useQuery({
    queryKey: ["connection-session", connectionId],
    queryFn: async () => {
      if (!connectionId) return null;
      const res = await fetch(`/api/integrations/connections/${connectionId}/session`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch session");
      }
      return (await res.json());
    },
    enabled: !!connectionId,
    staleTime: 0, // Session cookies might change frequently during testing
  });
}
