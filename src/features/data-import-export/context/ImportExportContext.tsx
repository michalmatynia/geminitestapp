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
  useSaveExportSettingsMutation,
  useClearInventoryMutation,
} from '@/features/data-import-export/hooks/useImportQueries';
import type { CatalogRecord } from '@/features/data-import-export/hooks/useImportQueries';
import type {
  ImportResponse,
  InventoryOption,
  Template,
  TemplateMapping,
  WarehouseOption,
  ImageRetryPreset,
  ImportListItem,
  ImportListStats,
  DebugWarehouses,
  CatalogOption,
} from '@/features/data-import-export/types/imports';
import {
  getDefaultImageRetryPresets,
  normalizeImageRetryPresets,
} from '@/features/data-import-export/utils/image-retry-presets';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/features/integrations';
import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import { useCatalogs } from '@/features/products/hooks/useProductSettingsQueries';
import { useToast } from '@/shared/ui';

interface ImportExportContextType {
  // State
  inventoryId: string;
  setInventoryId: (id: string) => void;
  exportInventoryId: string;
  setExportInventoryId: (id: string) => void;
  exportWarehouseId: string;
  setExportWarehouseId: (id: string) => void;
  catalogId: string;
  setCatalogId: (id: string) => void;
  limit: string;
  setLimit: (limit: string) => void;
  imageMode: 'links' | 'download';
  setImageMode: (mode: 'links' | 'download') => void;
  allowDuplicateSku: boolean;
  setAllowDuplicateSku: (allow: boolean) => void;
  uniqueOnly: boolean;
  setUniqueOnly: (unique: boolean) => void;
  importTemplateId: string;
  setImportTemplateId: (id: string) => void;
  importActiveTemplateId: string;
  setImportActiveTemplateId: (id: string) => void;
  exportActiveTemplateId: string;
  setExportActiveTemplateId: (id: string) => void;
  importTemplateName: string;
  setImportTemplateName: (name: string) => void;
  exportTemplateName: string;
  setExportTemplateName: (name: string) => void;
  importTemplateDescription: string;
  setImportTemplateDescription: (desc: string) => void;
  exportTemplateDescription: string;
  setExportTemplateDescription: (desc: string) => void;
  importTemplateMappings: TemplateMapping[];
  setImportTemplateMappings: React.Dispatch<React.SetStateAction<TemplateMapping[]>>;
  exportTemplateMappings: TemplateMapping[];
  setExportTemplateMappings: React.Dispatch<React.SetStateAction<TemplateMapping[]>>;
  exportImagesAsBase64: boolean;
  setExportImagesAsBase64: (val: boolean) => void;
  exportStockFallbackEnabled: boolean;
  setExportStockFallbackEnabled: (val: boolean) => void;
  imageRetryPresets: ImageRetryPreset[];
  setImageRetryPresets: React.Dispatch<React.SetStateAction<ImageRetryPreset[]>>;
  selectedBaseConnectionId: string;
  setSelectedBaseConnectionId: (id: string) => void;
  isBaseConnected: boolean;
  baseConnections: IntegrationConnectionBasic[];
  importNameSearch: string;
  setImportNameSearch: (val: string) => void;
  importSkuSearch: string;
  setImportSkuSearch: (val: string) => void;
  importListPage: number;
  setImportListPage: (page: number) => void;
  importListPageSize: number;
  setImportListPageSize: (size: number) => void;
  importListEnabled: boolean;
  setImportListEnabled: (enabled: boolean) => void;
  selectedImportIds: Set<string>;
  setSelectedImportIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  lastResult: ImportResponse | null;
  setLastResult: (res: ImportResponse | null) => void;
  templateScope: 'import' | 'export';
  setTemplateScope: (scope: 'import' | 'export') => void;
  showAllWarehouses: boolean;
  setShowAllWarehouses: (show: boolean) => void;
  includeAllWarehouses: boolean;
  setIncludeAllWarehouses: (include: boolean) => void;
  debugWarehouses: DebugWarehouses;
  setDebugWarehouses: (debug: DebugWarehouses) => void;

  // Queries/Data
  integrationsWithConnections: IntegrationWithConnections[];
  checkingIntegration: boolean;
  catalogsData: CatalogOption[];
  loadingCatalogs: boolean;
  importTemplates: Template[];
  loadingImportTemplates: boolean;
  exportTemplates: Template[];
  loadingExportTemplates: boolean;
  inventories: InventoryOption[];
  isFetchingInventories: boolean;
  warehouses: WarehouseOption[];
  allWarehouses: WarehouseOption[];
  isFetchingWarehouses: boolean;
  importList: ImportListItem[];
  loadingImportList: boolean;
  importListStats: ImportListStats | null;
  
  // Actions
  handleLoadInventories: () => Promise<void>;
  handleLoadWarehouses: () => Promise<void>;
  handleLoadImportList: () => Promise<void>;
  handleImport: () => Promise<void>;
  handleSaveExportSettings: () => Promise<void>;
  handleClearInventory: () => Promise<void>;
  handleNewTemplate: () => void;
  handleDuplicateTemplate: () => Promise<void>;
  handleSaveTemplate: () => Promise<void>;
  handleDeleteTemplate: () => Promise<void>;
  applyTemplate: (template: Template, scope: 'import' | 'export') => void;
  
