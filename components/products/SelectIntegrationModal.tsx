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

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId);

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
                  setSelectedIntegrationId(value);
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
