import type {
  BaseImportRunDetailResponse,
  BaseImportStartResponse,
} from '@/features/integrations/types/base-import-runs';
import type {
  ImageBase64Mode, 
  ImageTransformOptions, 
  ImageRetryPreset,
  BaseInventory,
  ImportExportTemplate as DomainImportExportTemplate,
  ImportExportTemplateMapping as DomainImportExportTemplateMapping,
  ImportTemplateParameterImport as DomainImportTemplateParameterImport,
} from '@/shared/types/domain/integrations';

export type {
  ImageBase64Mode,
  ImageTransformOptions,
  ImageRetryPreset,
  BaseInventory,
};

export type InventoryOption = {
  id: string;
  name: string;
};

export type WarehouseOption = {
  id: string;
  name: string;
};

export type CatalogOption = {
  id: string;
  name: string;
  isDefault: boolean;
};

export type ImportListItem = {
  baseProductId: string;
  name: string;
  sku: string;
  exists: boolean;
  skuExists: boolean;
  image?: string | null;
  price?: number;
  stock?: number;
  description?: string;
};

export type ImportResponse = BaseImportStartResponse;

export type ImportRunDetail = BaseImportRunDetailResponse;

export type TemplateMapping = DomainImportExportTemplateMapping;

export type Template = DomainImportExportTemplate;

export type ImportTemplateParameterImport = DomainImportTemplateParameterImport;

export type ExportParameterDoc = {
  key: string;
  description: string;
};

export type ImportListStats = {
  total: number;
  filtered: number;
  available?: number;
  existing: number;
  skuDuplicates?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

export type WarehouseDebugRaw = {
  method: string;
  statusCode: number;
  ok: boolean;
  error: string | null;
  payload: unknown;
};

export type InventoryDebugRaw = {
  method: string;
  statusCode: number;
  ok: boolean;
  error: string | null;
  payload: unknown;
};

export type DebugWarehouses = {
  inventory?: WarehouseOption[];
  all?: WarehouseOption[];
  inventories?: InventoryOption[];
  inventoryRaw?: WarehouseDebugRaw | null;
  inventoriesRaw?: InventoryDebugRaw | null;
  allRaw?: WarehouseDebugRaw | null;
} | null;
