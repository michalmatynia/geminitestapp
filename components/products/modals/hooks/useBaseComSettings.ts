import { useEffect, useRef, useState } from "react";
import type { Template, BaseInventory } from "@/types/product-imports";

// Why: Base.com has complex, interconnected setup:
// - Templates define field mapping
// - Inventories require warehouses to be loaded first
// - Preferences persist across uses
// Isolating this logic makes the modal cleaner and Base-specific code testable.
export function useBaseComSettings(isBaseComIntegration: boolean, connectionId: string) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [preferredTemplateId, setPreferredTemplateId] = useState<string | null>(null);
  const [inventories, setInventories] = useState<BaseInventory[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [preferredInventoryId, setPreferredInventoryId] = useState<string | null>(null);
  const [preferredConnectionId, setPreferredConnectionId] = useState<string | null>(null);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);
  const previousConnectionId = useRef<string>("");

  // Load templates when connection changes
  useEffect(() => {
    if (!isBaseComIntegration || !connectionId) {
      setTemplates([]);
      return;
    }

    if (previousConnectionId.current === connectionId) return;
    previousConnectionId.current = connectionId;

    (async () => {
      try {
        const res = await fetch(`/api/products/exports/base/templates?connectionId=${connectionId}`);
        if (!res.ok) throw new Error("Failed to load templates");
        const data = (await res.json()) as { templates: Template[]; preferred: string | null };
        setTemplates(data.templates);
        setPreferredTemplateId(data.preferred);
        setSelectedTemplateId(data.preferred || "none");
      } catch (err) {
        console.error("Failed to load templates:", err);
        setTemplates([]);
      }
    })();
  }, [isBaseComIntegration, connectionId]);

  // Load inventories when connection changes
  useEffect(() => {
    if (!isBaseComIntegration || !connectionId) {
      setInventories([]);
      return;
    }

    setLoadingInventories(true);
    (async () => {
      try {
        const res = await fetch(`/api/products/exports/base/inventories?connectionId=${connectionId}`);
        if (!res.ok) throw new Error("Failed to load inventories");
        const data = (await res.json()) as {
          inventories: BaseInventory[];
          preferred: string | null;
          preferredConnectionId: string | null;
        };
        setInventories(data.inventories);
        setPreferredInventoryId(data.preferred);
        setPreferredConnectionId(data.preferredConnectionId);
        if (data.preferred) setSelectedInventoryId(data.preferred);
      } catch (err) {
        console.error("Failed to load inventories:", err);
        setInventories([]);
      } finally {
        setLoadingInventories(false);
      }
    })();
  }, [isBaseComIntegration, connectionId]);

  // Auto-select preferred template
  useEffect(() => {
    if (!isBaseComIntegration) return;
    if (!preferredTemplateId) return;
    if (selectedTemplateId !== "none") return;
    setSelectedTemplateId(preferredTemplateId);
  }, [isBaseComIntegration, preferredTemplateId, selectedTemplateId]);

  // Auto-select preferred inventory or first available
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
  }, [isBaseComIntegration, inventories, preferredInventoryId, selectedInventoryId, loadingInventories]);

  // Sync template preference when selected changes
  useEffect(() => {
    if (!isBaseComIntegration || !selectedTemplateId || selectedTemplateId === "none") return;
    (async () => {
      try {
        await fetch("/api/products/exports/base/templates/preferred", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: selectedTemplateId }),
        });
      } catch {
        // Silent failure - preference save shouldn't block UI
      }
    })();
  }, [isBaseComIntegration, selectedTemplateId]);

  // Sync inventory preference when selected changes
  useEffect(() => {
    if (!isBaseComIntegration || !selectedInventoryId) return;
    (async () => {
      try {
        await fetch("/api/products/exports/base/inventories/preferred", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId: selectedInventoryId, connectionId }),
        });
      } catch {
        // Silent failure - preference save shouldn't block UI
      }
    })();
  }, [isBaseComIntegration, selectedInventoryId, connectionId]);

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    inventories,
    selectedInventoryId,
    setSelectedInventoryId,
    loadingInventories,
    allowDuplicateSku,
    setAllowDuplicateSku,
  };
}
