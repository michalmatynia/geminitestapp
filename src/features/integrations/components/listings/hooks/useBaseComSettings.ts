'use client';

import { useEffect, useState, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import {
  useUpdatePreferredTemplate,
  useUpdatePreferredInventory,
} from '@/features/integrations/hooks/useIntegrationMutations';
import {
  useExportTemplates,
  useActiveExportTemplate,
  useDefaultExportInventory,
  useBaseInventories,
} from '@/features/integrations/hooks/useIntegrationQueries';
import type { BaseInventory } from '@/shared/contracts/integrations/base-com';
import type { IntegrationTemplate as Template } from '@/shared/contracts/integrations';

// Why: Base.com has complex, interconnected setup:
// - Templates define field mapping
// - Inventories require warehouses to be loaded first
// - Preferences persist across uses
// Isolating this logic makes the modal cleaner and Base-specific code testable.
export function useBaseComSettings(
  isBaseComIntegration: boolean,
  connectionId: string
): {
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);
  const hasInitializedTemplate = useRef(false);
  const hasInitializedInventory = useRef(false);

  // Queries
  const templatesQuery = useExportTemplates();
  const activeTemplateQuery = useActiveExportTemplate();
  const defaultInventoryQuery = useDefaultExportInventory();
  const inventoriesQuery = useBaseInventories(connectionId, isBaseComIntegration);

  // Mutations
  const updatePreferredTemplateMutation = useUpdatePreferredTemplate();
  const updatePreferredInventoryMutation = useUpdatePreferredInventory();

  const templates = (templatesQuery?.data as Template[]) ?? [];
  const inventories = useMemo(
    () => (inventoriesQuery?.data as BaseInventory[]) ?? [],
    [inventoriesQuery?.data]
  );
  const preferredTemplateId = activeTemplateQuery.data?.templateId ?? null;
  const preferredInventoryId = defaultInventoryQuery.data?.inventoryId ?? null;

  // Auto-select preferred template
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isBaseComIntegration && preferredTemplateId && !hasInitializedTemplate.current) {
      if (selectedTemplateId === 'none') {
        timer = setTimeout(() => {
          setSelectedTemplateId(preferredTemplateId);
          hasInitializedTemplate.current = true;
        }, 0);
      }
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [isBaseComIntegration, preferredTemplateId, selectedTemplateId]);

  // Auto-select preferred inventory or first available
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (
      isBaseComIntegration &&
      !selectedInventoryId &&
      inventories.length > 0 &&
      !inventoriesQuery?.isLoading &&
      !hasInitializedInventory.current
    ) {
      timer = setTimeout(() => {
        if (
          preferredInventoryId &&
          inventories.some((inv: BaseInventory) => inv.id === preferredInventoryId)
        ) {
          setSelectedInventoryId(preferredInventoryId);
          hasInitializedInventory.current = true;
        } else {
          setSelectedInventoryId(inventories[0]?.id ?? '');
          hasInitializedInventory.current = true;
        }
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [
    isBaseComIntegration,
    inventories,
    preferredInventoryId,
    selectedInventoryId,
    inventoriesQuery?.isLoading,
  ]);

  // Sync template preference when selected changes
  useEffect((): void => {
    if (!isBaseComIntegration || !selectedTemplateId || selectedTemplateId === 'none') return;
    if (selectedTemplateId !== preferredTemplateId) {
      void updatePreferredTemplateMutation.mutateAsync({ templateId: selectedTemplateId });
    }
  }, [
    isBaseComIntegration,
    selectedTemplateId,
    preferredTemplateId,
    updatePreferredTemplateMutation,
  ]);

  // Sync inventory preference when selected changes
  useEffect((): void => {
    if (!isBaseComIntegration || !selectedInventoryId || !connectionId) return;
    if (selectedInventoryId !== preferredInventoryId) {
      void updatePreferredInventoryMutation.mutateAsync({
        inventoryId: selectedInventoryId,
      });
    }
  }, [
    isBaseComIntegration,
    connectionId,
    selectedInventoryId,
    preferredInventoryId,
    updatePreferredInventoryMutation,
  ]);

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    inventories,
    selectedInventoryId,
    setSelectedInventoryId,
    loadingInventories: inventoriesQuery?.isLoading ?? false,
    allowDuplicateSku,
    setAllowDuplicateSku,
  };
}
