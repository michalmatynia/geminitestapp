import { useEffect, useRef, useState } from "react";
import type { Template, BaseInventory } from "@/features/products/types/product-imports";

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

    void (async () => {
      try {
        const res = await fetch("/api/products/export-templates");
        if (!res.ok) throw new Error("Failed to load templates");
        const data = (await res.json()) as Template[];
        setTemplates(Array.isArray(data) ? data : []);
        // Load preferred template
        try {
          const prefRes = await fetch("/api/products/exports/base/active-template");
          if (prefRes.ok) {
            const prefData = (await prefRes.json()) as { templateId?: string | null };
            setPreferredTemplateId(prefData.templateId || null);
            setSelectedTemplateId(prefData.templateId || "none");
          }
        } catch {
          // Preference load failed, not critical
        }
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
      setLoadingInventories(false);
      return;
    }

    setLoadingInventories(true);
    void (async () => {
      try {
        const res = await fetch("/api/products/imports/base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "inventories",
            connectionId: connectionId,
          }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Failed to load inventories (${res.status}):`, errorText);
          setInventories([]);
          return;
        }
        const data = (await res.json()) as {
          inventories?: BaseInventory[];
          error?: string;
        };
        if (data.error) {
          console.error("Failed to load inventories:", data.error);
          setInventories([]);
          return;
        }
        setInventories(Array.isArray(data.inventories) ? data.inventories : []);

        // Load preferred inventory
        try {
          const prefRes = await fetch("/api/products/exports/base/default-inventory");
          if (prefRes.ok) {
            const prefData = (await prefRes.json()) as { inventoryId?: string | null };
            setPreferredInventoryId(prefData.inventoryId || null);
            if (prefData.inventoryId) setSelectedInventoryId(prefData.inventoryId);
          }
        } catch {
          // Preference load failed, not critical
        }
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
    void (async () => {
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
    void (async () => {
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
