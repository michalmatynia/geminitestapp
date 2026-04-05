import type { BaseImportMode, BaseImportRunResumePayload, BaseImportRunStartPayload, BaseImportPreflightIssue } from '@/shared/contracts/integrations/base-com';
import type { ImportResponse } from '@/shared/contracts/integrations/import-export';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import type { Toast } from '@/shared/contracts/ui/ui/base';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type RefetchResult<TData = unknown> = {
  data?: TData;
  error?: unknown;
};

type RefetchFn<TData = unknown> = () => Promise<RefetchResult<TData>>;

type ImportMutationLike = {
  mutateAsync: (payload: BaseImportRunStartPayload) => Promise<ImportResponse>;
};

type ResumeImportMutationLike = {
  mutateAsync: (payload: BaseImportRunResumePayload) => Promise<ImportResponse>;
};

type CancelImportMutationLike = {
  mutateAsync: () => Promise<ImportResponse>;
};

type SaveExportSettingsMutationLike = {
  mutateAsync: (payload: {
    exportActiveTemplateId: string;
    exportInventoryId: string;
    selectedBaseConnectionId: string;
    exportStockFallbackEnabled: boolean;
    imageRetryPresets: ImageRetryPreset[];
    exportWarehouseId: string;
  }) => Promise<unknown>;
};

type ClearInventoryMutationLike = {
  mutateAsync: () => Promise<unknown>;
};

type RefreshImportParameterCacheMutationLike = {
  mutateAsync: (payload: { inventoryId: string; connectionId: string }) => Promise<unknown>;
};

export type ImportExportRuntimeActionsArgs = {
  toast: Toast;
  setInventoriesEnabled: (enabled: boolean) => void;
  refetchInventories: RefetchFn<unknown[]>;
  inventoryId: string;
  selectedBaseConnectionId: string;
  refreshImportParameterCacheMutation: RefreshImportParameterCacheMutationLike;
  lastHydratedImportSchemaKey: MutableRefObject<string>;
  setWarehousesEnabled: (enabled: boolean) => void;
  refetchWarehouses: RefetchFn;
  setImportListEnabled: (enabled: boolean) => void;
  setImportListPage: (page: number) => void;
  setSelectedImportIds: Dispatch<SetStateAction<Set<string>>>;
  refetchImportList: RefetchFn;
  catalogId: string;
  importListEnabled: boolean;
  imageMode: 'links' | 'download';
  importMode: BaseImportMode;
  importDryRun: boolean;
  uniqueOnly: boolean;
  allowDuplicateSku: boolean;
  importTemplateId: string;
  limit: string;
  selectedImportIds: Set<string>;
  importMutation: ImportMutationLike;
  setLastResult: (res: ImportResponse | null) => void;
  setActiveImportRunId: (id: string) => void;
  setPollImportRun: (poll: boolean) => void;
  activeImportRunId: string;
  resumeImportRunMutation: ResumeImportMutationLike;
  cancelImportRunMutation: CancelImportMutationLike;
  saveExportSettingsMutation: SaveExportSettingsMutationLike;
  exportActiveTemplateId: string;
  exportInventoryId: string;
  exportWarehouseId: string;
  exportStockFallbackEnabled: boolean;
  imageRetryPresets: ImageRetryPreset[];
  setInventoryId: (id: string) => void;
  clearInventoryMutation: ClearInventoryMutationLike;
};

export type ImportExportRuntimeActions = {
  handleLoadInventories: () => Promise<void>;
  handleLoadWarehouses: () => Promise<void>;
  handleLoadImportList: () => Promise<void>;
  handleImport: () => Promise<void>;
  handleResumeImport: () => Promise<void>;
  handleCancelImport: () => Promise<void>;
  handleDownloadImportReport: () => void;
  handleSaveExportSettings: () => Promise<void>;
  handleClearInventory: () => Promise<void>;
};

