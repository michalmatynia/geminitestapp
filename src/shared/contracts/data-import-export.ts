import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

import {
  type BaseImportStartResponse,
  type BaseImportRunDetailResponse,
} from './integrations/base-com';

/**
 * Data Import/Export DTOs
 */

export type ImportResponse = BaseImportStartResponse;
export type ImportRunDetail = BaseImportRunDetailResponse;

export const importJobSchema = dtoBaseSchema.extend({
  type: z.string(),
  status: z.string(), // Generic status
  progress: z.number(),
  totalRecords: z.number(),
  processedRecords: z.number(),
  errorRecords: z.number(),
  config: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type ImportJobDto = z.infer<typeof importJobSchema>;

export const exportJobSchema = dtoBaseSchema.extend({
  type: z.string(),
  status: z.string(), // Generic status
  progress: z.number(),
  totalRecords: z.number(),
  processedRecords: z.number(),
  config: z.record(z.string(), z.unknown()),
  fileUrl: z.string().nullable(),
  error: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type ExportJobDto = z.infer<typeof exportJobSchema>;

export const importTemplateSchema = namedDtoSchema.extend({
  type: z.string(),
  config: z.record(z.string(), z.unknown()),
  fieldMappings: z.record(z.string(), z.string()),
});

export type ImportTemplateDto = z.infer<typeof importTemplateSchema>;

export const importExportTemplateMappingSchema = z.object({
  sourceKey: z.string(),
  targetField: z.string(),
});

export type ImportExportTemplateMappingDto = z.infer<typeof importExportTemplateMappingSchema>;
export type ImportExportTemplateMapping = ImportExportTemplateMappingDto;
export type TemplateMapping = ImportExportTemplateMappingDto;

export const importTemplateParameterImportSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['all', 'mapped']).optional(),
  languageScope: z.enum(['catalog_languages', 'default_only']).optional(),
  createMissingParameters: z.boolean().optional(),
  overwriteExistingValues: z.boolean().optional(),
  matchBy: z.enum(['base_id_then_name', 'name_only']).optional(),
});

export type ImportTemplateParameterImportDto = z.infer<typeof importTemplateParameterImportSchema>;
export type ImportTemplateParameterImport = ImportTemplateParameterImportDto;

export const importExportTemplateSchema = namedDtoSchema.extend({
  mappings: z.array(importExportTemplateMappingSchema),
  exportImagesAsBase64: z.boolean().optional(),
  parameterImport: importTemplateParameterImportSchema.optional(),
});

export type ImportExportTemplateDto = z.infer<typeof importExportTemplateSchema>;
export type ImportExportTemplate = ImportExportTemplateDto;
export type Template = ImportExportTemplateDto;

export const createImportExportTemplateSchema = importExportTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateImportExportTemplateDto = z.infer<typeof createImportExportTemplateSchema>;
export type ImportExportTemplateCreateInput = CreateImportExportTemplateDto;
export type UpdateImportExportTemplateDto = Partial<CreateImportExportTemplateDto>;
export type ImportExportTemplateUpdateInput = UpdateImportExportTemplateDto;

export const createImportTemplateSchema = importTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateImportTemplateDto = z.infer<typeof createImportTemplateSchema>;
export type ImportTemplateCreateInput = CreateImportTemplateDto;
export type UpdateImportTemplateDto = Partial<CreateImportTemplateDto>;
export type ImportTemplateUpdateInput = UpdateImportTemplateDto;

export const createImportJobBaseSchema = importJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateImportJobDto_Base = z.infer<typeof createImportJobBaseSchema>;

export type UpdateImportJobDto = Partial<CreateImportJobDto_Base>;

export const createExportJobBaseSchema = exportJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateExportJobDto_Base = z.infer<typeof createExportJobBaseSchema>;

export type UpdateExportJobDto = Partial<CreateExportJobDto_Base>;

// Browser-native File object
export const createImportJobSchema = z.object({
  type: z.string(),
  file: z.unknown(),
  config: z.record(z.string(), z.unknown()).optional(),
  templateId: z.string().optional(),
});

export type CreateImportJobDto = {
  type: string;
  file: File;
  config?: Record<string, unknown>;
  templateId?: string;
};

export const createExportJobSchema = z.object({
  type: z.string(),
  config: z.record(z.string(), z.unknown()),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type CreateExportJobDto = z.infer<typeof createExportJobSchema>;

/**
 * Data Import/Export Options DTOs
 */

export const inventoryOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type InventoryOptionDto = z.infer<typeof inventoryOptionSchema>;
export type InventoryOption = InventoryOptionDto;

export const warehouseOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type WarehouseOptionDto = z.infer<typeof warehouseOptionSchema>;
export type WarehouseOption = WarehouseOptionDto;

export const catalogOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
});

export type CatalogOptionDto = z.infer<typeof catalogOptionSchema>;
export type CatalogOption = CatalogOptionDto;

/**
 * Import List DTOs
 */

export const importListItemSchema = z.object({
  baseProductId: z.string(),
  name: z.string(),
  sku: z.string(),
  exists: z.boolean(),
  skuExists: z.boolean(),
  image: z.string().nullable().optional(),
  price: z.number().optional(),
  stock: z.number().optional(),
  description: z.string().optional(),
});

export type ImportListItemDto = z.infer<typeof importListItemSchema>;
export type ImportListItem = ImportListItemDto;

export const importListStatsSchema = z.object({
  total: z.number(),
  filtered: z.number(),
  available: z.number().optional(),
  existing: z.number(),
  skuDuplicates: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  totalPages: z.number().optional(),
});

export type ImportListStatsDto = z.infer<typeof importListStatsSchema>;
export type ImportListStats = ImportListStatsDto;

export const exportParameterDocSchema = z.object({
  key: z.string(),
  description: z.string(),
});

export type ExportParameterDocDto = z.infer<typeof exportParameterDocSchema>;
export type ExportParameterDoc = ExportParameterDocDto;

export const warehouseDebugRawSchema = z.object({
  method: z.string(),
  statusCode: z.number(),
  ok: z.boolean(),
  error: z.string().nullable(),
  payload: z.unknown(),
});

export type WarehouseDebugRawDto = z.infer<typeof warehouseDebugRawSchema>;
export type WarehouseDebugRaw = WarehouseDebugRawDto;

export const inventoryDebugRawSchema = z.object({
  method: z.string(),
  statusCode: z.number(),
  ok: z.boolean(),
  error: z.string().nullable(),
  payload: z.unknown(),
});

export type InventoryDebugRawDto = z.infer<typeof inventoryDebugRawSchema>;
export type InventoryDebugRaw = InventoryDebugRawDto;

export const debugWarehousesSchema = z
  .object({
    inventory: z.array(warehouseOptionSchema).optional(),
    all: z.array(warehouseOptionSchema).optional(),
    inventories: z.array(inventoryOptionSchema).optional(),
    inventoryRaw: warehouseDebugRawSchema.nullable().optional(),
    inventoriesRaw: inventoryDebugRawSchema.nullable().optional(),
    allRaw: warehouseDebugRawSchema.nullable().optional(),
  })
  .nullable();

export type DebugWarehousesDto = z.infer<typeof debugWarehousesSchema>;
export type DebugWarehouses = DebugWarehousesDto;
