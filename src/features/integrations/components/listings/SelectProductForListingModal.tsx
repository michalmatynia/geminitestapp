"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import ModalShell from "@/shared/components/modal-shell";
import type { ProductWithImages } from "@/features/products/types";
import type {
  ImageRetryPreset,
  ImageTransformOptions,
} from "@/features/data-import-export/types/imports";
import { ExportLogViewer } from "./ExportLogViewer";
import type { CapturedLog } from "@/features/integrations/services/exports/log-capture";
import { useImageRetryPresets } from "./useImageRetryPresets";
import { Checkbox } from "@/shared/ui/checkbox";
import { useIntegrationSelection } from "./hooks/useIntegrationSelection";
import { useBaseComSettings } from "./hooks/useBaseComSettings";
import { isImageExportError } from "./utils";

type SelectProductForListingModalProps = {
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function SelectProductForListingModal({
  integrationId: initialIntegrationId,
  connectionId: initialConnectionId,
  onClose,
  onSuccess,
}: SelectProductForListingModalProps) {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Integration & connection selection
  const {
    loading: loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
  } = useIntegrationSelection(initialIntegrationId, initialConnectionId);

  // Base.com specific settings
  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    inventories,
    selectedInventoryId,
    setSelectedInventoryId,
    loadingInventories,
    allowDuplicateSku,
    setAllowDuplicateSku,
  } = useBaseComSettings(isBaseComIntegration, selectedConnectionId);

  // Export logging
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const imageRetryPresets = useImageRetryPresets();

  const connectionName = selectedIntegration?.connections.find(
    (c) => c.id === selectedConnectionId
  )?.name || "";

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = (await res.json()) as ProductWithImages[];
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    };
    void fetchProducts();
  }, []);

  const exportToBase = async (options?: {
    imageBase64Mode?: "base-only" | "full-data-uri";
    imageTransform?: ImageTransformOptions | null;
  }) => {
    const payload: Record<string, unknown> = {
      connectionId: selectedConnectionId,
      inventoryId: selectedInventoryId,
      templateId: selectedTemplateId !== "none" ? selectedTemplateId : undefined,
      allowDuplicateSku,
    };

    if (options?.imageBase64Mode) {
      payload.imageBase64Mode = options.imageBase64Mode;
      payload.exportImagesAsBase64 = true;
    }
    if (options?.imageTransform) {
      payload.imageTransform = options.imageTransform;
      payload.exportImagesAsBase64 = true;
    }

    const res = await fetch(`/api/integrations/products/${selectedProductId}/export-to-base`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as { 
      logs?: CapturedLog[]; 
      skuExists?: boolean; 
      error?: string 
    };
    if (data.logs) {
      setExportLogs(data.logs);
    }

    if (!res.ok) {
      if (data.skuExists) {
        throw new Error(data.error || "SKU already exists in Base.com");
      }
      throw new Error(data.error || "Failed to export product to Base.com");
    }
  };

  const handleSubmit = async () => {
    if (!selectedProductId) {
      setError("Please select a product");
      return;
    }

    if (!selectedConnectionId) {
      setError("Please select an account");
      return;
    }

    if (isBaseComIntegration && !selectedInventoryId) {
      setError("Please select a Base.com inventory");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);

      if (isBaseComIntegration) {
        await exportToBase();
        onSuccess();
      } else {
        const res = await fetch(`/api/integrations/products/${selectedProductId}/listings`, {
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

  const handleImageRetry = async (preset: ImageRetryPreset) => {
    if (!selectedProductId || !isBaseComIntegration || !selectedInventoryId) {
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);
      await exportToBase({
        imageBase64Mode: preset.imageBase64Mode,
        imageTransform: preset.transform,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export product");
    } finally {
      setSubmitting(false);
    }
  };

  const getProductDisplayName = (product: ProductWithImages) => {
    return product.name_en || product.name_pl || product.name_de || product.sku;
  };

  const loading = loadingProducts || loadingIntegrations;

  return (
    <ModalShell
      title={`List Product to ${selectedIntegration?.name || "Marketplace"}`}
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
            <div className="flex flex-col gap-3">
              <span>{error}</span>
              {isBaseComIntegration && isImageExportError(error) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-red-500/20 text-red-100 hover:bg-red-500/30"
                        disabled={submitting}
                      >
                        Retry image export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card border-border">
                      {imageRetryPresets.map((preset: ImageRetryPreset) => (
                        <DropdownMenuItem
                          key={preset.id}
                          onSelect={() => void handleImageRetry(preset)}
                          className="text-gray-200 focus:bg-gray-800/70"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">{preset.label}</span>
                            <span className="text-xs text-gray-400">
                              {preset.description}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-xs text-red-200/80">
                    Applies JPEG resize/compression and retries automatically.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="rounded-md border bg-card/50 px-4 py-3">
          <p className="text-sm text-gray-300">
            <span className="text-gray-500">Integration:</span>{" "}
            <span className="font-medium">{selectedIntegration?.name || "Loading..."}</span>
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
                  <Checkbox
                    id="allowDuplicateSku"
                    checked={allowDuplicateSku} onCheckedChange={(checked: boolean) => setAllowDuplicateSku(Boolean(checked))}
                    className="h-4 w-4 rounded border bg-gray-900 text-blue-500"
                  />
                  <Label htmlFor="allowDuplicateSku" className="text-sm text-gray-300">
                    Allow duplicate SKUs
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  When unchecked, export will fail if the SKU already exists in the Base.com inventory.
                </p>
              </>
            )}
          </>
        )}
        {exportLogs.length > 0 && (
          <div className="mt-4 border-t border pt-4">
            <ExportLogViewer
              logs={exportLogs}
              isOpen={logsOpen}
              onToggle={setLogsOpen}
            />
          </div>
        )}
      </div>
    </ModalShell>
  );
}