export const createImportExportRuntimeActions = ({
  toast,
  setInventoriesEnabled,
  refetchInventories,
  inventoryId,
  selectedBaseConnectionId,
  refreshImportParameterCacheMutation,
  lastHydratedImportSchemaKey,
  setWarehousesEnabled,
  refetchWarehouses,
  setImportListEnabled,
  setImportListPage,
  setSelectedImportIds,
  refetchImportList,
  catalogId,
  importListEnabled,
  imageMode,
  importMode,
  importDryRun,
  uniqueOnly,
  allowDuplicateSku,
  importTemplateId,
  limit,
  selectedImportIds,
  importMutation,
  setLastResult,
  setActiveImportRunId,
  setPollImportRun,
  activeImportRunId,
  resumeImportRunMutation,
  cancelImportRunMutation,
  saveExportSettingsMutation,
  exportActiveTemplateId,
  exportInventoryId,
  exportWarehouseId,
  exportStockFallbackEnabled,
  imageRetryPresets,
  setInventoryId,
  clearInventoryMutation,
}: ImportExportRuntimeActionsArgs): ImportExportRuntimeActions => {
  const handleLoadInventories = async (): Promise<void> => {
    setInventoriesEnabled(true);
    const result = await refetchInventories();
    if (result.error) {
      const message =
        result.error instanceof Error ? result.error.message : 'Failed to load inventories.';
      toast(message, { variant: 'error' });
      return;
    }
    const normalizeInventoryId = (value: unknown): string => {
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
      return '';
    };
    const resultInventories = Array.isArray(result.data) ? result.data : [];
    const firstLoadedInventoryId = normalizeInventoryId(
      (resultInventories[0] as { inventory_id?: unknown; id?: unknown } | undefined)
        ?.inventory_id ??
        (resultInventories[0] as { inventory_id?: unknown; id?: unknown } | undefined)?.id
    );
    const selectedInventoryId = inventoryId.trim() || firstLoadedInventoryId;
    const selectedConnectionId = selectedBaseConnectionId.trim();
    if (selectedInventoryId && selectedConnectionId) {
      lastHydratedImportSchemaKey.current = '';
      void refreshImportParameterCacheMutation
        .mutateAsync({
          inventoryId: selectedInventoryId,
          connectionId: selectedConnectionId,
        })
        .catch(() => {
          // Keep inventory reload successful even if source schema hydration fails.
        });
    }
    toast('Inventories reloaded', { variant: 'success' });
  };

  const handleLoadWarehouses = async (): Promise<void> => {
    setWarehousesEnabled(true);
    const result = await refetchWarehouses();
    if (result.error) {
      const message =
        result.error instanceof Error ? result.error.message : 'Failed to load warehouses.';
      toast(message, { variant: 'error' });
      return;
    }
    toast('Warehouses reloaded', { variant: 'success' });
  };

  const handleLoadImportList = async (): Promise<void> => {
    setImportListEnabled(true);
    setImportListPage(1);
    setSelectedImportIds(new Set());
    const result = await refetchImportList();
    if (result.error) {
      const message =
        result.error instanceof Error ? result.error.message : 'Failed to load import list.';
      toast(message, { variant: 'error' });
      return;
    }
    toast('Import list reloaded', { variant: 'success' });
  };

  const handleImport = async (): Promise<void> => {
    if (!inventoryId || !catalogId) {
      toast('Inventory and catalog are required', { variant: 'error' });
      return;
    }
    if (!selectedBaseConnectionId) {
      toast('Select a Base.com connection first.', { variant: 'error' });
      return;
    }
    if (importListEnabled && selectedImportIds.size === 0) {
      toast('Select at least one product from the import list.', { variant: 'error' });
      return;
    }
    try {
      const selectedIds = Array.from(selectedImportIds);
      const importData: BaseImportRunStartPayload = {
        connectionId: selectedBaseConnectionId,
        inventoryId,
        catalogId,
        imageMode,
        mode: importMode,
        dryRun: importDryRun,
        uniqueOnly,
        allowDuplicateSku,
        requestId: `${Date.now()}`,
      };
      if (importTemplateId) importData.templateId = importTemplateId;
      if (limit !== 'all') importData.limit = Number(limit);
      if (importListEnabled) {
        importData.selectedIds = selectedIds;
      } else if (selectedIds.length > 0) {
        importData.selectedIds = selectedIds;
      }

      const res = await importMutation.mutateAsync(importData);
      setLastResult(res);
      setActiveImportRunId(res.runId);
      const queuedLike = res.status === 'queued' || res.status === 'running';
      setPollImportRun(queuedLike);
      if (queuedLike) {
        toast(importDryRun ? 'Dry-run queued.' : 'Import queued.', {
          variant: 'success',
        });
      } else if (res.status === 'completed' || res.status === 'partial_success') {
        toast(res.summaryMessage || 'Import completed.', { variant: 'success' });
      } else if (res.status === 'failed') {
        const preflightErrors = (res.preflight?.issues ?? [])
          .filter((issue: BaseImportPreflightIssue) => issue.severity === 'error')
          .map((issue: BaseImportPreflightIssue) => issue.message);
        toast(preflightErrors[0] || res.summaryMessage || 'Import failed.', { variant: 'error' });
      }
    } catch (error: unknown) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Import failed';
      toast(message, { variant: 'error' });
    }
  };

  const handleResumeImport = async (): Promise<void> => {
    if (!activeImportRunId) {
      toast('No import run selected for resume.', { variant: 'error' });
      return;
    }

    try {
      const resumed = await resumeImportRunMutation.mutateAsync({
        statuses: ['failed', 'pending'],
      });
      setLastResult(resumed);
      setPollImportRun(true);
      toast('Import resume queued.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to resume import run.';
      toast(message, { variant: 'error' });
    }
  };

  const handleCancelImport = async (): Promise<void> => {
    if (!activeImportRunId) {
      toast('No import run selected for cancel.', { variant: 'error' });
      return;
    }

    try {
      const canceled = await cancelImportRunMutation.mutateAsync();
      setLastResult(canceled);
      setPollImportRun(true);
      toast('Import cancel requested.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to request import cancel.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDownloadImportReport = (): void => {
    if (!activeImportRunId) {
      toast('No import run selected.', { variant: 'error' });
      return;
    }
    const url = `/api/v2/integrations/imports/base/runs/${encodeURIComponent(
      activeImportRunId
    )}/report?format=csv`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveExportSettings = async (): Promise<void> => {
    try {
      await saveExportSettingsMutation.mutateAsync({
        exportActiveTemplateId,
        exportInventoryId,
        selectedBaseConnectionId,
        exportStockFallbackEnabled,
        imageRetryPresets,
        exportWarehouseId,
      });
      toast('Export settings saved', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Save failed';
      toast(message, { variant: 'error' });
    }
  };

  const handleClearInventory = async (): Promise<void> => {
    setInventoryId('');
    try {
      await clearInventoryMutation.mutateAsync();
      toast('Inventory cleared.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast('Failed to clear inventory.', { variant: 'error' });
    }
  };

  return {
    handleLoadInventories,
    handleLoadWarehouses,
    handleLoadImportList,
    handleImport,
    handleResumeImport,
    handleCancelImport,
    handleDownloadImportReport,
    handleSaveExportSettings,
    handleClearInventory,
  };
};