  // Mutation states
  importing: boolean;
  savingExportSettings: boolean;
  savingImportTemplate: boolean;
  savingExportTemplate: boolean;
}

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
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [importNameSearch, setImportNameSearch] = useState('');
  const [importSkuSearch, setImportSkuSearch] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [allowDuplicateSku, setAllowDuplicateSku] = useState(false);
  const [templateScope, setTemplateScope] = useState<'import' | 'export'>('import');
  const [importListPage, setImportListPage] = useState(1);
  const [importListPageSize, setImportListPageSize] = useState(25);
  const [importListEnabled, setImportListEnabled] = useState(false);
  
  const [importTemplateId, setImportTemplateId] = useState('');
  const [importActiveTemplateId, setImportActiveTemplateId] = useState('');
  const [exportActiveTemplateId, setExportActiveTemplateId] = useState('');
  const [importTemplateName, setImportTemplateName] = useState('');
  const [exportTemplateName, setExportTemplateName] = useState('');
  const [importTemplateDescription, setImportTemplateDescription] = useState('');
  const [exportTemplateDescription, setExportTemplateDescription] = useState('');
  const [importTemplateMappings, setImportTemplateMappings] = useState<TemplateMapping[]>([{ sourceKey: '', targetField: '' }]);
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
  const hasInitializedImportListSelection = useRef(false);
  const hasHydratedImportActiveTemplatePref = useRef(false);
  const hasHydratedExportActiveTemplatePref = useRef(false);

  // Queries
  const { data: integrationsWithConnections = [], isLoading: checkingIntegration } = useIntegrationsWithConnections();
  const catalogsQuery = useCatalogs();
  const catalogsData = useMemo(() => catalogsQuery.data || [], [catalogsQuery.data]);
  const loadingCatalogs = catalogsQuery.isLoading;
  
  const { data: importTemplates = [], isLoading: loadingImportTemplates } = useTemplates('import');
  const { data: exportTemplates = [], isLoading: loadingExportTemplates } = useTemplates('export');

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
        if (connections.length > 0) {
          setIsBaseConnected(true);
          if (!selectedBaseConnectionId) {
            setSelectedBaseConnectionId(connections[0]?.id || '');
          }
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
    'active-template',
    '/api/integrations/imports/base/active-template'
  );
  const { data: activeExportTemplatePref, isFetched: hasFetchedActiveExportTemplatePref } = useImportPreference<{ templateId?: string | null }>(
    'export-active-template',
    '/api/integrations/exports/base/active-template'
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

  const applyTemplate = useCallback((template: Template, scope: 'import' | 'export'): void => {
    const nextMappings = template.mappings?.length ? template.mappings : [{ sourceKey: '', targetField: '' }];
    if (scope === 'import') {
      setImportActiveTemplateId(template.id);
      setImportTemplateName(template.name);
      setImportTemplateDescription(template.description ?? '');
      setImportTemplateMappings(nextMappings);
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
    if (hasHydratedImportActiveTemplatePref.current) return;
    if (!hasFetchedActiveImportTemplatePref || importTemplates.length === 0) return;
    if (activeImportTemplatePref?.templateId && !importActiveTemplateId) {
      const preferred = importTemplates.find((t: Template) => t.id === activeImportTemplatePref.templateId);
      if (preferred) {
        requestAnimationFrame(() => applyTemplate(preferred, 'import'));
      }
    }
    hasHydratedImportActiveTemplatePref.current = true;
  }, [
    activeImportTemplatePref,
    hasFetchedActiveImportTemplatePref,
    importTemplates,
    importActiveTemplateId,
    applyTemplate,
  ]);

  useEffect(() => {
    if (hasHydratedExportActiveTemplatePref.current) return;
    if (!hasFetchedActiveExportTemplatePref || exportTemplates.length === 0) return;
    if (activeExportTemplatePref?.templateId && !exportActiveTemplateId) {
      const preferred = exportTemplates.find((t: Template) => t.id === activeExportTemplatePref.templateId);
      if (preferred) {
        requestAnimationFrame(() => applyTemplate(preferred, 'export'));
      }
    }
    hasHydratedExportActiveTemplatePref.current = true;
  }, [
    activeExportTemplatePref,
    hasFetchedActiveExportTemplatePref,
    exportTemplates,
    exportActiveTemplateId,
    applyTemplate,
  ]);

  // Mutations
  const savePreferenceMutation = useSavePreferenceMutation();
  const importMutation = useImportMutation();
  const saveExportSettingsMutation = useSaveExportSettingsMutation();
  const clearInventoryMutation = useClearInventoryMutation();
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
    const normalized = importActiveTemplateId.trim() || null;
    const persisted = activeImportTemplatePref?.templateId?.trim() || null;
    if (persisted === normalized) return;
    if (lastSavedImportActiveTemplateId.current === normalized) return;
    lastSavedImportActiveTemplateId.current = normalized;
    savePreferenceMutation.mutate({
      endpoint: '/api/integrations/imports/base/active-template',
      data: { templateId: normalized },
    });
  }, [importActiveTemplateId, activeImportTemplatePref?.templateId, savePreferenceMutation]);

  useEffect(() => {
    const normalized = exportActiveTemplateId.trim() || null;
    const persisted = activeExportTemplatePref?.templateId?.trim() || null;
    if (persisted === normalized) return;
    if (lastSavedExportActiveTemplateId.current === normalized) return;
    lastSavedExportActiveTemplateId.current = normalized;
    savePreferenceMutation.mutate({
      endpoint: '/api/integrations/exports/base/active-template',
      data: { templateId: normalized },
    });
  }, [exportActiveTemplateId, activeExportTemplatePref?.templateId, savePreferenceMutation]);

  // Data loading hooks
  const inventoriesQuery = useInventories(selectedBaseConnectionId, isBaseConnected);
  const inventories = useMemo(() => inventoriesQuery.data || [], [inventoriesQuery.data]);
  const isFetchingInventories = inventoriesQuery.isFetching;
  const refetchInventories = inventoriesQuery.refetch;

  useEffect(() => {
    if (inventories.length > 0 && !hasInitializedInventories.current) {
      const firstInventory = inventories[0];
      if (firstInventory?.inventory_id) {
        const firstInventoryId = firstInventory.inventory_id;
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
  const warehousesQuery = useWarehouses(exportInventoryId, selectedBaseConnectionId, includeAllWarehouses, isBaseConnected && !!exportInventoryId);
  const warehousesData = warehousesQuery.data;
  const isFetchingWarehouses = warehousesQuery.isFetching;
  const refetchWarehouses = warehousesQuery.refetch;
  
  const warehouses: WarehouseOption[] = (warehousesData as { warehouses?: WarehouseOption[] })?.warehouses ?? [];
  const allWarehouses: WarehouseOption[] = (warehousesData as { allWarehouses?: WarehouseOption[] })?.allWarehouses ?? [];

  const importListQuery = useImportList(
    inventoryId,
    {
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

  useEffect(() => {
    if (importList.length > 0 && !hasInitializedImportListSelection.current) {
      const ids = importList.map((item: ImportListItem) => item.baseProductId).filter(Boolean);
      const timer = setTimeout(() => {
        setSelectedImportIds(new Set(ids));
        hasInitializedImportListSelection.current = true;
      }, 0);
      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [importList]);

  // Actions
  const handleLoadInventories = async (): Promise<void> => {
    await refetchInventories();
    toast('Inventories reloaded', { variant: 'success' });
  };

  const handleLoadWarehouses = async (): Promise<void> => {
    await refetchWarehouses();
    toast('Warehouses reloaded', { variant: 'success' });
  };

  const handleLoadImportList = async (): Promise<void> => {
    setImportListEnabled(true);
    setImportListPage(1);
    await refetchImportList();
    toast('Import list reloaded', { variant: 'success' });
  };

  const handleImport = async (): Promise<void> => {
    if (!inventoryId || !catalogId) {
      toast('Inventory and catalog are required', { variant: 'error' });
      return;
    }
    try {
      const selectedIds = Array.from(selectedImportIds);
      const importData: {
        inventoryId: string;
        catalogId: string;
        imageMode: 'download' | 'links';
        uniqueOnly: boolean;
        allowDuplicateSku: boolean;
        templateId?: string;
        limit?: number;
        selectedIds?: string[];
      } = {
        inventoryId,
        catalogId,
        imageMode,
        uniqueOnly,
        allowDuplicateSku,
      };
      if (importTemplateId) importData.templateId = importTemplateId;
      if (limit !== 'all') importData.limit = Number(limit);
      if (selectedIds.length > 0) importData.selectedIds = selectedIds;
      
      const res = await importMutation.mutateAsync(importData);
      setLastResult(res);
      const importedCount = res.imported ?? 0;
      toast(`Imported ${importedCount} products`, { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Import failed';
      toast(message, { variant: 'error' });
    }
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
      const message = error instanceof Error ? error.message : 'Save failed';
      toast(message, { variant: 'error' });
    }
  };

  const handleClearInventory = async (): Promise<void> => {
    setInventoryId('');
    try {
      await clearInventoryMutation.mutateAsync();
      toast('Inventory cleared.', { variant: 'success' });
    } catch {
      toast('Failed to clear inventory.', { variant: 'error' });
    }
  };

  const handleNewTemplate = (): void => {
    if (templateScope === 'import') {
      setImportActiveTemplateId('');
      setImportTemplateName('');
      setImportTemplateDescription('');
      setImportTemplateMappings([{ sourceKey: '', targetField: '' }]);
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
          ...(isImport ? {} : { exportImagesAsBase64: sourceTemplate.exportImagesAsBase64 ?? false }),
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
          ...(isImport ? {} : { exportImagesAsBase64 }),
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
    handleSaveExportSettings,
    handleClearInventory,
    handleNewTemplate,
    handleDuplicateTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    applyTemplate,

    importing: importMutation.isPending,
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
