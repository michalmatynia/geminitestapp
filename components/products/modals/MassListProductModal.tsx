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
import type { IntegrationWithConnections } from "@/types";
import { logger } from "@/lib/logger";
import type { Template, BaseInventory } from "@/types/product-imports";
import { ExportLogViewer } from "./ExportLogViewer";
import type { CapturedLog } from "@/lib/services/exports/log-capture";
import { Checkbox } from "@/components/ui/checkbox";

type MassListProductModalProps = {
  productIds: string[];
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function MassListProductModal({
  productIds,
  integrationId,
  connectionId,
  onClose,
  onSuccess,
}: MassListProductModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; errors: number } | null>(null);
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
  
  // Export logging - for mass operations, store all logs
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const isBaseComIntegration = ["baselinker", "base-com"].includes(
    integration?.slug ?? ""
  );

  // Load integration details
  useEffect(() => {
    const fetchIntegration = async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
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
        setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        
        try {
            if (isBaseComIntegration) {
                const res = await fetch(`/api/products/${productId}/export-to-base`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    connectionId,
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
                const res = await fetch(`/api/products/${productId}/listings`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    integrationId,
                    connectionId,
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

  return (
    <ModalShell
      title={`List ${productIds.length} Products to ${integration?.name || "Marketplace"}`}
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
                            className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-500"
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
          <div className="mt-4 border-t border-gray-700 pt-4">
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
