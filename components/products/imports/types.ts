export type InventoryOption = {
  id: string;
  name: string;
};

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
  mappings: TemplateMapping[];
};
