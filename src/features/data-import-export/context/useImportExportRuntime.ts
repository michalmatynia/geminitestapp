'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useCancelImportRunMutation,
  useClearInventoryMutation,
  useImportMutation,
  useResumeImportRunMutation,
  useSaveDefaultConnectionMutation,
  useSaveExportSettingsMutation,
} from '@/features/data-import-export/hooks/useImportQueries';
import { getDefaultImageRetryPresets } from '@/features/data-import-export/utils/image-retry-presets';
import type { BaseImportMode } from '@/shared/contracts/integrations/base-com';
import type { DebugWarehouses, ImportResponse } from '@/shared/contracts/integrations/import-export';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import { useToast } from '@/shared/ui/primitives.public';

import { createImportExportRuntimeActions } from './import-export-runtime-actions';
import { useImportExportRuntimeResources } from './useImportExportRuntimeResources';

import type {
  ImportExportActionsContextType,
  ImportExportDataContextType,
  ImportsPageTab,
  ImportExportStateContextType,
} from './ImportExportContext.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


interface ImportExportRuntimeResult {
  actionsValue: ImportExportActionsContextType;
  dataValue: ImportExportDataContextType;
  stateValue: ImportExportStateContextType;
}

const IMPORT_SETTINGS_STORAGE_KEY = 'product-import-runtime.v1';

type PersistedImportRuntimeState = {
  version: 1;
  saveImportSettings: true;
  importsPageTab: ImportsPageTab;
  selectedBaseConnectionId: string;
  inventoryId: string;
  catalogId: string;
  limit: string;
  imageMode: 'links' | 'download';
  importMode: BaseImportMode;
  importDryRun: boolean;
  uniqueOnly: boolean;
  allowDuplicateSku: boolean;
  importTemplateId: string;
  importNameSearch: string;
  importSkuSearch: string;
  importListPage: number;
  importListPageSize: number;
  importListEnabled: boolean;
};

type PersistedImportRuntimeStateInput = Omit<
  PersistedImportRuntimeState,
  'version' | 'saveImportSettings'
>;

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const DEFAULT_IMPORTS_PAGE_TAB: ImportsPageTab = 'import-list';

const normalizeImportsPageTab = (value: unknown): ImportsPageTab | null => {
  if (value === 'import') return 'import-list';
  if (
    value === 'import-list' ||
    value === 'import-settings' ||
    value === 'import-template'
  ) {
    return value;
  }
  return null;
};

const isImageMode = (value: unknown): value is 'links' | 'download' =>
  value === 'links' || value === 'download';

const isBaseImportMode = (value: unknown): value is BaseImportMode =>
  value === 'create_only' || value === 'upsert_on_base_id' || value === 'upsert_on_sku';

const buildPersistedImportRuntimeState = (
  value: PersistedImportRuntimeStateInput
): PersistedImportRuntimeState => ({
  version: 1,
  saveImportSettings: true,
  ...value,
});

const arePersistedImportRuntimeStatesEqual = (
  left: PersistedImportRuntimeState | null,
  right: PersistedImportRuntimeState | null
): boolean => JSON.stringify(left) === JSON.stringify(right);

