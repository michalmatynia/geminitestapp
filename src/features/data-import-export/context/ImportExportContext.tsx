'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  useTemplates,
  useImportPreference,
  useSavePreferenceMutation,
  useTemplateMutation,
  useInventories,
  useWarehouses,
  useImportList,
  useImportMutation,
  useImportRun,
  useResumeImportRunMutation,
  useCancelImportRunMutation,
  useSaveExportSettingsMutation,
  useClearInventoryMutation,
  useImportParameterCache,
  useRefreshImportParameterCacheMutation,
} from '@/features/data-import-export/hooks/useImportQueries';
import type {
  CatalogRecord,
  ImportParameterCacheResponse,
} from '@/features/data-import-export/hooks/useImportQueries';
import type {
  ImportResponse,
  InventoryOption,
  Template,
  TemplateMapping,
  WarehouseOption,
  ImageRetryPreset,
  ImportListItem,
  ImportRunDetail,
  DebugWarehouses,
} from '@/features/data-import-export/types/imports';
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from '@/features/data-import-export/utils/image-retry-presets';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/features/integrations';
import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import {
  defaultBaseImportParameterImportSettings,
  normalizeBaseImportParameterImportSettings,
  type BaseImportParameterImportSettings,
} from '@/features/integrations/types/base-import-parameter-import';
import type { BaseImportMode } from '@/features/integrations/types/base-import-runs';
import { useCatalogs } from '@/features/products/hooks/useProductSettingsQueries';
import { useToast } from '@/shared/ui';

import { createImportExportRuntimeActions } from './import-export-runtime-actions';

