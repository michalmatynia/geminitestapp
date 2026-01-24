import { useEffect, useRef, useState } from "react";
import { IntegrationWithConnections } from "@/types";

// Why: Integration selection has complex side effects:
// - Loading integrations on mount
// - Applying initial selection from props
// - Clearing dependent state when integration changes
// Extracting prevents callback hell and makes logic reusable across modals.
export function useIntegrationSelection(
  initialIntegrationId?: string | null,
  initialConnectionId?: string | null
) {
  const [integrations, setIntegrations] = useState<IntegrationWithConnections[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [appliedInitialSelection, setAppliedInitialSelection] = useState(false);
  const [preferredConnectionId, setPreferredConnectionId] = useState<string | null>(null);
  const previousIntegrationId = useRef<string>("");

  // Load preferred connection from export settings
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/products/exports/base/default-connection");
        if (!res.ok) {
          console.log('[useIntegrationSelection] Failed to load preferred connection');
          return;
        }
        const payload = (await res.json()) as { connectionId?: string | null };
        console.log('[useIntegrationSelection] Loaded preferred connection:', payload.connectionId);
        setPreferredConnectionId(payload.connectionId ?? null);
      } catch (error) {
        console.error('[useIntegrationSelection] Error loading preferred connection:', error);
      }
    })();
  }, []);

  // Load integrations on mount
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/integrations/with-connections");
        if (!res.ok) throw new Error("Failed to load integrations");
        const data = (await res.json()) as IntegrationWithConnections[];
        // Ensure integrations is always an array and filter to only those with connections
        setIntegrations(Array.isArray(data) ? data.filter((i) => i.connections.length > 0) : []);
      } catch (error) {
        console.error("Failed to load integrations:", error);
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  // Auto-select preferred connection when integration changes
  useEffect(() => {
    if (previousIntegrationId.current === selectedIntegrationId) return;

    const isInitialMount = previousIntegrationId.current === "";
    previousIntegrationId.current = selectedIntegrationId;

    // Don't auto-select on initial mount (that's handled by the initial selection effect)
    if (isInitialMount) return;

    // User manually changed the integration - try to auto-select preferred connection
    if (preferredConnectionId && selectedIntegrationId) {
      const integration = (integrations || []).find((i) => i.id === selectedIntegrationId);
      const preferredConnection = integration?.connections?.find(
        (conn) => conn.id === preferredConnectionId
      );

      if (preferredConnection) {
        console.log('[useIntegrationSelection] ✓ Auto-selecting preferred connection on integration change:', preferredConnection.name);
        setSelectedConnectionId(preferredConnectionId);
      } else {
        console.log('[useIntegrationSelection] ✗ Preferred connection not in this integration - clearing');
        setSelectedConnectionId("");
      }
    } else {
      // No preferred connection - just clear
      setSelectedConnectionId("");
    }
  }, [selectedIntegrationId, preferredConnectionId, integrations]);

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