const readPersistedImportRuntimeState = (): PersistedImportRuntimeState | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(IMPORT_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed['version'] !== 1 || parsed['saveImportSettings'] !== true) return null;

    return {
      version: 1,
      saveImportSettings: true,
      importsPageTab: normalizeImportsPageTab(parsed['importsPageTab']) ?? DEFAULT_IMPORTS_PAGE_TAB,
      selectedBaseConnectionId:
        typeof parsed['selectedBaseConnectionId'] === 'string'
          ? parsed['selectedBaseConnectionId']
          : '',
      inventoryId: typeof parsed['inventoryId'] === 'string' ? parsed['inventoryId'] : '',
      catalogId: typeof parsed['catalogId'] === 'string' ? parsed['catalogId'] : '',
      limit: typeof parsed['limit'] === 'string' ? parsed['limit'] : 'all',
      imageMode: isImageMode(parsed['imageMode']) ? parsed['imageMode'] : 'download',
      importMode: isBaseImportMode(parsed['importMode'])
        ? parsed['importMode']
        : 'upsert_on_base_id',
      importDryRun: parsed['importDryRun'] === true,
      uniqueOnly: parsed['uniqueOnly'] !== false,
      allowDuplicateSku: parsed['allowDuplicateSku'] === true,
      importTemplateId: typeof parsed['importTemplateId'] === 'string' ? parsed['importTemplateId'] : '',
      importNameSearch: typeof parsed['importNameSearch'] === 'string' ? parsed['importNameSearch'] : '',
      importSkuSearch: typeof parsed['importSkuSearch'] === 'string' ? parsed['importSkuSearch'] : '',
      importListPage:
        typeof parsed['importListPage'] === 'number' && parsed['importListPage'] > 0
          ? Math.floor(parsed['importListPage'])
          : 1,
      importListPageSize:
        typeof parsed['importListPageSize'] === 'number' && parsed['importListPageSize'] > 0
          ? Math.floor(parsed['importListPageSize'])
          : 25,
      importListEnabled: parsed['importListEnabled'] === true,
    };
  } catch (error: unknown) {
    logClientError(error);
    try {
      window.localStorage.removeItem(IMPORT_SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures after malformed payloads.
    }
    return null;
  }
};

