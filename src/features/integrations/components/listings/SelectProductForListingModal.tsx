"use client";
import { Button, Label, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, ModalShell, Checkbox, useToast } from "@/shared/ui";
import { useState } from "react";

import type { ProductWithImages } from "@/features/products";
import type {
  ImageRetryPreset,
  Template,
  BaseInventory,
} from "@/features/data-import-export";
import { ExportLogViewer } from "./ExportLogViewer";
import type { CapturedLog } from "@/features/integrations/services/exports/log-capture";
import { useImageRetryPresets } from "./useImageRetryPresets";

import { useIntegrationSelection } from "./hooks/useIntegrationSelection";
import { useBaseComSettings } from "./hooks/useBaseComSettings";
import { isImageExportError } from "./utils";
import { useProducts } from "@/features/products/hooks/useProductsQuery";
import { useGenericExportToBaseMutation, useGenericCreateListingMutation } from "../../hooks/useProductListingMutations";

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
}: SelectProductForListingModalProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const { toast } = useToast();

  const { data: products = [] } = useProducts({ pageSize: 1000 });

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

  const exportMutation = useGenericExportToBaseMutation();
  const createListingMutation = useGenericCreateListingMutation();

  const connectionName = (selectedIntegration?.connections as Array<{ id: string; name: string }>)?.find(
    (c: { id: string; name: string }) => c.id === selectedConnectionId
  )?.name || "";

  const handleSubmit = async (): Promise<void> => {
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
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);

      if (isBaseComIntegration) {
        const payload = {
          connectionId: selectedConnectionId,
          inventoryId: selectedInventoryId,
          templateId: selectedTemplateId !== "none" ? selectedTemplateId : undefined,
          allowDuplicateSku,
        };
        const result = await exportMutation.mutateAsync({ productId: selectedProductId, ...payload });
        if (result.logs) setExportLogs(result.logs);
        toast("Product exported to Base.com", { variant: "success" });
        onSuccess();
      } else {
        await createListingMutation.mutateAsync({
          productId: selectedProductId,
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });
        toast("Product listing created", { variant: "success" });
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to list product");
      if (err instanceof Error && 'logs' in err) {
        const errWithLogs = err as Error & { logs: CapturedLog[] };
        if (Array.isArray(errWithLogs.logs)) {
          setExportLogs(errWithLogs.logs);
        }
      }
    }
  };

  const handleImageRetry = async (preset: ImageRetryPreset): Promise<void> => {
    if (!selectedProductId || !isBaseComIntegration || !selectedInventoryId) {
      return;
    }
    try {
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);
      
      const payload = {
        connectionId: selectedConnectionId,
        inventoryId: selectedInventoryId,
        templateId: selectedTemplateId !== "none" ? selectedTemplateId : undefined,
        allowDuplicateSku,
        imageBase64Mode: preset.imageBase64Mode,
        imageTransform: preset.transform,
        exportImagesAsBase64: true,
      };

      const result = await exportMutation.mutateAsync({ productId: selectedProductId, ...payload });
      if (result.logs) setExportLogs(result.logs);
      toast("Product exported with new image settings", { variant: "success" });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export product");
    }
  };

  const getProductDisplayName = (product: ProductWithImages): string => {
    return product.name_en || product.name_pl || product.name_de || product.sku || "Unnamed product";
  };

  const loading = loadingIntegrations;

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
            onClick={(): void => { void handleSubmit(); }}
            disabled={
              exportMutation.isPending ||
              createListingMutation.isPending ||
              !selectedProductId ||
              (isBaseComIntegration && !selectedInventoryId)
            }
          >
            {exportMutation.isPending || createListingMutation.isPending
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
                        disabled={exportMutation.isPending || createListingMutation.isPending}
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
                  {products.map((product: ProductWithImages) => (
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
                        .filter((inventory: BaseInventory): boolean => !!inventory.id)
                        .map((inventory: BaseInventory) => (
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
                        .filter((template: Template): boolean => !!template.id)
                        .map((template: Template) => (
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
                    checked={allowDuplicateSku} 
                    onCheckedChange={(checked: boolean | "indeterminate"): void => setAllowDuplicateSku(Boolean(checked))}
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
