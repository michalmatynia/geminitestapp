import type {
  ImportExportTemplateMapping as TemplateMapping,
  ImportListItem,
  ImportListStats,
  DebugWarehouses,
  CatalogOption,
  InventoryOption,
  WarehouseOption,
  ImportExportTemplate as Template,
} from '@/shared/contracts/data-import-export';
import type {
  BaseImportStartResponse as ImportResponse,
  BaseImportRunDetailResponse as ImportRunDetail,
} from '@/shared/contracts/integrations/base-com';
import type {
  BaseImportMode,
  IntegrationConnectionBasic,
  IntegrationWithConnections,
  ImageRetryPreset,
  ImportTemplateParameterImport,
} from '@/shared/contracts/integrations';

import type { Dispatch, SetStateAction } from 'react';

export interface ImportExportContextType {
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
  handleImport: () => Promise<void>;
  handleResumeImport: () => Promise<void>;
  handleCancelImport: () => Promise<void>;
  handleDownloadImportReport: () => void;
  handleSaveDefaultBaseConnection: () => Promise<void>;
  handleSaveExportSettings: () => Promise<void>;
  handleClearInventory: () => Promise<void>;
  handleNewTemplate: () => void;
  handleDuplicateTemplate: () => Promise<void>;
  handleCreateExportFromImportTemplate: () => Promise<void>;
  handleSaveTemplate: () => Promise<void>;
  handleDeleteTemplate: () => Promise<void>;
  applyTemplate: (template: Template, scope: 'import' | 'export') => void;

  importing: boolean;
  savingDefaultConnection: boolean;
  savingExportSettings: boolean;
  savingImportTemplate: boolean;
  savingExportTemplate: boolean;
}