const writePersistedImportRuntimeState = (value: PersistedImportRuntimeState | null): void => {
  if (!isBrowser()) return;
  try {
    if (!value) {
      window.localStorage.removeItem(IMPORT_SETTINGS_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(IMPORT_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch (error: unknown) {
    logClientError(error);
  }
};

export function useImportExportRuntime(): ImportExportRuntimeResult {
  const { toast } = useToast();

  const [saveImportSettings, setSaveImportSettings] = useState(false);
  const [savedImportSettingsSnapshot, setSavedImportSettingsSnapshot] =
    useState<PersistedImportRuntimeState | null>(null);
  const [importsPageTab, setImportsPageTab] = useState<ImportsPageTab>(DEFAULT_IMPORTS_PAGE_TAB);
  const [showAllWarehouses, setShowAllWarehouses] = useState(false);
  const [includeAllWarehouses, setIncludeAllWarehouses] = useState(false);
  const [inventoryId, setInventoryId] = useState('');
  const [exportInventoryId, setExportInventoryId] = useState('');
  const [exportWarehouseId, setExportWarehouseId] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [limit, setLimit] = useState('all');
  const [imageMode, setImageMode] = useState<'links' | 'download'>('download');
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
  const importSettingsHydrated = useRef(false);

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

  const currentPersistedImportRuntimeState = useMemo<PersistedImportRuntimeState>(
    () =>
      buildPersistedImportRuntimeState({
        importsPageTab,
        selectedBaseConnectionId,
        inventoryId,
        catalogId,
        limit,
        imageMode,
        importMode,
        importDryRun,
        uniqueOnly,
        allowDuplicateSku,
        importTemplateId,
        importNameSearch,
        importSkuSearch,
        importListPage,
        importListPageSize,
        importListEnabled,
      }),
    [
      allowDuplicateSku,
      catalogId,
      imageMode,
      importDryRun,
      importListEnabled,
      importListPage,
      importListPageSize,
      importMode,
      importNameSearch,
      importSkuSearch,
      importTemplateId,
      importsPageTab,
      inventoryId,
      limit,
      selectedBaseConnectionId,
      uniqueOnly,
    ]
  );

  const hasUnsavedImportSettingsChanges = useMemo(
    () =>
      saveImportSettings &&
      savedImportSettingsSnapshot !== null &&
      !arePersistedImportRuntimeStatesEqual(
        savedImportSettingsSnapshot,
        currentPersistedImportRuntimeState
      ),
    [currentPersistedImportRuntimeState, saveImportSettings, savedImportSettingsSnapshot]
  );

  useEffect(() => {
    const persisted = readPersistedImportRuntimeState();
    if (persisted) {
      setSaveImportSettings(true);
      setSavedImportSettingsSnapshot(persisted);
      setImportsPageTab(persisted.importsPageTab);
      setSelectedBaseConnectionId(persisted.selectedBaseConnectionId);
      setInventoryId(persisted.inventoryId);
      setCatalogId(persisted.catalogId);
      setLimit(persisted.limit);
      setImageMode(persisted.imageMode);
      setImportMode(persisted.importMode);
      setImportDryRun(persisted.importDryRun);
      setUniqueOnly(persisted.uniqueOnly);
      setAllowDuplicateSku(persisted.allowDuplicateSku);
      setImportTemplateId(persisted.importTemplateId);
      setImportNameSearch(persisted.importNameSearch);
      setImportSkuSearch(persisted.importSkuSearch);
      setImportListPage(persisted.importListPage);
      setImportListPageSize(persisted.importListPageSize);
      setImportListEnabled(persisted.importListEnabled);
      if (persisted.selectedBaseConnectionId || persisted.inventoryId) {
        setInventoriesEnabled(true);
      }
    } else {
      setSaveImportSettings(false);
      setSavedImportSettingsSnapshot(null);
    }
    importSettingsHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!saveImportSettings || !selectedBaseConnectionId || baseConnections.length === 0) return;
    const hasSelectedConnection = baseConnections.some(
      (connection) => connection.id === selectedBaseConnectionId
    );
    if (!hasSelectedConnection) {
      setSelectedBaseConnectionId('');
      setInventoryId('');
      setImportTemplateId('');
      setImportListEnabled(false);
    }
  }, [baseConnections, saveImportSettings, selectedBaseConnectionId]);

  useEffect(() => {
    if (!saveImportSettings || !inventoryId || inventories.length === 0) return;
    const hasInventory = inventories.some((inventory) => inventory.id === inventoryId);
    if (!hasInventory) {
      setInventoryId('');
      setImportListEnabled(false);
    }
  }, [inventories, inventoryId, saveImportSettings]);

  useEffect(() => {
    if (!saveImportSettings || !catalogId || catalogsData.length === 0) return;
    const hasCatalog = catalogsData.some((catalog) => catalog.id === catalogId);
    if (!hasCatalog) {
      setCatalogId('');
    }
  }, [catalogId, catalogsData, saveImportSettings]);

  useEffect(() => {
    if (!saveImportSettings || !importTemplateId || importTemplates.length === 0) return;
    const hasTemplate = importTemplates.some((template) => template.id === importTemplateId);
    if (!hasTemplate) {
      setImportTemplateId('');
    }
  }, [importTemplateId, importTemplates, saveImportSettings]);

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

  const handleSaveImportSettings = useCallback(async (): Promise<void> => {
    if (!importSettingsHydrated.current) return;
    writePersistedImportRuntimeState(currentPersistedImportRuntimeState);
    setSavedImportSettingsSnapshot(currentPersistedImportRuntimeState);
    setSaveImportSettings(true);
    toast('Import settings saved for this browser.', { variant: 'success' });
  }, [currentPersistedImportRuntimeState, toast]);

  const handleClearSavedImportSettings = useCallback(async (): Promise<void> => {
    writePersistedImportRuntimeState(null);
    setSavedImportSettingsSnapshot(null);
    setSaveImportSettings(false);
    toast('Saved import settings cleared.', { variant: 'success' });
  }, [toast]);

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
      saveImportSettings,
      hasUnsavedImportSettingsChanges,
      importsPageTab,
      setImportsPageTab,
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
      activeImportRunId,
      setActiveImportRunId,
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
      hasUnsavedImportSettingsChanges,
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
      importsPageTab,
      includeAllWarehouses,
      inventoryId,
      limit,
      activeImportRunId,
      saveImportSettings,
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
      handleSaveImportSettings,
      handleClearSavedImportSettings,
      handleSaveDefaultBaseConnection,
      handleNewTemplate: (scope) => templates.handleNewTemplate(scope ?? templateScope),
      handleDuplicateTemplate: (scope) => templates.handleDuplicateTemplate(scope ?? templateScope),
      handleCreateExportFromImportTemplate: templates.handleCreateExportFromImportTemplate,
      handleSaveTemplate: (scope) => templates.handleSaveTemplate(scope ?? templateScope),
      handleDeleteTemplate: (scope) => templates.handleDeleteTemplate(scope ?? templateScope),
      applyTemplate: templates.applyTemplate,
      importing,
      savingDefaultConnection,
      savingExportSettings,
      savingImportTemplate,
      savingExportTemplate,
    }),
    [
      handleClearSavedImportSettings,
      handleSaveImportSettings,
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
