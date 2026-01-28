import { useEffect, useMemo, useState } from "react";
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
) {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [appliedInitialSelection, setAppliedInitialSelection] = useState(false);

  const preferredConnectionQuery = useQuery({
    queryKey: ["integrations", "base", "default-connection"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/exports/base/default-connection");
      if (!res.ok) {
        throw new Error("Failed to load preferred connection");
      }
      return (await res.json()) as { connectionId?: string | null };
    },
  });

  const integrationsQuery = useQuery({
    queryKey: ["integrations", "with-connections"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/with-connections");
      if (!res.ok) throw new Error("Failed to load integrations");
      return (await res.json()) as IntegrationWithConnections[];
    },
  });

  const loading = integrationsQuery.isPending;
  const integrations = useMemo(() => {
    const data = integrationsQuery.data ?? [];
    return Array.isArray(data) ? data.filter((i) => i.connections.length > 0) : [];
  }, [integrationsQuery.data]);

  const preferredConnectionId = preferredConnectionQuery.data?.connectionId ?? null;

  // Apply initial selection from props OR preferred connection
  useEffect(() => {
    if (loading || appliedInitialSelection || !integrations.length) return;

    console.log('[useIntegrationSelection] Applying initial selection:', {
      hasInitialIntegrationId: Boolean(initialIntegrationId),
      hasInitialConnectionId: Boolean(initialConnectionId),
      preferredConnectionId,
      integrationsCount: integrations.length
    });

    // If explicit initial values are provided, use them (takes precedence)
    if (initialIntegrationId) {
      console.log('[useIntegrationSelection] Using explicit initial values');
      setSelectedIntegrationId(initialIntegrationId);
      if (initialConnectionId) {
        setSelectedConnectionId(initialConnectionId);
      }
      setAppliedInitialSelection(true);
      return;
    }

    // Don't auto-select the integration on initial load
    // User should manually select it, then we auto-select the connection
    console.log('[useIntegrationSelection] Initial load complete - no auto-selection of integration');
    setAppliedInitialSelection(true);
  }, [integrations, loading, initialIntegrationId, initialConnectionId, preferredConnectionId, appliedInitialSelection]);

  // Auto-select preferred connection when integration is selected or preference loads
  useEffect(() => {
    if (!selectedIntegrationId || !integrations.length) return;

    const integration = (integrations || []).find((i) => i.id === selectedIntegrationId);
    if (!integration) return;

    const connectionIds = integration.connections?.map((conn) => conn.id) ?? [];
    const selectedIsValid =
      Boolean(selectedConnectionId) && connectionIds.includes(selectedConnectionId);

    if (selectedIsValid) return;

    if (preferredConnectionId && connectionIds.includes(preferredConnectionId)) {
      console.log(
        "[useIntegrationSelection] ✓ Auto-selecting preferred connection:",
        preferredConnectionId
      );
      setSelectedConnectionId(preferredConnectionId);
      return;
    }

    if (selectedConnectionId) {
      console.log(
        "[useIntegrationSelection] ✗ Clearing invalid connection selection"
      );
      setSelectedConnectionId("");
    }
  }, [
    selectedIntegrationId,
    preferredConnectionId,
    integrations,
    selectedConnectionId,
  ]);

  const selectedIntegration = (integrations || []).find((i) => i.id === selectedIntegrationId);
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
