"use client";

import { AppModal, Button, SectionPanel, IntegrationSelector } from "@/shared/ui";
import { useIntegrationSelection } from "./hooks/useIntegrationSelection";
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
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection();

  const handleContinue = (): void => {
    if (selectedIntegrationId && selectedConnectionId) {
      onSelect(selectedIntegrationId, selectedConnectionId);
    }
  };

  return (
    <AppModal
      open={true}
      onClose={onClose}
      title="Select Marketplace / Integration"
      size="md"
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading integrations...</p>
        ) : integrations.length === 0 ? (
          <SectionPanel variant="subtle" className="border-yellow-500/40 bg-yellow-500/10 p-6 text-center">
            <p className="text-sm text-yellow-200">No connected integrations</p>
            <p className="mt-2 text-xs text-yellow-300/70">
              <Link href="/admin/integrations" className="underline hover:text-yellow-100">
                Set up an integration first
              </Link>
            </p>
          </SectionPanel>
        ) : (
          <>
            <IntegrationSelector
              integrations={integrations}
              selectedIntegrationId={selectedIntegrationId}
              onIntegrationChange={setSelectedIntegrationId}
              selectedConnectionId={selectedConnectionId}
              onConnectionChange={setSelectedConnectionId}
            />

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
    </AppModal>
  );
}
