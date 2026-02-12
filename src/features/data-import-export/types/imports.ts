import type { 
  ImageBase64Mode, 
  ImageTransformOptions, 
  ImageRetryPreset,
  BaseInventory,
  Template as DomainTemplate,
  TemplateMapping as DomainTemplateMapping
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

export type ImportResponse = {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ productId?: string; sku?: string; error: string }>;
};

export type TemplateMapping = DomainTemplateMapping & {
  sourceKey?: string; // Compatibility field
};

export type Template = DomainTemplate & {
  exportImagesAsBase64?: boolean; // Compatibility field
};

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
