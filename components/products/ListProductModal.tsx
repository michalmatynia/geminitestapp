"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ModalShell from "@/components/ui/modal-shell";
import { IntegrationWithConnections, ProductWithImages } from "@/types";

type ListProductModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ListProductModal({
  product,
  onClose,
  onSuccess,
}: ListProductModalProps) {
  const [integrations, setIntegrations] = useState<IntegrationWithConnections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const productName =
    product.name_en || product.name_pl || product.name_de || "Unnamed Product";

  const selectedIntegration = integrations.find(
    (i) => i.id === selectedIntegrationId
  );

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/integrations/with-connections");
        if (!res.ok) {
          throw new Error("Failed to fetch integrations");
        }
        const data = (await res.json()) as IntegrationWithConnections[];
        setIntegrations(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load integrations"
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchIntegrations();
  }, []);

  // Reset connection when integration changes
  useEffect(() => {
    setSelectedConnectionId("");
  }, [selectedIntegrationId]);

  const handleSubmit = async () => {
    if (!selectedIntegrationId || !selectedConnectionId) {
      setError("Please select both a marketplace and an account");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/products/${product.id}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to create listing");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const integrationsWithConnections = integrations.filter(
    (i) => i.connections.length > 0
  );

  return (
    <ModalShell
      title={`List Product - ${productName}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-800 text-white hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              submitting || !selectedIntegrationId || !selectedConnectionId
            }
          >
            {submitting ? "Listing..." : "List Product"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading integrations...</p>
        ) : integrationsWithConnections.length === 0 ? (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-6 text-center">
            <p className="text-sm text-yellow-200">
              No integrations with configured accounts found.
            </p>
            <p className="mt-2 text-xs text-yellow-300/70">
              Please set up an integration with at least one account first.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="integration">Marketplace / Integration</Label>
              <Select
                value={selectedIntegrationId}
                onValueChange={setSelectedIntegrationId}
              >
                <SelectTrigger id="integration">
                  <SelectValue placeholder="Select a marketplace..." />
                </SelectTrigger>
                <SelectContent>
                  {integrationsWithConnections.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIntegration && (
              <div className="space-y-2">
                <Label htmlFor="connection">Account</Label>
                <Select
                  value={selectedConnectionId}
                  onValueChange={setSelectedConnectionId}
                >
                  <SelectTrigger id="connection">
                    <SelectValue placeholder="Select an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedIntegration.connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {connection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose which account to use for listing this product on{" "}
                  {selectedIntegration.name}.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
