"use client";

import { SharedModal, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Label } from "@/shared/ui";
import { useIntegrationSelection } from "./hooks/useIntegrationSelection";
import type { IntegrationWithConnections, IntegrationConnectionBasic } from "@/features/integrations/types/listings";
import Link from "next/link";

export type SelectIntegrationModalProps = {
  onClose: () => void;
  onSelect: (integrationId: string, connectionId: string) => void;
};

export default function SelectIntegrationModal({
  onClose,
  onSelect,
}: SelectIntegrationModalProps): React.JSX.Element {
  const {
    integrations,
    loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection();

  // Note: We don't auto-select the integration on initial load
  // The user should manually select the integration, and then we auto-select the connection

  const handleContinue = (): void => {
    if (selectedIntegrationId && selectedConnectionId) {
      onSelect(selectedIntegrationId, selectedConnectionId);
    }
  };

  return (
    <SharedModal
      open={true}
      onClose={onClose}
      title="Select Marketplace / Integration"
      size="md"
    >
        <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-6 text-center">
            <p className="text-sm text-yellow-200">No connected integrations</p>
            <p className="mt-2 text-xs text-yellow-300/70">
              <Link href="/admin/integrations" className="underline hover:text-yellow-100">
                Set up an integration first
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div>
              <Label className="mb-2 block text-sm font-medium text-gray-300">
                Integration
              </Label>
              <Select
                value={selectedIntegrationId}
                onValueChange={(value: string): void => setSelectedIntegrationId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an integration..." />
                </SelectTrigger>
                <SelectContent>
                  {integrations
                    .filter((integration: IntegrationWithConnections): boolean => !!integration.id)
                    .map((integration: IntegrationWithConnections) => (
                      <SelectItem key={integration.id} value={integration.id}>
                        {integration.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIntegration && selectedIntegration.connections.length > 0 && (
              <div>
                <Label className="mb-2 block text-sm font-medium text-gray-300">
                  Account / Connection
                </Label>
                <Select
                  value={selectedConnectionId}
                  onValueChange={(value: string): void => setSelectedConnectionId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedIntegration.connections
                      .filter((connection: IntegrationConnectionBasic): boolean => !!connection.id)
                      .map((connection: IntegrationConnectionBasic) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleContinue}
                disabled={!selectedIntegrationId || !selectedConnectionId}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </Button>
            </div>
          </>
        )}
        </div>
    </SharedModal>
  );
}
