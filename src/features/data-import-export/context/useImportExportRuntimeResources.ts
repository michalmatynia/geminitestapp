'use client';

import {
  useEffect,
  useMemo,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import {
  useCatalogs,
  useImportParameterCache,
  useImportPreference,
  useRefreshImportParameterCacheMutation,
  useSavePreferenceMutation,
  useTemplates,
} from '@/features/data-import-export/hooks/useImportQueries';
import { getDefaultImageRetryPresets } from '@/features/data-import-export/utils/image-retry-presets';
import { useIntegrationsWithConnections } from '@/features/integrations';
import type {
  CatalogOption,
  ImageRetryPreset,
  ImportParameterCacheResponse,
  IntegrationConnectionBasic,
  IntegrationWithConnections,
  Template,
} from '@/shared/contracts/integrations';
import { defaultBaseImportParameterImportSettings } from '@/shared/contracts/integrations';
import type { Toast } from '@/shared/contracts/ui';

import { useImportExportData as useImportExportDataSource } from './import-export/useImportExportData';
import { useImportExportPreferences } from './import-export/useImportExportPreferences';
import { useImportExportTemplates } from './import-export/useImportExportTemplates';

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

interface ImportExportRuntimeResourcesParams {
  activeImportRunId: string;
  catalogId: string;
  exportInventoryId: string;
  importListEnabled: boolean;
  importListPage: number;
  importListPageSize: number;
  importNameSearch: string;
  importSkuSearch: string;
  importTemplateId: string;
  inventoriesEnabled: boolean;
  inventoryId: string;
  hasInitializedCatalog: MutableRefObject<boolean>;
  includeAllWarehouses: boolean;
  lastHydratedExportActiveTemplateScope: MutableRefObject<string>;
  lastHydratedImportActiveTemplateScope: MutableRefObject<string>;
  lastHydratedImportSchemaKey: MutableRefObject<string>;
  lastSavedExportActiveTemplateId: MutableRefObject<string | null>;
  lastSavedImportActiveTemplateId: MutableRefObject<string | null>;
  lastSavedImportTemplateId: MutableRefObject<string | null>;
  limit: string;
  pollImportRun: boolean;
  selectedBaseConnectionId: string;
  setBaseConnections: (connections: IntegrationConnectionBasic[]) => void;
  setCatalogId: (id: string) => void;
  setExportInventoryId: (id: string) => void;
  setExportStockFallbackEnabled: (enabled: boolean) => void;
  setImageRetryPresets: Dispatch<SetStateAction<ImageRetryPreset[]>>;
  setImportTemplateId: (id: string) => void;
  setInventoryId: (id: string) => void;
  setIsBaseConnected: (connected: boolean) => void;
  setPollImportRun: (poll: boolean) => void;
  setSelectedBaseConnectionId: (id: string) => void;
  setTemplateScope: (scope: 'import' | 'export') => void;
  skipNextExportActiveTemplatePersist: MutableRefObject<boolean>;
  skipNextImportActiveTemplatePersist: MutableRefObject<boolean>;
  toast: Toast;
  uniqueOnly: boolean;
  warehousesEnabled: boolean;
}

interface ImportExportRuntimeResourcesResult {
  activeImportRun: ReturnType<typeof useImportExportDataSource>['activeImportRun'];
  allWarehouses: ReturnType<typeof useImportExportDataSource>['allWarehouses'];
  baseConnections: IntegrationConnectionBasic[];
  catalogsData: CatalogOption[];
  checkingIntegration: boolean;
  exportTemplates: Template[];
  importTemplates: Template[];
  importList: ReturnType<typeof useImportExportDataSource>['importList'];
  importListStats: ReturnType<typeof useImportExportDataSource>['importListStats'];
  importSourceFieldValues: Record<string, string>;
  importSourceFields: string[];
  integrationsWithConnections: IntegrationWithConnections[];
  inventories: ReturnType<typeof useImportExportDataSource>['inventories'];
  isBaseConnected: boolean;
  isFetchingInventories: boolean;
  isFetchingWarehouses: boolean;
  loadingCatalogs: boolean;
  loadingExportTemplates: boolean;
  loadingImportList: boolean;
  loadingImportRun: boolean;
  loadingImportSourceFields: boolean;
  loadingImportTemplates: boolean;
  refreshImportParameterCacheMutation: ReturnType<typeof useRefreshImportParameterCacheMutation>;
  refetchImportList: ReturnType<typeof useImportExportDataSource>['refetchImportList'];
  refetchInventories: ReturnType<typeof useImportExportDataSource>['refetchInventories'];
  refetchWarehouses: ReturnType<typeof useImportExportDataSource>['refetchWarehouses'];
  templates: ReturnType<typeof useImportExportTemplates>;
  warehouses: ReturnType<typeof useImportExportDataSource>['warehouses'];
}

export function useImportExportRuntimeResources({
  activeImportRunId,
  catalogId,
  exportInventoryId,
  importListEnabled,
  importListPage,
  importListPageSize,
  importNameSearch,
  importSkuSearch,
  importTemplateId,
  inventoriesEnabled,
  inventoryId,
  hasInitializedCatalog,
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
}: ImportExportRuntimeResourcesParams): ImportExportRuntimeResourcesResult {
  const { data: integrationsWithConnectionsData, isLoading: checkingIntegration } =
    useIntegrationsWithConnections();
  const integrationsWithConnections = useMemo(
    (): IntegrationWithConnections[] =>
      Array.isArray(integrationsWithConnectionsData) ? integrationsWithConnectionsData : [],
    [integrationsWithConnectionsData]
  );

  const [baseConnections, isBaseConnected] = useMemo((): [IntegrationConnectionBasic[], boolean] => {
    const baseIntegration = integrationsWithConnections.find(
      (integration: IntegrationWithConnections): boolean =>
        ['baselinker', 'base-com', 'base'].includes((integration.slug ?? '').trim().toLowerCase())
    );
    const connections = baseIntegration?.connections ?? [];
    return [connections, connections.length > 0];
  }, [integrationsWithConnections]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    timer = setTimeout(() => {
      setBaseConnections(baseConnections);
      setIsBaseConnected(isBaseConnected);
      if (baseConnections.length === 0) {
        setSelectedBaseConnectionId('');
        return;
      }
      const hasSelected = baseConnections.some(
        (connection: IntegrationConnectionBasic) => connection.id === selectedBaseConnectionId
      );
      if (!selectedBaseConnectionId || !hasSelected) {
        setSelectedBaseConnectionId(baseConnections[0]?.id || '');
      }
    }, 0);
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [
    baseConnections,
    isBaseConnected,
    selectedBaseConnectionId,
    setBaseConnections,
    setIsBaseConnected,
    setSelectedBaseConnectionId,
  ]);

  const catalogsQuery = useCatalogs();
  const catalogsData = useMemo<CatalogOption[]>(
    () => catalogsQuery.data || [],
    [catalogsQuery.data]
  );
  const loadingCatalogs = catalogsQuery.isLoading;

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
  }, [catalogId, catalogsData, hasInitializedCatalog, setCatalogId]);

  const { data: importTemplates = [], isLoading: loadingImportTemplates } = useTemplates('import');
  const { data: exportTemplates = [], isLoading: loadingExportTemplates } = useTemplates('export');

  const normalizedSelectedBaseConnectionId = selectedBaseConnectionId.trim();
  const normalizedImportInventoryId = inventoryId.trim();
  const normalizedExportInventoryId = exportInventoryId.trim();
  const importTemplateScopeReady =
    normalizedSelectedBaseConnectionId.length > 0 && normalizedImportInventoryId.length > 0;
  const exportTemplateScopeReady =
    normalizedSelectedBaseConnectionId.length > 0 && normalizedExportInventoryId.length > 0;
  const importTemplateScopeKey = importTemplateScopeReady
    ? `${normalizedSelectedBaseConnectionId}:${normalizedImportInventoryId}`
    : '';
  const exportTemplateScopeKey = exportTemplateScopeReady
    ? `${normalizedSelectedBaseConnectionId}:${normalizedExportInventoryId}`
    : '';

  const { data: lastImportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    'last-template',
    '/api/v2/integrations/imports/base/last-template'
  );
  const { data: activeImportTemplatePref, isFetched: hasFetchedActiveImportTemplatePref } =
    useImportPreference<{ templateId?: string | null }>(
      `active-template:${importTemplateScopeKey || 'none'}`,
      importTemplateScopeReady
        ? buildScopedTemplatePreferenceEndpoint(
            '/api/v2/integrations/imports/base/active-template',
            normalizedSelectedBaseConnectionId,
            normalizedImportInventoryId
          )
        : '/api/v2/integrations/imports/base/active-template',
      { enabled: importTemplateScopeReady }
    );
  const { data: activeExportTemplatePref, isFetched: hasFetchedActiveExportTemplatePref } =
    useImportPreference<{ templateId?: string | null }>(
      `export-active-template:${exportTemplateScopeKey || 'none'}`,
      exportTemplateScopeReady
        ? buildScopedTemplatePreferenceEndpoint(
            '/api/v2/integrations/exports/base/active-template',
            normalizedSelectedBaseConnectionId,
            normalizedExportInventoryId
          )
        : '/api/v2/integrations/exports/base/active-template',
      { enabled: exportTemplateScopeReady }
    );
  const { data: defaultExportInventoryPref } = useImportPreference<{ inventoryId?: string | null }>(
    'default-inventory',
    '/api/v2/integrations/exports/base/default-inventory'
  );
  const { data: defaultConnectionPref } = useImportPreference<{ connectionId?: string | null }>(
    'default-connection',
    '/api/v2/integrations/exports/base/default-connection'
  );
  const { data: exportStockFallbackPref } = useImportPreference<{ enabled?: boolean }>(
    'stock-fallback',
    '/api/v2/integrations/exports/base/stock-fallback'
  );
  const { data: imageRetryPresetsPref } = useImportPreference<{ presets?: ImageRetryPreset[] }>(
    'image-retry-presets',
    '/api/v2/integrations/exports/base/image-retry-presets',
    { fallback: { presets: getDefaultImageRetryPresets() } }
  );
  const { data: sampleProductPref } = useImportPreference<{
    productId?: string | null;
    inventoryId?: string | null;
  }>('sample-product', '/api/v2/integrations/imports/base/sample-product');

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
      ? (importTemplates.find((template: Template) => template.id === preferredTemplateId) ?? null)
      : null;
    skipNextImportActiveTemplatePersist.current = true;
    if (preferred) {
      applyTemplate(preferred, 'import');
    } else {
      templates.setImportActiveTemplateId('');
      templates.setImportTemplateName('');
      templates.setImportTemplateDescription('');
      templates.setImportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      templates.setImportTemplateParameterImport(defaultBaseImportParameterImportSettings);
    }
    lastHydratedImportActiveTemplateScope.current = importTemplateScopeKey;
  }, [
    activeImportTemplatePref,
    applyTemplate,
    hasFetchedActiveImportTemplatePref,
    importTemplateScopeKey,
    importTemplateScopeReady,
    importTemplates,
    lastHydratedImportActiveTemplateScope,
    skipNextImportActiveTemplatePersist,
    templates,
  ]);

  useEffect(() => {
    if (!exportTemplateScopeReady) return;
    if (!hasFetchedActiveExportTemplatePref || exportTemplates.length === 0) return;
    if (lastHydratedExportActiveTemplateScope.current === exportTemplateScopeKey) return;
    const preferredTemplateId = activeExportTemplatePref?.templateId?.trim() || '';
    const preferred = preferredTemplateId
      ? (exportTemplates.find((template: Template) => template.id === preferredTemplateId) ?? null)
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
    activeExportTemplatePref,
    applyTemplate,
    exportTemplateScopeKey,
    exportTemplateScopeReady,
    exportTemplates,
    hasFetchedActiveExportTemplatePref,
    lastHydratedExportActiveTemplateScope,
    skipNextExportActiveTemplatePersist,
    templates,
  ]);

  const savePreferenceMutation = useSavePreferenceMutation();
  const refreshImportParameterCacheMutation = useRefreshImportParameterCacheMutation();
  const importParameterCacheQuery = useImportParameterCache(isBaseConnected);
  const importParameterCache = useMemo<ImportParameterCacheResponse | null>(
    () => (importParameterCacheQuery.data as ImportParameterCacheResponse) ?? null,
    [importParameterCacheQuery.data]
  );

  useEffect(() => {
    const normalized = importTemplateId.trim() || null;
    const persisted = lastImportTemplatePref?.templateId?.trim() || null;
    if (persisted === normalized) return;
    if (lastSavedImportTemplateId.current === normalized) return;
    lastSavedImportTemplateId.current = normalized;
    savePreferenceMutation.mutate({
      endpoint: '/api/v2/integrations/imports/base/last-template',
      data: normalized ? { templateId: normalized } : {},
    });
  }, [importTemplateId, lastImportTemplatePref?.templateId, lastSavedImportTemplateId, savePreferenceMutation]);

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
      endpoint: '/api/v2/integrations/imports/base/active-template',
      data: {
        templateId: normalized,
        connectionId: normalizedSelectedBaseConnectionId,
        inventoryId: normalizedImportInventoryId,
      },
    });
  }, [
    activeImportTemplatePref?.templateId,
    hasFetchedActiveImportTemplatePref,
    importTemplateScopeKey,
    importTemplateScopeReady,
    lastHydratedImportActiveTemplateScope,
    lastSavedImportActiveTemplateId,
    normalizedImportInventoryId,
    normalizedSelectedBaseConnectionId,
    savePreferenceMutation,
    skipNextImportActiveTemplatePersist,
    templates.importActiveTemplateId,
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
      endpoint: '/api/v2/integrations/exports/base/active-template',
      data: {
        templateId: normalized,
        connectionId: normalizedSelectedBaseConnectionId,
        inventoryId: normalizedExportInventoryId,
      },
    });
  }, [
    activeExportTemplatePref?.templateId,
    exportTemplateScopeKey,
    exportTemplateScopeReady,
    hasFetchedActiveExportTemplatePref,
    lastHydratedExportActiveTemplateScope,
    lastSavedExportActiveTemplateId,
    normalizedExportInventoryId,
    normalizedSelectedBaseConnectionId,
    savePreferenceMutation,
    skipNextExportActiveTemplatePersist,
    templates.exportActiveTemplateId,
  ]);

  const importSourceFields = useMemo<string[]>((): string[] => {
    const rawKeys =
      importParameterCache && Array.isArray(importParameterCache.keys)
        ? (importParameterCache.keys as unknown[])
        : [];
    const normalized = rawKeys
      .map((key: unknown): string => (typeof key === 'string' ? key.trim() : ''))
      .filter((key: string): boolean => key.length > 0);
    return Array.from(new Set(normalized)).sort((left: string, right: string) =>
      left.localeCompare(right)
    );
  }, [importParameterCache]);

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
  }, [importParameterCache]);

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
    if (cachedInventoryId === normalizedInventoryId && importSourceFields.length > 0) {
      lastHydratedImportSchemaKey.current = schemaCacheKey;
      return;
    }
    if (lastHydratedImportSchemaKey.current === schemaCacheKey) return;
    if (refreshImportParameterCacheMutation.isPending) return;
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
    importParameterCache?.inventoryId,
    importSourceFields.length,
    inventoryId,
    isBaseConnected,
    lastHydratedImportSchemaKey,
    refreshImportParameterCacheMutation,
    selectedBaseConnectionId,
  ]);

  const data = useImportExportDataSource({
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

  return {
    activeImportRun: data.activeImportRun,
    allWarehouses: data.allWarehouses,
    baseConnections,
    catalogsData,
    checkingIntegration,
    exportTemplates,
    importTemplates,
    importList: data.importList,
    importListStats: data.importListStats,
    importSourceFieldValues,
    importSourceFields,
    integrationsWithConnections,
    inventories: data.inventories,
    isBaseConnected,
    isFetchingInventories: data.isFetchingInventories,
    isFetchingWarehouses: data.isFetchingWarehouses,
    loadingCatalogs,
    loadingExportTemplates,
    loadingImportList: data.loadingImportList,
    loadingImportRun: data.loadingImportRun,
    loadingImportSourceFields:
      importParameterCacheQuery.isFetching || refreshImportParameterCacheMutation.isPending,
    loadingImportTemplates,
    refreshImportParameterCacheMutation,
    refetchImportList: data.refetchImportList,
    refetchInventories: data.refetchInventories,
    refetchWarehouses: data.refetchWarehouses,
    templates,
    warehouses: data.warehouses,
  };
}
