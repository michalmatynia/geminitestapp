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

export type Template = {
  id: string;
  name: string;
  description?: string | null;
  mappings?: TemplateMapping[];
  exportImagesAsBase64?: boolean;
};

export type ImageBase64Mode = "base-only" | "full-data-uri";

export type ImageTransformOptions = {
  forceJpeg?: boolean;
  maxDimension?: number;
  jpegQuality?: number;
};

export type ImageRetryPreset = {
  id: string;
  label: string;
  description: string;
  imageBase64Mode: ImageBase64Mode;
  transform: ImageTransformOptions;
};

export type ExportParameterDoc = {
  name: string;
  type: string;
  description: string;
  required: boolean;
};

export type ImportListStats = {
  total: number;
  filtered: number;
  available?: number;
  existing: number;
  skuDuplicates?: number;
};

export type DebugWarehouses = {
  inventory?: WarehouseOption[];
  all?: WarehouseOption[];
  inventories?: InventoryOption[];
  inventoryRaw?: WarehouseDebugRaw | null;
  inventoriesRaw?: InventoryDebugRaw | null;
  allRaw?: WarehouseDebugRaw | null;
} | null;
