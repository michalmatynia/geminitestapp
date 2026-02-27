'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  useImportPreference,
  useTemplates,
  useSavePreferenceMutation,
  useSaveDefaultConnectionMutation,
  useImportMutation,
  useResumeImportRunMutation,
  useCancelImportRunMutation,
  useSaveExportSettingsMutation,
  useClearInventoryMutation,
  useImportParameterCache,
  useRefreshImportParameterCacheMutation,
} from '@/features/data-import-export/hooks/useImportQueries';
import {
  getDefaultImageRetryPresets,
} from '@/features/data-import-export/utils/image-retry-presets';
import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import { useCatalogs } from '@/features/products/hooks/useProductSettingsQueries';
import type {
  ImportResponse,
  Template,
  DebugWarehouses,
  CatalogOption,
} from '@/shared/contracts/data-import-export';
import type { 
  IntegrationConnectionBasic,
  IntegrationWithConnections,
  BaseImportMode,
  ImageRetryPreset,
  ImportParameterCacheResponse,
} from '@/shared/contracts/integrations';
import {
  defaultBaseImportParameterImportSettings,
} from '@/shared/contracts/integrations';
import { useToast } from '@/shared/ui';

import { createImportExportRuntimeActions } from './import-export-runtime-actions';

import type { ImportExportContextType } from './ImportExportContext.types';
import { useImportExportPreferences } from './import-export/useImportExportPreferences';
import { useImportExportTemplates } from './import-export/useImportExportTemplates';
import { useImportExportData } from './import-export/useImportExportData';

const ImportExportContext = createContext<ImportExportContextType | undefined>(undefined);

