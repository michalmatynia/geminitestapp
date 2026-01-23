"use client";

import { useEffect, useState } from "react";
import ModalShell from "@/components/ui/modal-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IntegrationWithConnections } from "@/types";

type SelectIntegrationModalProps = {
  onClose: () => void;
  onSelect: (integrationId: string, connectionId: string) => void;
};

export default function SelectIntegrationModal({
  onClose,
  onSelect,
}: SelectIntegrationModalProps) {
  const [integrations, setIntegrations] = useState<IntegrationWithConnections[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [preferredConnectionId, setPreferredConnectionId] = useState<string | null>(null);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  // Load preferred connection from export settings
  useEffect(() => {
    const loadPreferredConnection = async () => {
      try {
        const res = await fetch("/api/products/exports/base/default-connection");
        if (!res.ok) {
          console.log('[SelectIntegrationModal] Failed to load preferred connection');
          return;
        }
        const payload = (await res.json()) as { connectionId?: string | null };
        console.log('[SelectIntegrationModal] Loaded preferred connection:', payload.connectionId);
        setPreferredConnectionId(payload.connectionId ?? null);
      } catch (error) {
        console.error('[SelectIntegrationModal] Error loading preferred connection:', error);
      }
    };

    void loadPreferredConnection();
  }, []);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/integrations/with-connections");
        if (!res.ok) throw new Error("Failed to fetch integrations");
        const data = (await res.json()) as IntegrationWithConnections[];
        // Only show integrations that have at least one connection configured
        setIntegrations(data.filter((i) => i.connections.length > 0));
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    void fetchIntegrations();
  }, []);

  // Auto-select integration and connection based on preferred connection
  useEffect(() => {
    if (defaultsLoaded) return;
    if (!preferredConnectionId) return;
    if (integrations.length === 0) return;
    if (selectedIntegrationId || selectedConnectionId) return;

    // Find the integration that contains the preferred connection
    const integrationWithPreferredConnection = integrations.find((integration) =>
      integration.connections.some((conn) => conn.id === preferredConnectionId)
    );

    if (integrationWithPreferredConnection) {
      setSelectedIntegrationId(integrationWithPreferredConnection.id);
      setSelectedConnectionId(preferredConnectionId);
      setDefaultsLoaded(true);
    }
  }, [preferredConnectionId, integrations, selectedIntegrationId, selectedConnectionId, defaultsLoaded]);

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId);

  // Auto-select connection when integration changes (if preferred connection exists in that integration)
  useEffect(() => {
    if (!selectedIntegrationId) return;
    if (!preferredConnectionId) return;

    const integration = integrations.find((i) => i.id === selectedIntegrationId);
    if (!integration) return;

    // Check if the preferred connection exists in the selected integration
    const connectionExists = integration.connections.some((conn) => conn.id === preferredConnectionId);

    // Only auto-select if no connection is selected OR if we need to switch to the preferred one
    if (connectionExists && !selectedConnectionId) {
      console.log('[SelectIntegrationModal] Auto-selecting preferred connection:', preferredConnectionId);
      setSelectedConnectionId(preferredConnectionId);
    } else if (!connectionExists && selectedConnectionId === preferredConnectionId) {
      // Clear if the preferred connection doesn't exist in this integration
      console.log('[SelectIntegrationModal] Clearing connection - not in this integration');
      setSelectedConnectionId("");
    }
  }, [selectedIntegrationId, preferredConnectionId, integrations, selectedConnectionId]);

  const handleContinue = () => {
    if (selectedIntegrationId && selectedConnectionId) {
      onSelect(selectedIntegrationId, selectedConnectionId);
    }
  };

  return (
    <ModalShell title="Select Marketplace / Integration" onClose={onClose} size="md">
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-6 text-center">
            <p className="text-sm text-yellow-200">No connected integrations</p>
            <p className="mt-2 text-xs text-yellow-300/70">
              <a href="/admin/integrations" className="underline hover:text-yellow-100">
                Set up an integration first
              </a>
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Integration
              </label>
              <Select
                value={selectedIntegrationId}
                onValueChange={(value) => {
                  console.log('[SelectIntegrationModal] Integration selected:', value);
                  console.log('[SelectIntegrationModal] Preferred connection ID:', preferredConnectionId);
                  setSelectedIntegrationId(value);
                  // Check if the newly selected integration has the preferred connection
                  const newIntegration = integrations.find((i) => i.id === value);
                  console.log('[SelectIntegrationModal] Found integration:', newIntegration?.name);
                  if (newIntegration && preferredConnectionId) {
                    const hasPreferredConnection = newIntegration.connections.some(
                      (conn) => conn.id === preferredConnectionId
                    );
                    console.log('[SelectIntegrationModal] Has preferred connection:', hasPreferredConnection);
                    if (hasPreferredConnection) {
                      // Auto-select the preferred connection
                      console.log('[SelectIntegrationModal] Auto-selecting preferred connection in onValueChange');
                      setSelectedConnectionId(preferredConnectionId);
                      return;
                    }
                  }
                  // Otherwise, clear the connection
                  console.log('[SelectIntegrationModal] Clearing connection');
                  setSelectedConnectionId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an integration..." />
                </SelectTrigger>
                <SelectContent>
                  {integrations
                    .filter((integration) => integration.id)
                    .map((integration) => (
                      <SelectItem key={integration.id} value={integration.id}>
                        {integration.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIntegration && selectedIntegration.connections.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Account / Connection
                </label>
                <Select
                  value={selectedConnectionId}
                  onValueChange={setSelectedConnectionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedIntegration.connections
                      .filter((connection) => connection.id)
                      .map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedIntegrationId || !selectedConnectionId}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
