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
  const previousIntegrationId = useRef<string>("");

  // Load integrations on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrations?includeConnections=true");
        if (!res.ok) throw new Error("Failed to load integrations");
        const data = (await res.json()) as { integrations: IntegrationWithConnections[] };
        setIntegrations(data.integrations);
      } catch (error) {
        console.error("Failed to load integrations:", error);
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Apply initial selection from props
  useEffect(() => {
    if (loading || appliedInitialSelection || !integrations.length) return;

    if (initialIntegrationId) {
      setSelectedIntegrationId(initialIntegrationId);
      if (initialConnectionId) {
        setSelectedConnectionId(initialConnectionId);
      }
    }

    setAppliedInitialSelection(true);
  }, [integrations, loading, initialIntegrationId, initialConnectionId, appliedInitialSelection]);

  // Clear connection when integration changes
  useEffect(() => {
    if (previousIntegrationId.current === selectedIntegrationId) return;
    previousIntegrationId.current = selectedIntegrationId;
    setSelectedConnectionId("");
  }, [selectedIntegrationId]);

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId);
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