export function ImportExportProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
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
  const [imageRetryPresets, setImageRetryPresets] = useState<ImageRetryPreset[]>(getDefaultImageRetryPresets());
  
  const [isBaseConnected, setIsBaseConnected] = useState(false);
  const [baseConnections, setBaseConnections] = useState<IntegrationConnectionBasic[]>([]);
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

  // Queries
  const { data: integrationsWithConnectionsData, isLoading: checkingIntegration } = useIntegrationsWithConnections();
  const integrationsWithConnections = useMemo((): IntegrationWithConnections[] => 
    Array.isArray(integrationsWithConnectionsData) ? integrationsWithConnectionsData : [],
  [integrationsWithConnectionsData]
  );
  const catalogsQuery = useCatalogs();
  const catalogsData = useMemo<CatalogOption[]>(() => (catalogsQuery.data as unknown as CatalogOption[]) || [], [catalogsQuery.data]);
  const loadingCatalogs = catalogsQuery.isLoading;
  
  const { data: importTemplates = [], isLoading: loadingImportTemplates } = useTemplates('import');
  const { data: exportTemplates = [], isLoading: loadingExportTemplates } = useTemplates('export');
  const normalizedSelectedBaseConnectionId = selectedBaseConnectionId.trim();
  const normalizedImportInventoryId = inventoryId.trim();
  const normalizedExportInventoryId = exportInventoryId.trim();
  const importTemplateScopeReady =
    normalizedSelectedBaseConnectionId.length > 0 &&
    normalizedImportInventoryId.length > 0;
  const exportTemplateScopeReady =
    normalizedSelectedBaseConnectionId.length > 0 &&
    normalizedExportInventoryId.length > 0;
  const importTemplateScopeKey = importTemplateScopeReady
    ? `${normalizedSelectedBaseConnectionId}:${normalizedImportInventoryId}`
    : '';
  const exportTemplateScopeKey = exportTemplateScopeReady
    ? `${normalizedSelectedBaseConnectionId}:${normalizedExportInventoryId}`
    : '';

  const buildScopedTemplatePreferenceEndpoint = (
    endpoint: string,
    connectionId: string,
    inventoryId: string
  ): string => {
    const params = new URLSearchParams({
      connectionId,
      inventoryId,
    });
    return `${endpoint}?${params.toString()}`;
  };

  // Sync connections
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (integrationsWithConnections) {
      const baseIntegration = integrationsWithConnections.find(
        (i: IntegrationWithConnections): boolean =>
          ['baselinker', 'base-com', 'base'].includes((i.slug ?? '').trim().toLowerCase()),
      );
      const connections = baseIntegration?.connections ?? [];
      timer = setTimeout(() => {
        setBaseConnections(connections);
        setIsBaseConnected(connections.length > 0);
        if (connections.length === 0) {
          setSelectedBaseConnectionId('');
          return;
        }
        const hasSelected = connections.some(
          (connection: IntegrationConnectionBasic) =>
            connection.id === selectedBaseConnectionId
        );
        if (!selectedBaseConnectionId || !hasSelected) {
          setSelectedBaseConnectionId(connections[0]?.id || '');
        }
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [integrationsWithConnections, selectedBaseConnectionId]);

  // Sync default catalog
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (catalogsData.length > 0 && !catalogId && !hasInitializedCatalog.current) {
      const defaultCatalog = catalogsData.find((catalog: CatalogOption) => catalog.isDefault);
      if (defaultCatalog) {
        timer = setTimeout(() => {
          setCatalogId(defaultCatalog.id);
          hasInitializedCatalog.current = true;
        }, 0);
      }
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [catalogsData, catalogId]);

  // Preferences
  const { data: lastImportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    'last-template',
    '/api/integrations/imports/base/last-template'
  );
  const { data: activeImportTemplatePref, isFetched: hasFetchedActiveImportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    `active-template:${importTemplateScopeKey || 'none'}`,
    importTemplateScopeReady
      ? buildScopedTemplatePreferenceEndpoint(
        '/api/integrations/imports/base/active-template',
        normalizedSelectedBaseConnectionId,
        normalizedImportInventoryId
      )
      : '/api/integrations/imports/base/active-template',
    { enabled: importTemplateScopeReady }
  );
  const { data: activeExportTemplatePref, isFetched: hasFetchedActiveExportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    `export-active-template:${exportTemplateScopeKey || 'none'}`,
    exportTemplateScopeReady
      ? buildScopedTemplatePreferenceEndpoint(
        '/api/integrations/exports/base/active-template',
        normalizedSelectedBaseConnectionId,
        normalizedExportInventoryId
      )
      : '/api/integrations/exports/base/active-template',
    { enabled: exportTemplateScopeReady }
  );
  const { data: defaultExportInventoryPref } = useImportPreference<{ inventoryId?: string | null }>(
    'default-inventory',
    '/api/integrations/exports/base/default-inventory'
  );
  const { data: defaultConnectionPref } = useImportPreference<{ connectionId?: string | null }>(
    'default-connection',
    '/api/integrations/exports/base/default-connection'
  );
  const { data: exportStockFallbackPref } = useImportPreference<{ enabled?: boolean }>(
    'stock-fallback',
    '/api/integrations/exports/base/stock-fallback'
  );
  const { data: imageRetryPresetsPref } = useImportPreference<{ presets?: ImageRetryPreset[] }>(
    'image-retry-presets',
    '/api/integrations/exports/base/image-retry-presets',
    { fallback: { presets: getDefaultImageRetryPresets() } }
  );
  const { data: sampleProductPref } = useImportPreference<{ productId?: string | null; inventoryId?: string | null }>(
    'sample-product',
    '/api/integrations/imports/base/sample-product'
  );

  useImportExportPreferences({
    lastImportTemplatePref,
    defaultExportInventoryPref,
    defaultConnectionPref,
    exportStockFallbackPref,
    imageRetryPresetsPref,
    sampleProductPref,
    baseConnections,
    setImportTemplateId,
    setExportInventoryId,
    setSelectedBaseConnectionId,
    setExportStockFallbackEnabled,
    setImageRetryPresets,
    setInventoryId,
  });

  const templates = useImportExportTemplates({
    toast,
    importTemplates,
    exportTemplates,
    setTemplateScope,
  });

  const { applyTemplate } = templates;

  useEffect(() => {
    if (!importTemplateScopeReady) return;
    if (!hasFetchedActiveImportTemplatePref || importTemplates.length === 0) return;
    if (lastHydratedImportActiveTemplateScope.current === importTemplateScopeKey) return;
    const preferredTemplateId = activeImportTemplatePref?.templateId?.trim() || '';
    const preferred = preferredTemplateId
      ? importTemplates.find((t: Template) => t.id === preferredTemplateId) ?? null
      : null;
    skipNextImportActiveTemplatePersist.current = true;
    if (preferred) {
      applyTemplate(preferred, 'import');
    } else {
      templates.setImportActiveTemplateId('');
      templates.setImportTemplateName('');
      templates.setImportTemplateDescription('');
      templates.setImportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      templates.setImportTemplateParameterImport(
        defaultBaseImportParameterImportSettings
      );
    }
    lastHydratedImportActiveTemplateScope.current = importTemplateScopeKey;
  }, [
    importTemplateScopeReady,
    importTemplateScopeKey,
    activeImportTemplatePref,
    hasFetchedActiveImportTemplatePref,
    importTemplates,
    applyTemplate,
  ]);

  useEffect(() => {
    if (!exportTemplateScopeReady) return;
    if (!hasFetchedActiveExportTemplatePref || exportTemplates.length === 0) return;
    if (lastHydratedExportActiveTemplateScope.current === exportTemplateScopeKey) return;
    const preferredTemplateId = activeExportTemplatePref?.templateId?.trim() || '';
    const preferred = preferredTemplateId
      ? exportTemplates.find((t: Template) => t.id === preferredTemplateId) ?? null
      : null;
    skipNextExportActiveTemplatePersist.current = true;
    if (preferred) {
      applyTemplate(preferred, 'export');
    } else {
      templates.setExportActiveTemplateId('');
      templates.setExportTemplateName('');
      templates.setExportTemplateDescription('');
      templates.setExportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      templates.setExportImagesAsBase64(false);
    }
    lastHydratedExportActiveTemplateScope.current = exportTemplateScopeKey;
  }, [
    exportTemplateScopeReady,
    exportTemplateScopeKey,
    activeExportTemplatePref,
    hasFetchedActiveExportTemplatePref,
    exportTemplates,
    applyTemplate,
  ]);

  const importParameterCacheQuery = useImportParameterCache(isBaseConnected);
  const importParameterCache = useMemo<ImportParameterCacheResponse | null>(() => {
    return importParameterCacheQuery.data ?? null;
  }, [importParameterCacheQuery.data]);
  const importSourceFields = useMemo<string[]>(() => {
    const rawKeys = Array.isArray(importParameterCache?.keys)
      ? importParameterCache.keys
      : [];
    const normalized = rawKeys
      .map((key: unknown): string => (typeof key === 'string' ? key.trim() : ''))
      .filter((key: string): boolean => key.length > 0);
    return Array.from(new Set(normalized)).sort((a: string, b: string) =>
      a.localeCompare(b)
    );
  }, [importParameterCache?.keys]);
  const importSourceFieldValues = useMemo<Record<string, string>>(() => {
    const rawValues = importParameterCache?.values;
    if (!rawValues || typeof rawValues !== 'object') return {};
    const normalized: Record<string, string> = {};
    Object.entries(rawValues).forEach(([key, value]: [string, unknown]) => {
      const normalizedKey = key.trim();
      if (!normalizedKey || typeof value !== 'string') return;
      const normalizedValue = value.trim();
      if (!normalizedValue) return;
      normalized[normalizedKey] = normalizedValue;
    });
    return normalized;
  }, [importParameterCache?.values]);

  const data = useImportExportData({
    selectedBaseConnectionId,
    isBaseConnected,
    inventoriesEnabled,
    inventoryId,
    setInventoryId,
    exportInventoryId,
    setExportInventoryId,
    includeAllWarehouses,
    warehousesEnabled,
    catalogId,
    limit,
    uniqueOnly,
    importListPage,
    importListPageSize,
    importNameSearch,
    importSkuSearch,
    importListEnabled,
    activeImportRunId,
    pollImportRun,
    setPollImportRun,
  });

  const {
    inventories,
    isFetchingInventories,
    refetchInventories,
    warehouses,
    allWarehouses,
    isFetchingWarehouses,
    refetchWarehouses,
    importList,
    loadingImportList,
    refetchImportList,
    importListStats,
    activeImportRun,
    loadingImportRun,
  } = data;

  // Mutations
  const savePreferenceMutation = useSavePreferenceMutation();
  const saveDefaultConnectionMutation = useSaveDefaultConnectionMutation();
  const importMutation = useImportMutation();
  const resumeImportRunMutation = useResumeImportRunMutation(activeImportRunId);
  const cancelImportRunMutation = useCancelImportRunMutation(activeImportRunId);
  const saveExportSettingsMutation = useSaveExportSettingsMutation();
  const clearInventoryMutation = useClearInventoryMutation();
  const refreshImportParameterCacheMutation =
    useRefreshImportParameterCacheMutation();

  // Auto-save preferences
  useEffect(() => {
    const normalized = importTemplateId.trim() || null;
    const persisted = lastImportTemplatePref?.templateId?.trim() || null;
    if (persisted === normalized) return;
    if (lastSavedImportTemplateId.current === normalized) return;
    lastSavedImportTemplateId.current = normalized;
    savePreferenceMutation.mutate({
      endpoint: '/api/integrations/imports/base/last-template',
      data: normalized ? { templateId: normalized } : {},
    });
  }, [importTemplateId, lastImportTemplatePref?.templateId, savePreferenceMutation]);

  useEffect(() => {
    if (!importTemplateScopeReady) return;
    if (!hasFetchedActiveImportTemplatePref) return;
    if (lastHydratedImportActiveTemplateScope.current !== importTemplateScopeKey) return;
    if (skipNextImportActiveTemplatePersist.current) {
      skipNextImportActiveTemplatePersist.current = false;
      return;
    }
    const normalized = templates.importActiveTemplateId.trim() || null;
    const persisted = activeImportTemplatePref?.templateId?.trim() || null;
    if (persisted === normalized) return;
    const saveSignature = `${importTemplateScopeKey}:${normalized ?? ''}`;
    if (lastSavedImportActiveTemplateId.current === saveSignature) return;
    lastSavedImportActiveTemplateId.current = saveSignature;
    savePreferenceMutation.mutate({
      endpoint: '/api/integrations/imports/base/active-template',
      data: {
        templateId: normalized,
        connectionId: normalizedSelectedBaseConnectionId,
        inventoryId: normalizedImportInventoryId,
      },
    });
  }, [
    importTemplateScopeReady,
    importTemplateScopeKey,
    hasFetchedActiveImportTemplatePref,
    templates.importActiveTemplateId,
    activeImportTemplatePref?.templateId,
    normalizedSelectedBaseConnectionId,
    normalizedImportInventoryId,
    savePreferenceMutation,
  ]);

  useEffect(() => {
    if (!exportTemplateScopeReady) return;
    if (!hasFetchedActiveExportTemplatePref) return;
    if (lastHydratedExportActiveTemplateScope.current !== exportTemplateScopeKey) return;
    if (skipNextExportActiveTemplatePersist.current) {
      skipNextExportActiveTemplatePersist.current = false;
      return;
    }
    const normalized = templates.exportActiveTemplateId.trim() || null;
    const persisted = activeExportTemplatePref?.templateId?.trim() || null;
    if (persisted === normalized) return;
    const saveSignature = `${exportTemplateScopeKey}:${normalized ?? ''}`;
    if (lastSavedExportActiveTemplateId.current === saveSignature) return;
    lastSavedExportActiveTemplateId.current = saveSignature;
    savePreferenceMutation.mutate({
      endpoint: '/api/integrations/exports/base/active-template',
      data: {
        templateId: normalized,
        connectionId: normalizedSelectedBaseConnectionId,
        inventoryId: normalizedExportInventoryId,
      },
    });
  }, [
    exportTemplateScopeReady,
    exportTemplateScopeKey,
    hasFetchedActiveExportTemplatePref,
    templates.exportActiveTemplateId,
    activeExportTemplatePref?.templateId,
    normalizedSelectedBaseConnectionId,
    normalizedExportInventoryId,
    savePreferenceMutation,
  ]);

  useEffect(() => {
    const normalizedInventoryId = inventoryId.trim();
    const normalizedConnectionId = selectedBaseConnectionId.trim();
    if (!normalizedInventoryId || !normalizedConnectionId || !isBaseConnected) {
      return;
    }
    const schemaCacheKey = `${normalizedConnectionId}:${normalizedInventoryId}`;
    const cachedInventoryId =
      typeof importParameterCache?.inventoryId === 'string'
        ? importParameterCache.inventoryId.trim()
        : '';
    if (
      cachedInventoryId === normalizedInventoryId &&
      importSourceFields.length > 0
    ) {
      lastHydratedImportSchemaKey.current = schemaCacheKey;
      return;
    }
    if (lastHydratedImportSchemaKey.current === schemaCacheKey) {
      return;
    }
    if (refreshImportParameterCacheMutation.isPending) {
      return;
    }
    lastHydratedImportSchemaKey.current = schemaCacheKey;
    void refreshImportParameterCacheMutation
      .mutateAsync({
        inventoryId: normalizedInventoryId,
        connectionId: normalizedConnectionId,
      })
      .catch(() => {
        // Source fields remain optional; users can still enter custom keys.
      });
  }, [
    inventoryId,
    selectedBaseConnectionId,
    isBaseConnected,
    importParameterCache?.inventoryId,
    importSourceFields.length,
    refreshImportParameterCacheMutation,
  ]);

  const activeRunBusy =
    activeImportRun?.run.status === 'queued' ||
    activeImportRun?.run.status === 'running';

  const runtimeActions = createImportExportRuntimeActions({
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
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save default Base.com connection.';
      toast(message, { variant: 'error' });
    }
  }, [selectedBaseConnectionId, saveDefaultConnectionMutation, toast]);

  const value: ImportExportContextType = {
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
    isBaseConnected,
    baseConnections,
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
    lastResult,
    setLastResult,
    activeImportRunId,
    activeImportRun,
    loadingImportRun,
    importSourceFields,
    importSourceFieldValues,
    loadingImportSourceFields:
      importParameterCacheQuery.isFetching ||
      refreshImportParameterCacheMutation.isPending,
    templateScope,
    setTemplateScope,
    showAllWarehouses,
    setShowAllWarehouses,
    includeAllWarehouses,
    setIncludeAllWarehouses,
    debugWarehouses,
    setDebugWarehouses,

    integrationsWithConnections,
    checkingIntegration,
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

    ...runtimeActions,
    handleSaveDefaultBaseConnection,
    handleNewTemplate: () => templates.handleNewTemplate(templateScope),
    handleDuplicateTemplate: () => templates.handleDuplicateTemplate(templateScope),
    handleSaveTemplate: () => templates.handleSaveTemplate(templateScope),
    handleDeleteTemplate: () => templates.handleDeleteTemplate(templateScope),

    importing:
      importMutation.isPending ||
      resumeImportRunMutation.isPending ||
      cancelImportRunMutation.isPending ||
      activeRunBusy,
    savingDefaultConnection: saveDefaultConnectionMutation.isPending,
    savingExportSettings: saveExportSettingsMutation.isPending,
    savingImportTemplate: templates.saveImportTemplateMutation.isPending || templates.createImportTemplateMutation.isPending,
    savingExportTemplate: templates.saveExportTemplateMutation.isPending || templates.createExportTemplateMutation.isPending,
  };

  return (
    <ImportExportContext.Provider value={value}>
      {children}
    </ImportExportContext.Provider>
  );
}

export function useImportExport(): ImportExportContextType {
  const context = useContext(ImportExportContext);
  if (context === undefined) {
    throw new Error('useImportExport must be used within an ImportExportProvider');
  }
  return context;
}
