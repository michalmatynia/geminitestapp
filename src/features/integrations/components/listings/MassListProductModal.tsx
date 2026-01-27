"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import ModalShell from "@/shared/components/modal-shell";
import { logger } from "@/shared/utils/logger";
import { ExportLogViewer } from "./ExportLogViewer";
import type { CapturedLog } from "@/features/integrations/services/exports/log-capture";
import { Checkbox } from "@/shared/ui/checkbox";
import { useIntegrationSelection } from "./hooks/useIntegrationSelection";
import { useBaseComSettings } from "./hooks/useBaseComSettings";

type MassListProductModalProps = {
  productIds: string[];
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function MassListProductModal({
  productIds,
  integrationId: initialIntegrationId,
  connectionId: initialConnectionId,
  onClose,
  onSuccess,
}: MassListProductModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; errors: number } | null>(null);

  // Integration & connection selection
  const {
    loading: loadingIntegrations,
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
  
  // Export logging - for mass operations, store all logs
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const connectionName = selectedIntegration?.connections.find(
    (c) => c.id === selectedConnectionId
  )?.name || "";

  const handleSubmit = async () => {
    if (isBaseComIntegration && !selectedInventoryId) {
      setError("Please select a Base.com inventory");
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress({ current: 0, total: productIds.length, errors: 0 });
    setExportLogs([]);
    setLogsOpen(true);

    let errors = 0;
    const allLogs: CapturedLog[] = [];
    
    for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        if (!productId) continue;
        setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        
        try {
            if (isBaseComIntegration) {
                const res = await fetch(`/api/integrations/products/${productId}/export-to-base`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    connectionId: selectedConnectionId,
                    inventoryId: selectedInventoryId,
                    templateId: selectedTemplateId !== "none" ? selectedTemplateId : undefined,
                    allowDuplicateSku,
                  }),
                });
        
                const data = (await res.json().catch(() => ({}))) as { logs?: CapturedLog[] };
                if (data.logs) {
                  allLogs.push(...data.logs);
                  setExportLogs([...allLogs]);
                }

                if (!res.ok) {
                    errors++;
                }
              } else {
                const res = await fetch(`/api/integrations/products/${productId}/listings`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    integrationId: initialIntegrationId,
                    connectionId: selectedConnectionId,
                  }),
                });
        
                if (!res.ok) {
                    errors++;
                }
              }
        } catch (e) {
            logger.error("Failed to list product", e);
            errors++;
        }
        
        setProgress(prev => prev ? { ...prev, errors } : null);
    }

    setSubmitting(false);
    if (errors === 0) {
        onSuccess();
    } else {
        setError(`Completed with ${errors} errors.`);
        // Don't close immediately if there were errors, so user can see
        setTimeout(() => onSuccess(), 2000); 
    }
  };

  const loading = loadingIntegrations;

  return (
    <ModalShell
      title={`List ${productIds.length} Products to ${selectedIntegration?.name || "Marketplace"}`}
      onClose={onClose}
      size="md"
      showClose={!submitting}
      footer={
        !submitting && (
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
                (isBaseComIntegration && !selectedInventoryId)
                }
            >
                {isBaseComIntegration
                ? "Export to Base.com"
                : "List Products"}
            </Button>
            </>
        )
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {submitting && progress && (
             <div className="space-y-2">
                 <p className="text-sm text-gray-300">Processing {progress.current} of {progress.total}...</p>
                 <div className="h-2 w-full rounded-full bg-gray-800">
                     <div 
                        className="h-full rounded-full bg-primary transition-all duration-300" 
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                     />
                 </div>
                 {progress.errors > 0 && <p className="text-xs text-red-400">{progress.errors} failures so far</p>}
             </div>
        )}

        {!submitting && (
            <>
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
                <p className="text-sm text-gray-400">Loading details...</p>
                ) : (
                <>
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
                            checked={allowDuplicateSku} onCheckedChange={(checked) => setAllowDuplicateSku(Boolean(checked))}
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