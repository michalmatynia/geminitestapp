'use client';

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';

import type {
  ImageRetryPreset,
  IntegrationConnectionBasic,
} from '@/shared/contracts/integrations';
import type { Toast } from '@/shared/contracts/ui';

import { useImportExportData as useImportExportDataSource } from './import-export/useImportExportData';
import { useImportExportBootstrapResources } from './useImportExportBootstrapResources';
import { useImportExportTemplateResources } from './useImportExportTemplateResources';

interface ImportExportRuntimeResourcesParams {
  activeImportRunId: string;
  catalogId: string;
  exportInventoryId: string;
  hasInitializedCatalog: MutableRefObject<boolean>;
  importListEnabled: boolean;
  importListPage: number;
  importListPageSize: number;
  importNameSearch: string;
  importSkuSearch: string;
  importTemplateId: string;
  inventoriesEnabled: boolean;
  inventoryId: string;
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
  catalogsData: ReturnType<typeof useImportExportBootstrapResources>['catalogsData'];
  checkingIntegration: boolean;
  exportTemplates: ReturnType<typeof useImportExportTemplateResources>['exportTemplates'];
  importList: ReturnType<typeof useImportExportDataSource>['importList'];
  importListStats: ReturnType<typeof useImportExportDataSource>['importListStats'];
  importSourceFieldValues: ReturnType<
    typeof useImportExportTemplateResources
  >['importSourceFieldValues'];
  importSourceFields: ReturnType<typeof useImportExportTemplateResources>['importSourceFields'];
  importTemplates: ReturnType<typeof useImportExportTemplateResources>['importTemplates'];
  integrationsWithConnections: ReturnType<
    typeof useImportExportBootstrapResources
  >['integrationsWithConnections'];
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
  refreshImportParameterCacheMutation: ReturnType<
    typeof useImportExportTemplateResources
  >['refreshImportParameterCacheMutation'];
  refetchImportList: ReturnType<typeof useImportExportDataSource>['refetchImportList'];
  refetchInventories: ReturnType<typeof useImportExportDataSource>['refetchInventories'];
  refetchWarehouses: ReturnType<typeof useImportExportDataSource>['refetchWarehouses'];
  templates: ReturnType<typeof useImportExportTemplateResources>['templates'];
  warehouses: ReturnType<typeof useImportExportDataSource>['warehouses'];
}

export function useImportExportRuntimeResources({
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
}: ImportExportRuntimeResourcesParams): ImportExportRuntimeResourcesResult {
  const {
    baseConnections,
    catalogsData,
    checkingIntegration,
    integrationsWithConnections,
    isBaseConnected,
    loadingCatalogs,
  } = useImportExportBootstrapResources({
    catalogId,
    hasInitializedCatalog,
    selectedBaseConnectionId,
    setBaseConnections,
    setCatalogId,
    setIsBaseConnected,
    setSelectedBaseConnectionId,
  });

  const {
    exportTemplates,
    importSourceFieldValues,
    importSourceFields,
    importTemplates,
    loadingExportTemplates,
    loadingImportSourceFields,
    loadingImportTemplates,
    refreshImportParameterCacheMutation,
    templates,
  } = useImportExportTemplateResources({
    baseConnections,
    exportInventoryId,
    importTemplateId,
    inventoryId,
    isBaseConnected,
    lastHydratedExportActiveTemplateScope,
    lastHydratedImportActiveTemplateScope,
    lastHydratedImportSchemaKey,
    lastSavedExportActiveTemplateId,
    lastSavedImportActiveTemplateId,
    lastSavedImportTemplateId,
    selectedBaseConnectionId,
    setExportInventoryId,
    setExportStockFallbackEnabled,
    setImageRetryPresets,
    setImportTemplateId,
    setInventoryId,
    setSelectedBaseConnectionId,
    setTemplateScope,
    skipNextExportActiveTemplatePersist,
    skipNextImportActiveTemplatePersist,
    toast,
  });

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
    importList: data.importList,
    importListStats: data.importListStats,
    importSourceFieldValues,
    importSourceFields,
    importTemplates,
    integrationsWithConnections,
    inventories: data.inventories,
    isBaseConnected,
    isFetchingInventories: data.isFetchingInventories,
    isFetchingWarehouses: data.isFetchingWarehouses,
    loadingCatalogs,
    loadingExportTemplates,
    loadingImportList: data.loadingImportList,
    loadingImportRun: data.loadingImportRun,
    loadingImportSourceFields,
    loadingImportTemplates,
    refreshImportParameterCacheMutation,
    refetchImportList: data.refetchImportList,
    refetchInventories: data.refetchInventories,
    refetchWarehouses: data.refetchWarehouses,
    templates,
    warehouses: data.warehouses,
  };
}
