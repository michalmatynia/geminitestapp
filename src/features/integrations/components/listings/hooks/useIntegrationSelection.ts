import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { IntegrationWithConnections } from "@/features/integrations/types/listings";

// Why: Integration selection has complex side effects:
// - Loading integrations on mount
// - Applying initial selection from props
// - Clearing dependent state when integration changes
// Extracting prevents callback hell and makes logic reusable across modals.
export function useIntegrationSelection(
  initialIntegrationId?: string | null,
  initialConnectionId?: string | null
): {
  integrations: IntegrationWithConnections[];
  loading: boolean;
  selectedIntegrationId: string;
  selectedConnectionId: string;
  selectedIntegration: IntegrationWithConnections | undefined;
  isBaseComIntegration: boolean;
  setSelectedIntegrationId: Dispatch<SetStateAction<string>>;
  setSelectedConnectionId: Dispatch<SetStateAction<string>>;
} {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [appliedInitialSelection, setAppliedInitialSelection] = useState(false);

  const preferredConnectionQuery = useQuery({
    queryKey: ["integrations", "base", "default-connection"],
    queryFn: async (): Promise<{ connectionId?: string | null }> => {
      const res = await fetch("/api/integrations/exports/base/default-connection");
      if (!res.ok) {
        throw new Error("Failed to load preferred connection");
      }
      return (await res.json()) as { connectionId?: string | null };
    },
  });

  const integrationsQuery = useQuery({
    queryKey: ["integrations", "with-connections"],
    queryFn: async (): Promise<IntegrationWithConnections[]> => {
      const res = await fetch("/api/integrations/with-connections");
      if (!res.ok) throw new Error("Failed to load integrations");
      return (await res.json()) as IntegrationWithConnections[];
    },
  });

  const loading = integrationsQuery.isPending;
  const integrations = useMemo((): IntegrationWithConnections[] => {
    const data = integrationsQuery.data ?? [];
    return Array.isArray(data) ? data.filter((i: IntegrationWithConnections) => i.connections.length > 0) : [];
  }, [integrationsQuery.data]);

  const preferredConnectionId = preferredConnectionQuery.data?.connectionId ?? null;

  // Apply initial selection from props OR preferred connection
  // We do this during render to avoid useEffect warnings
  if (!loading && !appliedInitialSelection && integrations.length > 0) {
    setAppliedInitialSelection(true);
    
    // If explicit initial values are provided, use them (takes precedence)
    if (initialIntegrationId) {
      setSelectedIntegrationId(initialIntegrationId);
      if (initialConnectionId) {
        setSelectedConnectionId(initialConnectionId);
      }
    }
  }

  // Auto-select preferred connection when integration is selected
  // Perform check and update during render
  if (selectedIntegrationId && integrations.length > 0) {
    const integration = integrations.find((i: IntegrationWithConnections) => i.id === selectedIntegrationId);
    if (integration) {
      const connectionIds = integration.connections?.map((conn: { id: string }) => conn.id) ?? [];
      const selectedIsValid =
        Boolean(selectedConnectionId) && connectionIds.includes(selectedConnectionId);

      if (!selectedIsValid) {
        if (preferredConnectionId && connectionIds.includes(preferredConnectionId)) {
          setSelectedConnectionId(preferredConnectionId);
        } else if (selectedConnectionId) {
          setSelectedConnectionId("");
        }
      }
    }
  }

  const selectedIntegration = (integrations || []).find((i: IntegrationWithConnections) => i.id === selectedIntegrationId);
  const isBaseComIntegration = ["baselinker", "base-com"].includes(
    selectedIntegration?.slug ?? ""
  );

  return {
    integrations,
    loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  };
}
