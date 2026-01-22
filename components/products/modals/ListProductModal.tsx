"use client";

import { useEffect, useRef, useState } from "react";
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
import type { Template, BaseInventory } from "@/types/product-imports";

type ListProductModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onSuccess: () => void;
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
};

export default function ListProductModal({
  product,
  onClose,
  onSuccess,
  initialIntegrationId,
  initialConnectionId,
}: ListProductModalProps) {
  const [integrations, setIntegrations] = useState<IntegrationWithConnections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [appliedInitialSelection, setAppliedInitialSelection] = useState(false);
  const previousIntegrationId = useRef<string>("");

  // Base.com specific fields
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [preferredTemplateId, setPreferredTemplateId] = useState<string | null>(null);
  const [inventories, setInventories] = useState<BaseInventory[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [preferredInventoryId, setPreferredInventoryId] = useState<string | null>(null);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);
  const previousConnectionId = useRef<string>("");

  const productName =
    product.name_en || product.name_pl || product.name_de || "Unnamed Product";

  const selectedIntegration = integrations.find(
    (i) => i.id === selectedIntegrationId
  );
  const selectedConnection = selectedIntegration?.connections.find(
    (connection) => connection.id === selectedConnectionId
  );
  const hasPresetSelection = Boolean(initialIntegrationId && initialConnectionId);

  const isBaseComIntegration = ["baselinker", "base-com"].includes(
    selectedIntegration?.slug ?? ""
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

  useEffect(() => {
    if (initialIntegrationId && !appliedInitialSelection) {
      setSelectedIntegrationId(initialIntegrationId);
    }
  }, [initialIntegrationId, appliedInitialSelection]);

  // Load templates for Base.com
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/products/export-templates");
        if (!res.ok) return;
        const data = (await res.json()) as Template[];
        setTemplates(data);
      } catch {
        // Silently fail - templates are optional
      }
    };

    void fetchTemplates();
  }, []);

  useEffect(() => {
    const loadPreferredTemplate = async () => {
      try {
        const res = await fetch("/api/products/exports/base/active-template");
        const payload = (await res.json()) as { templateId?: string | null };
        if (!res.ok) return;
        setPreferredTemplateId(payload.templateId ?? null);
      } catch {
        // Ignore template preference errors
      }
    };

    void loadPreferredTemplate();
  }, []);

  useEffect(() => {
    const loadPreferredInventory = async () => {
      try {
        const res = await fetch("/api/products/exports/base/default-inventory");
        if (!res.ok) return;
        const payload = (await res.json()) as { inventoryId?: string | null };
        setPreferredInventoryId(payload.inventoryId ?? null);
      } catch {
        // Ignore inventory preference errors
      }
    };

    void loadPreferredInventory();
  }, []);

  // Reset connection when user changes the integration selection.
  useEffect(() => {
    if (
      previousIntegrationId.current &&
      selectedIntegrationId &&
      selectedIntegrationId !== previousIntegrationId.current
    ) {
      setSelectedConnectionId("");
      setInventories([]);
      setSelectedInventoryId("");
    }
    previousIntegrationId.current = selectedIntegrationId;
  }, [selectedIntegrationId]);

  useEffect(() => {
    if (
      previousConnectionId.current &&
      selectedConnectionId &&
      selectedConnectionId !== previousConnectionId.current
    ) {
      setSelectedInventoryId("");
    }
    previousConnectionId.current = selectedConnectionId;
  }, [selectedConnectionId]);

  useEffect(() => {
    if (
      initialConnectionId &&
      initialIntegrationId &&
      selectedIntegrationId === initialIntegrationId &&
      !appliedInitialSelection
    ) {
      setSelectedConnectionId(initialConnectionId);
      setAppliedInitialSelection(true);
    }
  }, [
    initialConnectionId,
    initialIntegrationId,
    selectedIntegrationId,
    appliedInitialSelection,
  ]);

  // Load Base.com inventories when connection is selected
  useEffect(() => {
    const loadInventories = async () => {
      if (!isBaseComIntegration || !selectedConnectionId) {
        setInventories([]);
        return;
      }

      try {
        setLoadingInventories(true);
        const res = await fetch("/api/products/imports/base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "inventories",
            connectionId: selectedConnectionId,
          }),
        });

        if (!res.ok) throw new Error("Failed to load inventories");

        const data = (await res.json()) as { inventories: BaseInventory[] };
        setInventories(data.inventories || []);
      } catch (err) {
        console.error("Failed to load inventories:", err);
        setError("Failed to load Base.com inventories");
      } finally {
        setLoadingInventories(false);
      }
    };

    void loadInventories();
  }, [isBaseComIntegration, selectedConnectionId]);

  useEffect(() => {
    if (!isBaseComIntegration) return;
    if (!preferredTemplateId) return;
    if (selectedTemplateId !== "none") return;
    setSelectedTemplateId(preferredTemplateId);
  }, [isBaseComIntegration, preferredTemplateId, selectedTemplateId]);

  useEffect(() => {
    if (!isBaseComIntegration) return;
    if (selectedInventoryId) return;
    if (!inventories.length) return;
    if (loadingInventories) return;
    if (preferredInventoryId && inventories.some((inv) => inv.id === preferredInventoryId)) {
      setSelectedInventoryId(preferredInventoryId);
      return;
    }
    setSelectedInventoryId(inventories[0]?.id ?? "");
  }, [
    isBaseComIntegration,
    inventories,
    preferredInventoryId,
    selectedInventoryId,
    loadingInventories,
  ]);

  const handleSubmit = async () => {
    if (!selectedIntegrationId || !selectedConnectionId) {
      setError("Please select both a marketplace and an account");
      return;
    }

    if (isBaseComIntegration && !selectedInventoryId) {
      setError("Please select a Base.com inventory");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // For Base.com, use export endpoint
      if (isBaseComIntegration) {
        const res = await fetch(`/api/products/${product.id}/export-to-base`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: selectedConnectionId,
            inventoryId: selectedInventoryId,
            templateId: selectedTemplateId !== "none" ? selectedTemplateId : undefined,
            allowDuplicateSku,
          }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string; skuExists?: boolean };
          if (data.skuExists) {
            throw new Error(data.error || "SKU already exists in Base.com");
          }
          throw new Error(data.error || "Failed to export product to Base.com");
        }

        onSuccess();
      } else {
        // For other integrations, use regular listing endpoint
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list product");
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
      showClose={false}
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
              submitting ||
              !selectedIntegrationId ||
              !selectedConnectionId ||
              (isBaseComIntegration && !selectedInventoryId)
            }
          >
            {submitting
              ? isBaseComIntegration
                ? "Exporting..."
                : "Listing..."
              : isBaseComIntegration
              ? "Export to Base.com"
              : "List Product"}
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
            {hasPresetSelection ? (
              <div className="rounded-md border border-gray-800 bg-gray-950/60 px-4 py-3 text-sm text-gray-300">
                <p>
                  Marketplace:{" "}
                  <span className="font-medium text-white">
                    {selectedIntegration?.name || "Selected integration"}
                  </span>
                </p>
                <p className="mt-1">
                  Account:{" "}
                  <span className="font-medium text-white">
                    {selectedConnection?.name || "Selected account"}
                  </span>
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
                      {integrationsWithConnections
                        .filter((integration) => integration.id)
                        .map((integration) => (
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
                        {selectedIntegration.connections
                          .filter((connection) => connection.id)
                          .map((connection) => (
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

            {isBaseComIntegration && selectedConnectionId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="inventory">
                    Base.com Inventory {loadingInventories && "(Loading...)"}
                  </Label>
                  <Select
                    value={selectedInventoryId}
                    onValueChange={setSelectedInventoryId}
                    disabled={loadingInventories || inventories.length === 0}
                  >
                    <SelectTrigger id="inventory">
                      <SelectValue placeholder="Select inventory..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventories
                        .filter((inventory) => inventory.id)
                        .map((inventory) => (
                          <SelectItem key={inventory.id} value={inventory.id}>
                            {inventory.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {inventories.length === 0 && !loadingInventories && (
                    <p className="text-xs text-red-400">
                      No inventories found. Please check your Base.com account.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Template (Optional)</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger id="template">
                      <SelectValue placeholder="No template (use defaults)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {templates
                        .filter((template) => template.id)
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Templates define how product fields map to Base.com fields.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="allowDuplicateSku"
                    checked={allowDuplicateSku}
                    onChange={(e) => setAllowDuplicateSku(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-500"
                  />
                  <label htmlFor="allowDuplicateSku" className="text-sm text-gray-300">
                    Allow duplicate SKUs
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  When unchecked, export will fail if the SKU already exists in the Base.com inventory.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
