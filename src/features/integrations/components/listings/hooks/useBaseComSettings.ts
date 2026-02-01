import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Template, BaseInventory } from "@/features/data-import-export";
import {
  useExportTemplates,
  useActiveExportTemplate,
  useDefaultExportInventory,
  useBaseInventories,
} from "@/features/integrations/hooks/useIntegrationQueries";
import {
  useUpdatePreferredTemplate,
  useUpdatePreferredInventory,
} from "@/features/integrations/hooks/useIntegrationMutations";

// Why: Base.com has complex, interconnected setup:
// - Templates define field mapping
// - Inventories require warehouses to be loaded first
// - Preferences persist across uses
// Isolating this logic makes the modal cleaner and Base-specific code testable.
export function useBaseComSettings(isBaseComIntegration: boolean, connectionId: string): {
  templates: Template[];
  selectedTemplateId: string;
  setSelectedTemplateId: Dispatch<SetStateAction<string>>;
  inventories: BaseInventory[];
  selectedInventoryId: string;
  setSelectedInventoryId: Dispatch<SetStateAction<string>>;
  loadingInventories: boolean;
  allowDuplicateSku: boolean;
  setAllowDuplicateSku: Dispatch<SetStateAction<boolean>>;
} {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);

  // Queries
  const templatesQuery = useExportTemplates();
  const activeTemplateQuery = useActiveExportTemplate();
  const defaultInventoryQuery = useDefaultExportInventory();
  const inventoriesQuery = useBaseInventories(connectionId, isBaseComIntegration);

  // Mutations
  const updatePreferredTemplateMutation = useUpdatePreferredTemplate();
  const updatePreferredInventoryMutation = useUpdatePreferredInventory();

  const templates = templatesQuery.data ?? [];
  const inventories = inventoriesQuery.data ?? [];
  const preferredTemplateId = activeTemplateQuery.data?.templateId ?? null;
  const preferredInventoryId = defaultInventoryQuery.data?.inventoryId ?? null;

  // Auto-select preferred template
  useEffect((): void => {
    if (!isBaseComIntegration || !preferredTemplateId) return;
    if (selectedTemplateId === "none") {
      setSelectedTemplateId(preferredTemplateId);
    }
  }, [isBaseComIntegration, preferredTemplateId, selectedTemplateId]);

  // Auto-select preferred inventory or first available
  useEffect((): void => {
    if (!isBaseComIntegration || selectedInventoryId || inventories.length === 0 || inventoriesQuery.isLoading) return;
    
    if (preferredInventoryId && inventories.some((inv: BaseInventory) => inv.id === preferredInventoryId)) {
      setSelectedInventoryId(preferredInventoryId);
    } else {
      setSelectedInventoryId(inventories[0]?.id ?? "");
    }
  }, [isBaseComIntegration, inventories, preferredInventoryId, selectedInventoryId, inventoriesQuery.isLoading]);

  // Sync template preference when selected changes
  useEffect((): void => {
    if (!isBaseComIntegration || !selectedTemplateId || selectedTemplateId === "none") return;
    if (selectedTemplateId !== preferredTemplateId) {
      void updatePreferredTemplateMutation.mutateAsync({ templateId: selectedTemplateId });
    }
  }, [isBaseComIntegration, selectedTemplateId, preferredTemplateId]);

  // Sync inventory preference when selected changes
  useEffect((): void => {
    if (!isBaseComIntegration || !selectedInventoryId || !connectionId) return;
    if (selectedInventoryId !== preferredInventoryId) {
      void updatePreferredInventoryMutation.mutateAsync({ inventoryId: selectedInventoryId, connectionId });
    }
  }, [isBaseComIntegration, selectedInventoryId, preferredInventoryId, connectionId]);

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    inventories,
    selectedInventoryId,
    setSelectedInventoryId,
    loadingInventories: inventoriesQuery.isLoading,
    allowDuplicateSku,
    setAllowDuplicateSku,
  };
}