"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ModalShell from "@/components/ui/modal-shell";
import type { ProductWithImages, IntegrationWithConnections } from "@/types";

type Template = {
  id: string;
  name: string;
  description?: string | null;
};

type BaseInventory = {
  id: string;
  name: string;
};

type SelectProductForListingModalProps = {
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function SelectProductForListingModal({
  integrationId,
  connectionId,
  onClose,
  onSuccess,
}: SelectProductForListingModalProps) {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [integration, setIntegration] = useState<IntegrationWithConnections | null>(null);
  const [connectionName, setConnectionName] = useState<string>("");

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
  const previousIntegrationId = useRef<string>("");

  const isBaseComIntegration = ["baselinker", "base-com"].includes(
    integration?.slug ?? ""
  );

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = (await res.json()) as ProductWithImages[];
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    void fetchProducts();
  }, []);

  // Load integration details
  useEffect(() => {
    const fetchIntegration = async () => {
      try {
        const res = await fetch("/api/integrations/with-connections");
        if (!res.ok) throw new Error("Failed to fetch integration");
        const data = (await res.json()) as IntegrationWithConnections[];
        const found = data.find((i) => i.id === integrationId);
        if (found) {
          setIntegration(found);
          const conn = found.connections.find((c) => c.id === connectionId);
          if (conn) setConnectionName(conn.name);
        }
      } catch {
        // Silently fail
      }
    };
    void fetchIntegration();
  }, [integrationId, connectionId]);

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

  // Load Base.com inventories when it's a Base.com integration
  useEffect(() => {
    const loadInventories = async () => {
      if (!isBaseComIntegration || !connectionId) {
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
            connectionId,
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
  }, [isBaseComIntegration, connectionId]);

  useEffect(() => {
    if (
      previousIntegrationId.current &&
      integrationId &&
      integrationId !== previousIntegrationId.current
    ) {
      setInventories([]);
      setSelectedInventoryId("");
    }
    previousIntegrationId.current = integrationId;
  }, [integrationId]);

  useEffect(() => {
    if (
      previousConnectionId.current &&
      connectionId &&
      connectionId !== previousConnectionId.current
    ) {
      setSelectedInventoryId("");
    }
    previousConnectionId.current = connectionId;
  }, [connectionId]);

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
    if (!selectedProductId) {
      setError("Please select a product");
      return;
    }

    if (isBaseComIntegration && !selectedInventoryId) {
      setError("Please select a Base.com inventory");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isBaseComIntegration) {
        const res = await fetch(`/api/products/${selectedProductId}/export-to-base`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId,
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
        const res = await fetch(`/api/products/${selectedProductId}/listings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            integrationId,
            connectionId,
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

  const getProductDisplayName = (product: ProductWithImages) => {
    return product.name_en || product.name_pl || product.name_de || product.sku;
  };

  return (
    <ModalShell
      title={`List Product to ${integration?.name || "Marketplace"}`}
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
              !selectedProductId ||
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

        <div className="rounded-md border border-gray-700 bg-gray-900/50 px-4 py-3">
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Integration:</span>{" "}
            <span className="font-medium">{integration?.name || "Loading..."}</span>
          </p>
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Account:</span>{" "}
            <span className="font-medium">{connectionName || "Loading..."}</span>
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading products...</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="product">Select Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {getProductDisplayName(product)} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isBaseComIntegration && (
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
