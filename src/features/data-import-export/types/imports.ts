export type InventoryOption = {
  id: string;
  name: string;
};

export type BaseInventory = InventoryOption;

export type WarehouseOption = {
  id: string;
  name: string;
  typedId?: string;
};

export type WarehouseDebugRaw = {
  ok: boolean;
  statusCode: number;
  error?: string;
  method: string;
  parameters: Record<string, unknown>;
  payload: Record<string, unknown> | null;
};

export type InventoryDebugRaw = WarehouseDebugRaw & {
  inventories?: InventoryOption[];
};

export type CatalogOption = {
  id: string;
  name: string;
  isDefault?: boolean;
};

export type ImportResponse = {
  imported: number;
  failed: number;
  total: number;
  errors?: string[];
};

export type ImportListItem = {
  baseProductId: string;
  name: string;
  sku: string | null;
  exists: boolean;
  skuExists?: boolean;
  description?: string;
  price?: number;
  stock?: number;
  image?: string | null;
};

export type TemplateMapping = {
  sourceKey: string;
  targetField: string;
};

import type { 
  ImageBase64Mode, 
  ImageTransformOptions, 
  ImageRetryPreset 
} from '@/shared/types/domain/integrations';

export type {
  ImageBase64Mode,
  ImageTransformOptions,
  ImageRetryPreset,
};

export type Template = {
  id: string;
  name: string;
  description?: string;
  mapping?: TemplateMapping[];
  mappings?: TemplateMapping[];
  exportImagesAsBase64?: boolean;
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

export type DebugWarehouses = {
  inventory?: WarehouseOption[];
  all?: WarehouseOption[];
  inventories?: InventoryOption[];
  inventoryRaw?: WarehouseDebugRaw | null;
  inventoriesRaw?: InventoryDebugRaw | null;
  allRaw?: WarehouseDebugRaw | null;
} | null;
