import type { TemplateMapping, ImportListItem, ImportListStats, DebugWarehouses, CatalogOption, InventoryOption, WarehouseOption, Template, ImportResponse, ImportRunDetail } from '@/shared/contracts/integrations/import-export';
import type { BaseImportDirectTarget, BaseImportDirectTargetType, BaseImportMode } from '@/shared/contracts/integrations/base-com';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import type { ImportTemplateParameterImport } from '@/shared/contracts/integrations';

import type { Dispatch, SetStateAction } from 'react';

export type ImportsPageTab = 'import-list' | 'import-settings' | 'import-template';

export interface ImportExportContextType {
  saveImportSettings: boolean;
  hasUnsavedImportSettingsChanges: boolean;
  importsPageTab: ImportsPageTab;
  setImportsPageTab: (tab: ImportsPageTab) => void;
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
  importMode: BaseImportMode;
  setImportMode: (mode: BaseImportMode) => void;
  importDryRun: boolean;
  setImportDryRun: (enabled: boolean) => void;
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
  setImportTemplateMappings: Dispatch<SetStateAction<TemplateMapping[]>>;
  importTemplateParameterImport: ImportTemplateParameterImport;
  setImportTemplateParameterImport: Dispatch<SetStateAction<ImportTemplateParameterImport>>;
  exportTemplateMappings: TemplateMapping[];
  setExportTemplateMappings: Dispatch<SetStateAction<TemplateMapping[]>>;
  exportImagesAsBase64: boolean;
  setExportImagesAsBase64: (val: boolean) => void;
  exportStockFallbackEnabled: boolean;
  setExportStockFallbackEnabled: (val: boolean) => void;
  imageRetryPresets: ImageRetryPreset[];
  setImageRetryPresets: Dispatch<SetStateAction<ImageRetryPreset[]>>;
  selectedBaseConnectionId: string;
  setSelectedBaseConnectionId: (id: string) => void;
  isBaseConnected: boolean;
  baseConnections: IntegrationConnectionBasic[];
  importNameSearch: string;
  setImportNameSearch: (val: string) => void;
  importSkuSearch: string;
  setImportSkuSearch: (val: string) => void;
  importDirectTargetType: BaseImportDirectTargetType;
  setImportDirectTargetType: (type: BaseImportDirectTargetType) => void;
  importDirectTargetValue: string;
  setImportDirectTargetValue: (value: string) => void;
  importListPage: number;
  setImportListPage: (page: number) => void;
  importListPageSize: number;
  setImportListPageSize: (size: number) => void;
  importListEnabled: boolean;
  setImportListEnabled: (enabled: boolean) => void;
  selectedImportIds: Set<string>;
  setSelectedImportIds: Dispatch<SetStateAction<Set<string>>>;
  lastResult: ImportResponse | null;
  setLastResult: (res: ImportResponse | null) => void;
  activeImportRunId: string;
  setActiveImportRunId: (id: string) => void;
  activeImportRun: ImportRunDetail | null;
  loadingImportRun: boolean;
  importSourceFields: string[];
  importSourceFieldValues: Record<string, string>;
  loadingImportSourceFields: boolean;
  templateScope: 'import' | 'export';
  setTemplateScope: (scope: 'import' | 'export') => void;
  showAllWarehouses: boolean;
  setShowAllWarehouses: (show: boolean) => void;
  includeAllWarehouses: boolean;
  setIncludeAllWarehouses: (include: boolean) => void;
  debugWarehouses: DebugWarehouses;
  setDebugWarehouses: (debug: DebugWarehouses) => void;

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

  handleLoadInventories: () => Promise<void>;
  handleLoadWarehouses: () => Promise<void>;
  handleLoadImportList: () => Promise<void>;
  handleImport: (options?: { directTarget?: BaseImportDirectTarget | null }) => Promise<void>;
  handleResumeImport: () => Promise<void>;
  handleCancelImport: () => Promise<void>;
  handleDownloadImportReport: () => void;
  handleSaveImportSettings: () => Promise<void>;
  handleClearSavedImportSettings: () => Promise<void>;
  handleSaveDefaultBaseConnection: () => Promise<void>;
  handleSaveExportSettings: () => Promise<void>;
  handleClearInventory: () => Promise<void>;
  handleNewTemplate: (scope?: 'import' | 'export') => void;
  handleDuplicateTemplate: (scope?: 'import' | 'export') => Promise<void>;
  handleCreateExportFromImportTemplate: () => Promise<void>;
  handleSaveTemplate: (scope?: 'import' | 'export') => Promise<void>;
  handleDeleteTemplate: (scope?: 'import' | 'export') => Promise<void>;
  applyTemplate: (template: Template, scope: 'import' | 'export') => void;