import type { ImportExportContextType } from './ImportExportContext.types';

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
  const [importActiveTemplateId, setImportActiveTemplateId] = useState('');
  const [exportActiveTemplateId, setExportActiveTemplateId] = useState('');
  const [importTemplateName, setImportTemplateName] = useState('');
  const [exportTemplateName, setExportTemplateName] = useState('');
  const [importTemplateDescription, setImportTemplateDescription] = useState('');
  const [exportTemplateDescription, setExportTemplateDescription] = useState('');
  const [importTemplateMappings, setImportTemplateMappings] = useState<TemplateMapping[]>([{ sourceKey: '', targetField: '' }]);
  const [importTemplateParameterImport, setImportTemplateParameterImport] =
    useState<BaseImportParameterImportSettings>(
      defaultBaseImportParameterImportSettings
    );
  const [exportTemplateMappings, setExportTemplateMappings] = useState<TemplateMapping[]>([{ sourceKey: '', targetField: '' }]);
  const [exportImagesAsBase64, setExportImagesAsBase64] = useState(false);
  const [exportStockFallbackEnabled, setExportStockFallbackEnabled] = useState(false);
  const [imageRetryPresets, setImageRetryPresets] = useState<ImageRetryPreset[]>(getDefaultImageRetryPresets());
  
  const [isBaseConnected, setIsBaseConnected] = useState(false);
  const [baseConnections, setBaseConnections] = useState<IntegrationConnectionBasic[]>([]);
  const [selectedBaseConnectionId, setSelectedBaseConnectionId] = useState('');
  const [debugWarehouses, setDebugWarehouses] = useState<DebugWarehouses>(null);

  const lastSavedImportTemplateId = useRef<string | null>(null);
  const lastSavedImportActiveTemplateId = useRef<string | null>(null);
  const lastSavedExportActiveTemplateId = useRef<string | null>(null);
  const hasInitializedCatalog = useRef(false);
  const hasInitializedPrefs = useRef(false);
  const hasInitializedInventories = useRef(false);
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
  const catalogsData = useMemo(() => catalogsQuery.data || [], [catalogsQuery.data]);
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
      const defaultCatalog = (catalogsData as CatalogRecord[]).find((catalog: CatalogRecord) => catalog.isDefault);
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

  const applyTemplate = useCallback((template: Template, scope: 'import' | 'export'): void => {
    const nextMappings = template.mappings?.length ? template.mappings : [{ sourceKey: '', targetField: '' }];
    if (scope === 'import') {
      setImportActiveTemplateId(template.id);
      setImportTemplateName(template.name);
      setImportTemplateDescription(template.description ?? '');
      setImportTemplateMappings(nextMappings);
      setImportTemplateParameterImport(
        normalizeBaseImportParameterImportSettings(template.parameterImport)
      );
    } else {
      setExportActiveTemplateId(template.id);
      setExportTemplateName(template.name);
      setExportTemplateDescription(template.description ?? '');
      setExportTemplateMappings(nextMappings);
      setExportImagesAsBase64(template.exportImagesAsBase64 ?? false);
    }
  }, []);

  // Apply preferences on mount
  useEffect(() => {
    if (!hasInitializedPrefs.current) {
      const timer = setTimeout(() => {
        if (lastImportTemplatePref?.templateId) {
          setImportTemplateId(lastImportTemplatePref.templateId);
        }
        if (defaultExportInventoryPref?.inventoryId) {
          setExportInventoryId(defaultExportInventoryPref.inventoryId);
        }
        if (defaultConnectionPref?.connectionId && baseConnections.some((c: IntegrationConnectionBasic) => c.id === defaultConnectionPref.connectionId)) {
          setSelectedBaseConnectionId(defaultConnectionPref.connectionId);
        }
        if (exportStockFallbackPref?.enabled !== undefined) {
          setExportStockFallbackEnabled(exportStockFallbackPref.enabled);
        }
        if (imageRetryPresetsPref?.presets) {
          setImageRetryPresets(normalizeImageRetryPresets(imageRetryPresetsPref.presets));
        }
        if (sampleProductPref?.inventoryId) {
          setInventoryId(sampleProductPref.inventoryId);
        }
        hasInitializedPrefs.current = true;
      }, 0);
      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [lastImportTemplatePref, defaultExportInventoryPref, defaultConnectionPref, exportStockFallbackPref, imageRetryPresetsPref, sampleProductPref, baseConnections]);

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
      setImportActiveTemplateId('');
      setImportTemplateName('');
      setImportTemplateDescription('');
      setImportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      setImportTemplateParameterImport(
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
      setExportActiveTemplateId('');
      setExportTemplateName('');
      setExportTemplateDescription('');
      setExportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      setExportImagesAsBase64(false);
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

  // Mutations
  const savePreferenceMutation = useSavePreferenceMutation();
  const importMutation = useImportMutation();
  const resumeImportRunMutation = useResumeImportRunMutation(activeImportRunId);
  const cancelImportRunMutation = useCancelImportRunMutation(activeImportRunId);
  const saveExportSettingsMutation = useSaveExportSettingsMutation();
  const clearInventoryMutation = useClearInventoryMutation();
  const refreshImportParameterCacheMutation =
    useRefreshImportParameterCacheMutation();
  const saveImportTemplateMutation = useTemplateMutation('import', importActiveTemplateId);
  const saveExportTemplateMutation = useTemplateMutation('export', exportActiveTemplateId);
  const createImportTemplateMutation = useTemplateMutation('import');
  const createExportTemplateMutation = useTemplateMutation('export');

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
    const normalized = importActiveTemplateId.trim() || null;
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
    importActiveTemplateId,
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
    const normalized = exportActiveTemplateId.trim() || null;
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
    exportActiveTemplateId,
    activeExportTemplatePref?.templateId,
    normalizedSelectedBaseConnectionId,
    normalizedExportInventoryId,
    savePreferenceMutation,
  ]);

  // Data loading hooks
  const inventoriesQuery = useInventories(
    selectedBaseConnectionId,
    inventoriesEnabled && isBaseConnected && !!selectedBaseConnectionId
  );
  const inventories = useMemo<InventoryOption[]>(() => {
    const toText = (value: unknown): string => {
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      return '';
    };
    const rawInventories = Array.isArray(inventoriesQuery.data) ? inventoriesQuery.data : [];
    return rawInventories
      .map((inventory) => ({
        id: toText(
          (inventory as { inventory_id?: unknown; id?: unknown })?.inventory_id ??
            (inventory as { inventory_id?: unknown; id?: unknown })?.id
        ),
        name: toText((inventory as { name?: unknown })?.name),
      }))
      .filter((inventory: InventoryOption) => inventory.id.length > 0)
      .map((inventory: InventoryOption) => ({
        ...inventory,
        name: inventory.name || inventory.id,
      }));
  }, [inventoriesQuery.data]);
  const isFetchingInventories = inventoriesQuery.isFetching;
  const refetchInventories = inventoriesQuery.refetch;

  useEffect(() => {
    if (inventories.length > 0 && !hasInitializedInventories.current) {
      const firstInventory = inventories[0];
      if (firstInventory?.id) {
        const firstInventoryId = firstInventory.id;
        const timer = setTimeout(() => {
          if (!inventoryId) {
            setInventoryId(firstInventoryId);
          }
          if (!exportInventoryId) {
            setExportInventoryId(firstInventoryId);
          }
          hasInitializedInventories.current = true;
        }, 0);
        return (): void => clearTimeout(timer);
      }
    }
    return undefined;
  }, [inventories, inventoryId, exportInventoryId]);

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

  const warehousesQuery = useWarehouses(
    exportInventoryId,
    selectedBaseConnectionId,
    includeAllWarehouses,
    warehousesEnabled &&
      isBaseConnected &&
      !!selectedBaseConnectionId &&
      !!exportInventoryId
  );
  const warehousesData = warehousesQuery.data;
  const isFetchingWarehouses = warehousesQuery.isFetching;
  const refetchWarehouses = warehousesQuery.refetch;
  
  const warehouses: WarehouseOption[] = (warehousesData as { warehouses?: WarehouseOption[] })?.warehouses ?? [];
  const allWarehouses: WarehouseOption[] = (warehousesData as { allWarehouses?: WarehouseOption[] })?.allWarehouses ?? [];

  const importListQuery = useImportList(
    inventoryId,
    {
      connectionId: selectedBaseConnectionId,
      catalogId,
      limit,
      uniqueOnly,
      page: importListPage,
      pageSize: importListPageSize,
      searchName: importNameSearch,
      searchSku: importSkuSearch,
    },
    importListEnabled && isBaseConnected && !!inventoryId
  );
  const importListData = importListQuery.data;
  const loadingImportList = importListQuery.isFetching;
  const refetchImportList = importListQuery.refetch;
  
  const importList: ImportListItem[] = useMemo(() => (importListData as { products?: ImportListItem[] })?.products ?? [], [importListData]);
  const importListStats = useMemo(() => {
    if (!importListData) return null;
    const data = importListData as {
      total?: number;
      filtered?: number;
      available?: number;
      existing?: number;
      skuDuplicates?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
    };
    return {
      total: data.total ?? 0,
      filtered: data.filtered ?? 0,
      available: data.available ?? data.filtered ?? 0,
      existing: data.existing ?? 0,
      skuDuplicates: data.skuDuplicates ?? 0,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? importListPageSize,
      totalPages: data.totalPages ?? 1,
    };
  }, [importListData, importListPageSize]);

  const activeImportRunQuery = useImportRun(
    activeImportRunId,
    {
      enabled: Boolean(activeImportRunId),
      refetchInterval: pollImportRun ? 2000 : false,
      page: 1,
      pageSize: pollImportRun ? 250 : 1000,
      includeItems: true,
    }
  );
  const activeImportRun = useMemo<ImportRunDetail | null>(() => {
    return (activeImportRunQuery.data) ?? null;
  }, [activeImportRunQuery.data]);
  const loadingImportRun = activeImportRunQuery.isFetching && !!activeImportRunId;

  useEffect(() => {
    const status = activeImportRun?.run.status;
    if (!status) return;
    const isTerminal =
      status === 'completed' || status === 'partial_success' || status === 'failed' || status === 'canceled';
    if (isTerminal) {
      setPollImportRun(false);
    }
  }, [activeImportRun?.run.status]);

  useEffect(() => {
    if (!importListEnabled) return;
    const visibleIds = importList
      .map((item: ImportListItem) => item.baseProductId)
      .filter((id: string): id is string => Boolean(id));
    const visibleSet = new Set(visibleIds);
    setSelectedImportIds((previous: Set<string>) => {
      if (previous.size === 0) return previous;
      const retained = Array.from(previous).filter((id: string) => visibleSet.has(id));
      if (retained.length === previous.size) return previous;
      return new Set(retained);
    });
  }, [importList, importListEnabled]);

  const {
    handleLoadInventories,
    handleLoadWarehouses,
    handleLoadImportList,
    handleImport,
    handleResumeImport,
    handleCancelImport,
    handleDownloadImportReport,
    handleSaveExportSettings,
    handleClearInventory,
  } = createImportExportRuntimeActions({
    toast,
    setInventoriesEnabled,
    refetchInventories: refetchInventories as any,
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
    resumeImportRunMutation: resumeImportRunMutation as any,
    cancelImportRunMutation,
    saveExportSettingsMutation,
    exportActiveTemplateId,
    exportInventoryId,
    exportWarehouseId,
    exportStockFallbackEnabled,
    imageRetryPresets,
    setInventoryId,
    clearInventoryMutation,
  });

  const handleNewTemplate = (): void => {
    if (templateScope === 'import') {
      setImportActiveTemplateId('');
      setImportTemplateName('');
      setImportTemplateDescription('');
      setImportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      setImportTemplateParameterImport(
        defaultBaseImportParameterImportSettings
      );
    } else {
      setExportActiveTemplateId('');
      setExportTemplateName('');
      setExportTemplateDescription('');
      setExportTemplateMappings([{ sourceKey: '', targetField: '' }]);
      setExportImagesAsBase64(false);
    }
  };

  const handleDuplicateTemplate = async (): Promise<void> => {
    const isImport = templateScope === 'import';
    const activeId = isImport ? importActiveTemplateId : exportActiveTemplateId;
    if (!activeId) {
      toast('Select a template to duplicate.', { variant: 'error' });
      return;
    }

    const sourceTemplate = (isImport ? importTemplates : exportTemplates).find(
      (template: Template) => template.id === activeId,
    );
    if (!sourceTemplate) {
      toast('Selected template is missing.', { variant: 'error' });
      return;
    }

    const cleanMappings = (sourceTemplate.mappings ?? [])
      .map((mapping: TemplateMapping) => ({
        sourceKey: mapping.sourceKey?.trim() ?? '',
        targetField: mapping.targetField?.trim() ?? '',
      }))
      .filter((mapping: TemplateMapping) => mapping.sourceKey && mapping.targetField);

    const mutation = isImport ? createImportTemplateMutation : createExportTemplateMutation;
    const duplicatedName = `${(sourceTemplate.name || 'Template').trim()} Copy`;

    try {
      const duplicated = (await mutation.mutateAsync({
        data: {
          name: duplicatedName,
          description: sourceTemplate.description?.trim() || undefined,
          mappings: cleanMappings,
          ...(isImport
            ? {
              parameterImport: normalizeBaseImportParameterImportSettings(
                sourceTemplate.parameterImport
              ),
            }
            : {
              exportImagesAsBase64:
                  sourceTemplate.exportImagesAsBase64 ?? false,
            }),
        },
      })) as Template;
      applyTemplate(duplicated, isImport ? 'import' : 'export');
      toast('Template duplicated.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Template duplicate failed';
      toast(message, { variant: 'error' });
    }
  };

  const handleSaveTemplate = async (): Promise<void> => {
    const isImport = templateScope === 'import';
    const name = isImport ? importTemplateName : exportTemplateName;
    const desc = isImport ? importTemplateDescription : exportTemplateDescription;
    const mappings = isImport ? importTemplateMappings : exportTemplateMappings;
    const activeTemplateId = (
      isImport ? importActiveTemplateId : exportActiveTemplateId
    ).trim();
    
    if (!name.trim()) {
      toast('Template name is required.', { variant: 'error' });
      return;
    }

    const cleanedMappings = mappings
      .map((m: TemplateMapping) => ({ sourceKey: m.sourceKey.trim(), targetField: m.targetField.trim() }))
      .filter((m: TemplateMapping) => m.sourceKey && m.targetField);

    const mutation = isImport
      ? (activeTemplateId ? saveImportTemplateMutation : createImportTemplateMutation)
      : (activeTemplateId ? saveExportTemplateMutation : createExportTemplateMutation);

    try {
      const res = (await mutation.mutateAsync({
        data: {
          name: name.trim(),
          description: desc.trim() || undefined,
          mappings: cleanedMappings,
          ...(isImport
            ? {
              parameterImport: normalizeBaseImportParameterImportSettings(
                importTemplateParameterImport
              ),
            }
            : { exportImagesAsBase64 }),
        }
      })) as Template;
      applyTemplate(res, isImport ? 'import' : 'export');
      toast('Template saved.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Template save failed';
      toast(message, { variant: 'error' });
    }
  };

  const handleDeleteTemplate = async (): Promise<void> => {
    const isImport = templateScope === 'import';
    const activeId = isImport ? importActiveTemplateId : exportActiveTemplateId;
    if (!activeId) return;
    
    const mutation = isImport ? saveImportTemplateMutation : saveExportTemplateMutation;
    try {
      await mutation.mutateAsync({ isDelete: true });
      handleNewTemplate();
      toast('Template deleted.', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Template delete failed';
      toast(message, { variant: 'error' });
    }
  };

  const activeRunBusy =
    activeImportRun?.run.status === 'queued' ||
    activeImportRun?.run.status === 'running';

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
    importActiveTemplateId,
    setImportActiveTemplateId,
    exportActiveTemplateId,
    setExportActiveTemplateId,
    importTemplateName,
    setImportTemplateName,
    exportTemplateName,
    setExportTemplateName,
    importTemplateDescription,
    setImportTemplateDescription,
    exportTemplateDescription,
    setExportTemplateDescription,
    importTemplateMappings,
    setImportTemplateMappings,
    importTemplateParameterImport,
    setImportTemplateParameterImport,
    exportTemplateMappings,
    setExportTemplateMappings,
    exportImagesAsBase64,
    setExportImagesAsBase64,
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

    handleLoadInventories,
    handleLoadWarehouses,
    handleLoadImportList,
    handleImport,
    handleResumeImport,
    handleCancelImport,
    handleDownloadImportReport,
    handleSaveExportSettings,
    handleClearInventory,
    handleNewTemplate,
    handleDuplicateTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    applyTemplate,

    importing:
      importMutation.isPending ||
      resumeImportRunMutation.isPending ||
      cancelImportRunMutation.isPending ||
      activeRunBusy,
    savingExportSettings: saveExportSettingsMutation.isPending,
    savingImportTemplate: saveImportTemplateMutation.isPending || createImportTemplateMutation.isPending,
    savingExportTemplate: saveExportTemplateMutation.isPending || createExportTemplateMutation.isPending,
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
