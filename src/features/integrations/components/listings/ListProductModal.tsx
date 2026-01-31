"use client";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label, ModalShell, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Checkbox } from "@/shared/ui";
import { useState } from "react";





import { ProductWithImages } from "@/features/products";
import type {
  ImageRetryPreset,
  ImageTransformOptions,
} from "@/features/data-import-export";
import { ExportLogViewer } from "./ExportLogViewer";
import type { CapturedLog } from "@/features/integrations/services/exports/log-capture";
import { useImageRetryPresets } from "./useImageRetryPresets";
import { useIntegrationSelection } from "./hooks/useIntegrationSelection";
import { useBaseComSettings } from "./hooks/useBaseComSettings";

import { isImageExportError } from "./utils";

type ListProductModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onSuccess: () => void;
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
};

import type { Integration, IntegrationConnectionBasic } from "@/features/integrations/types/integrations-ui";
import type { InventoryOption, Template } from "@/features/data-import-export/types/imports";

export default function ListProductModal({
  product,
  onClose,
  onSuccess,
  initialIntegrationId,
  initialConnectionId,
}: ListProductModalProps): React.JSX.Element {
  // Integration & connection selection
  const {
    integrations,
    loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const imageRetryPresets = useImageRetryPresets();

  const productName =
    product.name_en || product.name_pl || product.name_de || "Unnamed Product";

  const selectedConnection = selectedIntegration?.connections.find(
    (connection: any) => connection.id === selectedConnectionId
  );
  const hasPresetSelection = Boolean(initialIntegrationId && initialConnectionId);

  const exportToBase = async (options?: {
    imageBase64Mode?: "base-only" | "full-data-uri";
    imageTransform?: ImageTransformOptions | null;
  }): Promise<void> => {
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

    const res = await fetch(`/api/integrations/products/${product.id}/export-to-base`, {
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

  const handleSubmit = async (): Promise<void> => {
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
      setExportLogs([]);
      setLogsOpen(true);

      // For Base.com, use export endpoint
      if (isBaseComIntegration) {
        await exportToBase();
        onSuccess();
      } else {
        // For other integrations, use regular listing endpoint
        const res = await fetch(`/api/integrations/products/${product.id}/listings`, {
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

  const handleImageRetry = async (preset: ImageRetryPreset): Promise<void> => {
    if (!isBaseComIntegration || !selectedConnectionId || !selectedInventoryId) {
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

  const integrationsWithConnections = integrations.filter(
    (i: Integration) => i.connections.length > 0
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
            onClick={(): void => { void handleSubmit(); }}
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
                          onSelect={(): void => { void handleImageRetry(preset); }}
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
              <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-gray-300">
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
                        .filter((integration: any) => integration.id)
                        .map((integration: any) => (
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
                          .filter((connection: any) => connection.id)
                          .map((connection: any) => (
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
                        .filter((inventory: any) => inventory.id)
                        .map((inventory: any) => (
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
                        .filter((template: any) => template.id)
                        .map((template: any) => (
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
                    checked={allowDuplicateSku} onCheckedChange={(checked: boolean | "indeterminate"): void => setAllowDuplicateSku(Boolean(checked))}
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
