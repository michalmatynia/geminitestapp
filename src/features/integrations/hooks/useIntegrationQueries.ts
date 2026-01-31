"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Integration, IntegrationConnection } from "@/features/integrations/types/integrations-ui";
import type { IntegrationWithConnections } from "@/features/integrations/types/listings";

export function useIntegrations(): UseQueryResult<Integration[]> {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async (): Promise<Integration[]> => {
      const res = await fetch("/api/integrations");
      if (!res.ok) {
        const error = (await res.json()) as Record<string, unknown>;
        throw new Error((error.error as string) || "Failed to fetch integrations");
      }
      return (await res.json()) as Integration[];
    },
  });
}

export function useIntegrationConnections(integrationId?: string): UseQueryResult<IntegrationConnection[]> {
  return useQuery({
    queryKey: ["integration-connections", integrationId],
    queryFn: async (): Promise<IntegrationConnection[]> => {
      if (!integrationId) return [] as IntegrationConnection[];
      const res = await fetch(`/api/integrations/${integrationId}/connections`);
      if (!res.ok) {
        const error = (await res.json()) as Record<string, unknown>;
        throw new Error((error.error as string) || "Failed to fetch connections");
      }
      return (await res.json()) as IntegrationConnection[];
    },
    enabled: !!integrationId,
  });
}

export function useConnectionSession(
  connectionId?: string,
  options?: { enabled?: boolean }
): UseQueryResult<Record<string, unknown> | null> {
  return useQuery({
    queryKey: ["connection-session", connectionId],
    queryFn: async (): Promise<Record<string, unknown> | null> => {
      if (!connectionId) return null;
      const res = await fetch(`/api/integrations/connections/${connectionId}/session`);
      if (!res.ok) {
        const error = (await res.json()) as Record<string, unknown>;
        throw new Error((error.error as string) || "Failed to fetch session");
      }
      return (await res.json()) as Record<string, unknown>;
    },
    enabled: !!connectionId && (options?.enabled ?? true),
    staleTime: 0, // Session cookies might change frequently during testing
  });
}

export function useIntegrationsWithConnections(): UseQueryResult<IntegrationWithConnections[]> {
  return useQuery({
    queryKey: ["integrations", "with-connections"],
    queryFn: async (): Promise<IntegrationWithConnections[]> => {
      const res = await fetch("/api/integrations/with-connections");
      if (!res.ok) {
        const error = (await res.json()) as Record<string, unknown>;
        throw new Error((error.error as string) || "Failed to load integrations");
      }
      return (await res.json()) as IntegrationWithConnections[];
    },
  });
}