  importing: boolean;
  savingDefaultConnection: boolean;
  savingExportSettings: boolean;
  savingImportTemplate: boolean;
  savingExportTemplate: boolean;
}

export type ImportExportStateContextType = Pick<
  ImportExportContextType,
  | 'saveImportSettings'
  | 'hasUnsavedImportSettingsChanges'
  | 'importsPageTab'
  | 'setImportsPageTab'
  | 'inventoryId'
  | 'setInventoryId'
  | 'exportInventoryId'
  | 'setExportInventoryId'
  | 'exportWarehouseId'
  | 'setExportWarehouseId'
  | 'catalogId'
  | 'setCatalogId'
  | 'limit'
  | 'setLimit'
  | 'imageMode'
  | 'setImageMode'
  | 'importMode'
  | 'setImportMode'
  | 'importDryRun'
  | 'setImportDryRun'
  | 'allowDuplicateSku'
  | 'setAllowDuplicateSku'
  | 'uniqueOnly'
  | 'setUniqueOnly'
  | 'importTemplateId'
  | 'setImportTemplateId'
  | 'importActiveTemplateId'
  | 'setImportActiveTemplateId'
  | 'exportActiveTemplateId'
  | 'setExportActiveTemplateId'
  | 'importTemplateName'
  | 'setImportTemplateName'
  | 'exportTemplateName'
  | 'setExportTemplateName'
  | 'importTemplateDescription'
  | 'setImportTemplateDescription'
  | 'exportTemplateDescription'
  | 'setExportTemplateDescription'
  | 'importTemplateMappings'
  | 'setImportTemplateMappings'
  | 'importTemplateParameterImport'
  | 'setImportTemplateParameterImport'
  | 'exportTemplateMappings'
  | 'setExportTemplateMappings'
  | 'exportImagesAsBase64'
  | 'setExportImagesAsBase64'
  | 'exportStockFallbackEnabled'
  | 'setExportStockFallbackEnabled'
  | 'imageRetryPresets'
  | 'setImageRetryPresets'
  | 'selectedBaseConnectionId'
  | 'setSelectedBaseConnectionId'
  | 'importNameSearch'
  | 'setImportNameSearch'
  | 'importSkuSearch'
  | 'setImportSkuSearch'
  | 'importDirectTargetType'
  | 'setImportDirectTargetType'
  | 'importDirectTargetValue'
  | 'setImportDirectTargetValue'
  | 'importListPage'
  | 'setImportListPage'
  | 'importListPageSize'
  | 'setImportListPageSize'
  | 'importListEnabled'
  | 'setImportListEnabled'
  | 'selectedImportIds'
  | 'setSelectedImportIds'
  | 'activeImportRunId'
  | 'setActiveImportRunId'
  | 'templateScope'
  | 'setTemplateScope'
  | 'showAllWarehouses'
  | 'setShowAllWarehouses'
  | 'includeAllWarehouses'
  | 'setIncludeAllWarehouses'
  | 'debugWarehouses'
  | 'setDebugWarehouses'
>;

export type ImportExportDataContextType = Pick<
  ImportExportContextType,
  | 'integrationsWithConnections'
  | 'checkingIntegration'
  | 'isBaseConnected'
  | 'baseConnections'
  | 'catalogsData'
  | 'loadingCatalogs'
  | 'importTemplates'
  | 'loadingImportTemplates'
  | 'exportTemplates'
  | 'loadingExportTemplates'
  | 'inventories'
  | 'isFetchingInventories'
  | 'warehouses'
  | 'allWarehouses'
  | 'isFetchingWarehouses'
  | 'importList'
  | 'loadingImportList'
  | 'importListStats'
  | 'lastResult'
  | 'activeImportRunId'
  | 'activeImportRun'
  | 'loadingImportRun'
  | 'importSourceFields'
  | 'importSourceFieldValues'
  | 'loadingImportSourceFields'
>;

export type ImportExportActionsContextType = Pick<
  ImportExportContextType,
  | 'handleLoadInventories'
  | 'handleLoadWarehouses'
  | 'handleLoadImportList'
  | 'handleImport'
  | 'handleResumeImport'
  | 'handleCancelImport'
  | 'handleDownloadImportReport'
  | 'handleSaveImportSettings'
  | 'handleClearSavedImportSettings'
  | 'handleSaveDefaultBaseConnection'
  | 'handleSaveExportSettings'
  | 'handleClearInventory'
  | 'handleNewTemplate'
  | 'handleDuplicateTemplate'
  | 'handleCreateExportFromImportTemplate'
  | 'handleSaveTemplate'
  | 'handleDeleteTemplate'
  | 'applyTemplate'
  | 'importing'
  | 'savingDefaultConnection'
  | 'savingExportSettings'
  | 'savingImportTemplate'
  | 'savingExportTemplate'
>;
