'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import {
  useCancelImportRunMutation,
  useClearInventoryMutation,
  useImportMutation,
  useResumeImportRunMutation,
  useSaveDefaultConnectionMutation,
  useSaveExportSettingsMutation,
} from '@/features/data-import-export/hooks/useImportQueries';
import { getDefaultImageRetryPresets } from '@/features/data-import-export/utils/image-retry-presets';
import type {
  BaseImportMode,
  DebugWarehouses,
  ImageRetryPreset,
  ImportResponse,
} from '@/shared/contracts/integrations';
import { useToast } from '@/shared/ui';

import { createImportExportRuntimeActions } from './import-export-runtime-actions';
import { useImportExportRuntimeResources } from './useImportExportRuntimeResources';

import type {
  ImportExportActionsContextType,
  ImportExportDataContextType,
  ImportExportStateContextType,
} from './ImportExportContext.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


interface ImportExportRuntimeResult {
  actionsValue: ImportExportActionsContextType;
  dataValue: ImportExportDataContextType;
  stateValue: ImportExportStateContextType;
}

export function useImportExportRuntime(): ImportExportRuntimeResult {
  const { toast } = useToast();

  const [showAllWarehouses, setShowAllWarehouses] = useState(false);
  const [includeAllWarehouses, setIncludeAllWarehouses] = useState(false);
  const [inventoryId, setInventoryId] = useState('');
  const [exportInventoryId, setExportInventoryId] = useState('');
  const [exportWarehouseId, setExportWarehouseId] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [limit, setLimit] = useState('all');
  const [imageMode, setImageMode] = useState<'links' | 'download'>('links');
  const [importMode, setImportMode] = useState<BaseImportMode>('upsert_on_base_id');
  const [importDryRun, setImportDryRun] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [activeImportRunId, setActiveImportRunId] = useState('');
  const [pollImportRun, setPollImportRun] = useState(false);
  const [importNameSearch, setImportNameSearch] = useState('');
  const [importSkuSearch, setImportSkuSearch] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);
  const [templateScope, setTemplateScope] = useState<'import' | 'export'>('import');
  const [importListPage, setImportListPage] = useState(1);
  const [importListPageSize, setImportListPageSize] = useState(25);
  const [importListEnabled, setImportListEnabled] = useState(false);
  const [inventoriesEnabled, setInventoriesEnabled] = useState(false);
  const [warehousesEnabled, setWarehousesEnabled] = useState(false);
  const [importTemplateId, setImportTemplateId] = useState('');
  const [exportStockFallbackEnabled, setExportStockFallbackEnabled] = useState(false);
  const [imageRetryPresets, setImageRetryPresets] = useState<ImageRetryPreset[]>(
    getDefaultImageRetryPresets()
  );
  const [isBaseConnected, setIsBaseConnected] = useState(false);
  const [baseConnections, setBaseConnections] = useState<
    ImportExportDataContextType['baseConnections']
  >([]);
  const [selectedBaseConnectionId, setSelectedBaseConnectionId] = useState('');
  const [debugWarehouses, setDebugWarehouses] = useState<DebugWarehouses | null>(null);

  const lastSavedImportTemplateId = useRef<string | null>(null);
  const lastSavedImportActiveTemplateId = useRef<string | null>(null);
  const lastSavedExportActiveTemplateId = useRef<string | null>(null);
  const hasInitializedCatalog = useRef(false);
  const lastHydratedImportActiveTemplateScope = useRef('');
  const lastHydratedExportActiveTemplateScope = useRef('');
  const skipNextImportActiveTemplatePersist = useRef(false);
  const skipNextExportActiveTemplatePersist = useRef(false);
  const lastHydratedImportSchemaKey = useRef('');

  const {
    activeImportRun,
    allWarehouses,
    catalogsData,
    checkingIntegration,
    exportTemplates,
    importTemplates,
    importList,
    importListStats,
    importSourceFieldValues,
    importSourceFields,
    integrationsWithConnections,
    inventories,
    isFetchingInventories,
    isFetchingWarehouses,
    loadingCatalogs,
    loadingExportTemplates,
    loadingImportList,
    loadingImportRun,
    loadingImportSourceFields,
    loadingImportTemplates,
    refreshImportParameterCacheMutation,
    refetchImportList,
    refetchInventories,
    refetchWarehouses,
    templates,
    warehouses,
  } = useImportExportRuntimeResources({
    activeImportRunId,
    catalogId,
    exportInventoryId,
    hasInitializedCatalog,
    importListEnabled,
    importListPage,
    importListPageSize,
    importNameSearch,
    importSkuSearch,
    importTemplateId,
    inventoriesEnabled,
    inventoryId,
    includeAllWarehouses,
    lastHydratedExportActiveTemplateScope,
    lastHydratedImportActiveTemplateScope,
    lastHydratedImportSchemaKey,
    lastSavedExportActiveTemplateId,
    lastSavedImportActiveTemplateId,
    lastSavedImportTemplateId,
    limit,
    pollImportRun,
    selectedBaseConnectionId,
    setBaseConnections,
    setCatalogId,
    setExportInventoryId,
    setExportStockFallbackEnabled,
    setImageRetryPresets,
    setImportTemplateId,
    setInventoryId,
    setIsBaseConnected,
    setPollImportRun,
    setSelectedBaseConnectionId,
    setTemplateScope,
    skipNextExportActiveTemplatePersist,
    skipNextImportActiveTemplatePersist,
    toast,
    uniqueOnly,
    warehousesEnabled,
  });

  const importMutation = useImportMutation();
  const resumeImportRunMutation = useResumeImportRunMutation(activeImportRunId);
  const cancelImportRunMutation = useCancelImportRunMutation(activeImportRunId);
  const saveDefaultConnectionMutation = useSaveDefaultConnectionMutation();
  const saveExportSettingsMutation = useSaveExportSettingsMutation();
  const clearInventoryMutation = useClearInventoryMutation();

  const activeRunBusy =
    activeImportRun?.run.status === 'queued' || activeImportRun?.run.status === 'running';

  const refetchInventoriesSafe = useCallback(async () => {
    const result = await refetchInventories();
    return {
      data: Array.isArray(result.data) ? result.data : [],
      error: result.error,
    };
  }, [refetchInventories]);

  const refetchWarehousesSafe = useCallback(async () => {
    const result = await refetchWarehouses();
    return {
      data: result.data,
      error: result.error,
    };
  }, [refetchWarehouses]);

  const refetchImportListSafe = useCallback(async () => {
    const result = await refetchImportList();
    return {
      data: result.data,
      error: result.error,
    };
  }, [refetchImportList]);

  const runtimeActions = createImportExportRuntimeActions({
    toast,
    setInventoriesEnabled,
    refetchInventories: refetchInventoriesSafe,
    inventoryId,
    selectedBaseConnectionId,
    refreshImportParameterCacheMutation,
    lastHydratedImportSchemaKey,
    setWarehousesEnabled,
    refetchWarehouses: refetchWarehousesSafe,
    setImportListEnabled,
    setImportListPage,
    setSelectedImportIds,
    refetchImportList: refetchImportListSafe,
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
    exportActiveTemplateId: templates.exportActiveTemplateId,
    exportInventoryId,
    exportWarehouseId,
    exportStockFallbackEnabled,
    imageRetryPresets,
    setInventoryId,
    clearInventoryMutation,
  });

  const handleSaveDefaultBaseConnection = useCallback(async (): Promise<void> => {
    const normalizedConnectionId = selectedBaseConnectionId.trim();
    if (!normalizedConnectionId) {
      toast('Select a Base.com connection first.', { variant: 'error' });
      return;
    }

    try {
      await saveDefaultConnectionMutation.mutateAsync({
        connectionId: normalizedConnectionId,
      });
      toast('Default Base.com connection saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      const message =
        error instanceof Error ? error.message : 'Failed to save default Base.com connection.';
      toast(message, { variant: 'error' });
    }
  }, [saveDefaultConnectionMutation, selectedBaseConnectionId, toast]);

  const importing =
    importMutation.isPending ||
    resumeImportRunMutation.isPending ||
    cancelImportRunMutation.isPending ||
    activeRunBusy;
  const savingDefaultConnection = saveDefaultConnectionMutation.isPending;
  const savingExportSettings = saveExportSettingsMutation.isPending;
  const savingImportTemplate =
    templates.saveImportTemplateMutation.isPending ||
    templates.createImportTemplateMutation.isPending;
  const savingExportTemplate =
    templates.saveExportTemplateMutation.isPending ||
    templates.createExportTemplateMutation.isPending;

  const stateValue = useMemo<ImportExportStateContextType>(
    () => ({
      inventoryId,
      setInventoryId,
      exportInventoryId,
      setExportInventoryId,
      exportWarehouseId,
      setExportWarehouseId,
      catalogId,
      setCatalogId,
      limit,
      setLimit,
      imageMode,
      setImageMode,
      importMode,
      setImportMode,
      importDryRun,
      setImportDryRun,
      allowDuplicateSku,
      setAllowDuplicateSku,
      uniqueOnly,
      setUniqueOnly,
      importTemplateId,
      setImportTemplateId,
      ...templates,
      exportImagesAsBase64: templates.exportImagesAsBase64,
      setExportImagesAsBase64: templates.setExportImagesAsBase64,
      exportStockFallbackEnabled,
      setExportStockFallbackEnabled,
      imageRetryPresets,
      setImageRetryPresets,
      selectedBaseConnectionId,
      setSelectedBaseConnectionId,
      importNameSearch,
      setImportNameSearch,
      importSkuSearch,
      setImportSkuSearch,
      importListPage,
      setImportListPage,
      importListPageSize,
      setImportListPageSize,
      importListEnabled,
      setImportListEnabled,
      selectedImportIds,
      setSelectedImportIds,
      templateScope,
      setTemplateScope,
      showAllWarehouses,
      setShowAllWarehouses,
      includeAllWarehouses,
      setIncludeAllWarehouses,
      debugWarehouses,
      setDebugWarehouses,
    }),
    [
      allowDuplicateSku,
      catalogId,
      debugWarehouses,
      exportInventoryId,
      exportStockFallbackEnabled,
      exportWarehouseId,
      imageMode,
      imageRetryPresets,
      importDryRun,
      importListEnabled,
      importListPage,
      importListPageSize,
      importMode,
      importNameSearch,
      importSkuSearch,
      importTemplateId,
      includeAllWarehouses,
      inventoryId,
      limit,
      selectedBaseConnectionId,
      selectedImportIds,
      showAllWarehouses,
      templateScope,
      templates,
      uniqueOnly,
    ]
  );

  const dataValue = useMemo<ImportExportDataContextType>(
    () => ({
      integrationsWithConnections,
      checkingIntegration,
      isBaseConnected,
      baseConnections,
      catalogsData,
      loadingCatalogs,
      importTemplates,
      loadingImportTemplates,
      exportTemplates,
      loadingExportTemplates,
      inventories,
      isFetchingInventories,
      warehouses,
      allWarehouses,
      isFetchingWarehouses,
      importList,
      loadingImportList,
      importListStats,
      lastResult,
      activeImportRunId,
      activeImportRun,
      loadingImportRun,
      importSourceFields,
      importSourceFieldValues,
      loadingImportSourceFields,
    }),
    [
      activeImportRun,
      activeImportRunId,
      allWarehouses,
      baseConnections,
      catalogsData,
      checkingIntegration,
      exportTemplates,
      importList,
      importListStats,
      importSourceFieldValues,
      importSourceFields,
      integrationsWithConnections,
      inventories,
      isBaseConnected,
      isFetchingInventories,
      isFetchingWarehouses,
      lastResult,
      loadingCatalogs,
      loadingExportTemplates,
      loadingImportList,
      loadingImportRun,
      loadingImportSourceFields,
      loadingImportTemplates,
      importTemplates,
      warehouses,
    ]
  );

  const actionsValue = useMemo<ImportExportActionsContextType>(
    () => ({
      ...runtimeActions,
      handleSaveDefaultBaseConnection,
      handleNewTemplate: () => templates.handleNewTemplate(templateScope),
      handleDuplicateTemplate: () => templates.handleDuplicateTemplate(templateScope),
      handleCreateExportFromImportTemplate: templates.handleCreateExportFromImportTemplate,
      handleSaveTemplate: () => templates.handleSaveTemplate(templateScope),
      handleDeleteTemplate: () => templates.handleDeleteTemplate(templateScope),
      applyTemplate: templates.applyTemplate,
      importing,
      savingDefaultConnection,
      savingExportSettings,
      savingImportTemplate,
      savingExportTemplate,
    }),
    [
      handleSaveDefaultBaseConnection,
      importing,
      runtimeActions,
      savingDefaultConnection,
      savingExportSettings,
      savingExportTemplate,
      savingImportTemplate,
      templateScope,
      templates,
    ]
  );

  return {
    actionsValue,
    dataValue,
    stateValue,
  };
}
