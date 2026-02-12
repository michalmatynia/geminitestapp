import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Integration DTOs
 */

export const integrationSchema = namedDtoSchema.extend({
  slug: z.string(),
});

export type IntegrationDto = z.infer<typeof integrationSchema>;

export const createIntegrationSchema = integrationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIntegrationDto = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationDto = Partial<CreateIntegrationDto>;

export const integrationConnectionSchema = namedDtoSchema.extend({
  integrationId: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  playwrightStorageState: z.string().nullable().optional(),
  playwrightStorageStateUpdatedAt: z.string().nullable().optional(),
  playwrightHeadless: z.boolean().optional(),
  playwrightSlowMo: z.number().optional(),
  playwrightTimeout: z.number().optional(),
  playwrightNavigationTimeout: z.number().optional(),
  playwrightHumanizeMouse: z.boolean().optional(),
  playwrightMouseJitter: z.number().optional(),
  playwrightClickDelayMin: z.number().optional(),
  playwrightClickDelayMax: z.number().optional(),
  playwrightInputDelayMin: z.number().optional(),
  playwrightInputDelayMax: z.number().optional(),
  playwrightActionDelayMin: z.number().optional(),
  playwrightActionDelayMax: z.number().optional(),
  playwrightProxyEnabled: z.boolean().optional(),
  playwrightProxyServer: z.string().nullable().optional(),
  playwrightProxyUsername: z.string().nullable().optional(),
  playwrightProxyPassword: z.string().nullable().optional(),
  playwrightEmulateDevice: z.boolean().optional(),
  playwrightDeviceName: z.string().nullable().optional(),
  allegroAccessToken: z.string().nullable().optional(),
  allegroRefreshToken: z.string().nullable().optional(),
  allegroTokenType: z.string().nullable().optional(),
  allegroScope: z.string().nullable().optional(),
  allegroExpiresAt: z.string().nullable().optional(),
  allegroTokenUpdatedAt: z.string().nullable().optional(),
  allegroUseSandbox: z.boolean().optional(),
  baseApiToken: z.string().nullable().optional(),
  baseTokenUpdatedAt: z.string().nullable().optional(),
  baseLastInventoryId: z.string().nullable().optional(),
});

export type IntegrationConnectionDto = z.infer<typeof integrationConnectionSchema>;

export const createIntegrationConnectionSchema = integrationConnectionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIntegrationConnectionDto = z.infer<typeof createIntegrationConnectionSchema>;
export type UpdateIntegrationConnectionDto = Partial<CreateIntegrationConnectionDto>;

/**
 * Product Listing DTOs
 */

export const productListingExportEventSchema = z.object({
  exportedAt: z.string(),
  status: z.string().nullable().optional(),
  inventoryId: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  warehouseId: z.string().nullable().optional(),
  externalListingId: z.string().nullable().optional(),
  fields: z.array(z.string()).nullable().optional(),
  requestId: z.string().nullable().optional(),
});

export type ProductListingExportEventDto = z.infer<typeof productListingExportEventSchema>;

export const productListingSchema = dtoBaseSchema.extend({
  productId: z.string(),
  integrationId: z.string(),
  connectionId: z.string(),
  externalListingId: z.string().nullable(),
  inventoryId: z.string().nullable(),
  status: z.string(),
  listedAt: z.string().nullable(),
  exportHistory: z.array(productListingExportEventSchema).nullable(),
});

export type ProductListingDto = z.infer<typeof productListingSchema>;

/**
 * Category Mapping DTOs
 */

export const categoryMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalCategoryId: z.string(),
  internalCategoryId: z.string(),
  catalogId: z.string(),
  isActive: z.boolean(),
});

export type CategoryMappingDto = z.infer<typeof categoryMappingSchema>;

/**
 * Template DTOs
 */

export const templateMappingSchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
});

export type TemplateMappingDto = z.infer<typeof templateMappingSchema>;

export const templateSchema = namedDtoSchema.extend({
  provider: z.string(),
  mapping: z.array(templateMappingSchema),
  config: z.record(z.string(), z.unknown()),
});

export type TemplateDto = z.infer<typeof templateSchema>;

export const createTemplateSchema = templateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTemplateDto = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateDto = Partial<CreateTemplateDto>;

/**
 * Base.com Metadata DTOs
 */

export const baseInventorySchema = z.object({
  inventory_id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
});

export type BaseInventoryDto = z.infer<typeof baseInventorySchema>;

export const baseWarehouseSchema = z.object({
  warehouse_id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
});

export type BaseWarehouseDto = z.infer<typeof baseWarehouseSchema>;

export const baseCategorySchema = z.object({
  category_id: z.string(),
  name: z.string(),
  parent_id: z.string(),
});

export type BaseCategoryDto = z.infer<typeof baseCategorySchema>;
