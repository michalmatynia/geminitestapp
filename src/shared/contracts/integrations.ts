import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import {
  productParameterValueSchema,
  type ParameterRepository,
  type ProductParameter,
  type ProductParameterValue,
  type Producer,
  type ProductCategory,
  type ProductTag,
} from './products';

/**
 * Image Processing Contracts
 */
export const imageTransformOptionsSchema = z.object({
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
  quality: z.number().optional(),
  format: z.enum(['jpeg', 'png', 'webp']).optional(),
  forceJpeg: z.boolean().optional(),
  maxDimension: z.number().optional(),
  jpegQuality: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export type ImageTransformOptions = z.infer<typeof imageTransformOptionsSchema>;

export const imageBase64ModeSchema = z.enum(['base-only', 'full-data-uri']);
export type ImageBase64Mode = z.infer<typeof imageBase64ModeSchema>;

export const imageRetryPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string().optional(),
  description: z.string(),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']),
  transform: imageTransformOptionsSchema,
});

export type ImageRetryPreset = z.infer<typeof imageRetryPresetSchema>;

/**
 * Integration DTOs
 */

export const integrationSchema = namedDtoSchema.extend({
  slug: z.string(),
  credentials: z.record(z.string(), z.any()).optional(),
});

export type Integration = z.infer<typeof integrationSchema>;
export type IntegrationDto = Integration;

export const createIntegrationSchema = integrationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIntegration = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegration = Partial<CreateIntegration>;

export const integrationConnectionSchema = namedDtoSchema.extend({
  integrationId: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  playwrightStorageState: z.string().nullable().optional(),
  playwrightStorageStateUpdatedAt: z.string().nullable().optional(),
  playwrightPersonaId: z.string().nullable().optional(),
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
  hasAllegroAccessToken: z.boolean().optional(),
  baseApiToken: z.string().nullable().optional(),
  hasBaseApiToken: z.boolean().optional(),
  baseTokenUpdatedAt: z.string().nullable().optional(),
  baseLastInventoryId: z.string().nullable().optional(),
  traderaDefaultTemplateId: z.string().nullable().optional(),
  traderaDefaultDurationHours: z.number().optional(),
  traderaAutoRelistEnabled: z.boolean().optional(),
  traderaAutoRelistLeadMinutes: z.number().optional(),
  traderaApiAppId: z.number().nullable().optional(),
  traderaApiAppKey: z.string().nullable().optional(),
  traderaApiPublicKey: z.string().nullable().optional(),
  traderaApiUserId: z.number().nullable().optional(),
  traderaApiToken: z.string().nullable().optional(),
  traderaApiSandbox: z.boolean().optional(),
  hasTraderaApiAppKey: z.boolean().optional(),
  hasTraderaApiToken: z.boolean().optional(),
  traderaApiTokenUpdatedAt: z.string().nullable().optional(),
});

export type IntegrationConnection = z.infer<typeof integrationConnectionSchema>;
export type IntegrationConnectionDto = IntegrationConnection;

export const createIntegrationConnectionSchema = integrationConnectionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIntegrationConnection = z.infer<typeof createIntegrationConnectionSchema>;
export type UpdateIntegrationConnection = Partial<CreateIntegrationConnection>;

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
  expiresAt: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  relist: z.boolean().optional(),
  fields: z.array(z.string()).nullable().optional(),
  requestId: z.string().nullable().optional(),
});

export interface ProductListingExportEvent {
  exportedAt: string;
  status?: string | null;
  inventoryId?: string | null;
  templateId?: string | null;
  warehouseId?: string | null;
  externalListingId?: string | null;
  expiresAt?: string | null;
  failureReason?: string | null;
  relist?: boolean;
  fields?: string[] | null;
  requestId?: string | null;
}

export type ListingAttempt = ProductListingExportEvent;

export const productListingRelistPolicySchema = z.object({
  enabled: z.boolean().optional(),
  leadMinutes: z.number().optional(),
  maxAttempts: z.number().optional(),
  durationHours: z.number().optional(),
  templateId: z.string().nullable().optional(),
});

export interface ProductListingRelistPolicy {
  enabled?: boolean;
  leadMinutes?: number;
  maxAttempts?: number;
  durationHours?: number;
  templateId?: string | null;
}

export const productListingSchema = dtoBaseSchema.extend({
  productId: z.string(),
  integrationId: z.string(),
  connectionId: z.string(),
  externalListingId: z.string().nullable(),
  inventoryId: z.string().nullable(),
  status: z.string(),
  listedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  nextRelistAt: z.string().nullable(),
  relistPolicy: productListingRelistPolicySchema.nullable().optional(),
  relistAttempts: z.number().int().optional(),
  lastRelistedAt: z.string().nullable(),
  lastStatusCheckAt: z.string().nullable(),
  marketplaceData: z.record(z.string(), z.unknown()).nullable().optional(),
  failureReason: z.string().nullable(),
  exportHistory: z.array(productListingExportEventSchema).nullable(),
});

export interface ProductListing {
  id: string;
  productId: string;
  integrationId: string;
  connectionId: string;
  externalListingId: string | null;
  inventoryId: string | null;
  status: string;
  listedAt: string | null;
  expiresAt: string | null;
  nextRelistAt: string | null;
  relistPolicy?: ProductListingRelistPolicy | null;
  relistAttempts?: number;
  lastRelistedAt: string | null;
  lastStatusCheckAt: string | null;
  marketplaceData: Record<string, unknown> | null;
  failureReason: string | null;
  exportHistory: ProductListingExportEvent[] | null;
  createdAt: string;
  updatedAt: string | null;}

export const productListingWithDetailsSchema = productListingSchema.extend({
  integration: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  connection: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export interface ProductListingWithDetails extends ProductListing {
  integration: {
    id: string;
    name: string;
    slug: string;
  };
  connection: {
    id: string;
    name: string;
  };
}

export const createProductListingSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  integrationId: z.string(),
  connectionId: z.string(),
  status: z.string().optional(),
  externalListingId: z.string().nullable().optional(),
  inventoryId: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  nextRelistAt: z.string().nullable().optional(),
  relistPolicy: productListingRelistPolicySchema.nullable().optional(),
  relistAttempts: z.number().optional(),
  lastRelistedAt: z.string().nullable().optional(),
  lastStatusCheckAt: z.string().nullable().optional(),
  marketplaceData: z.record(z.string(), z.unknown()).nullable().optional(),
  failureReason: z.string().nullable().optional(),
  exportHistory: z.array(productListingExportEventSchema).nullable().optional(),
});

export type CreateProductListing = z.infer<typeof createProductListingSchema>;

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

export interface CategoryMapping {
  id: string;
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export const externalCategorySchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  parentExternalId: z.string().nullable(),
  path: z.string().nullable(),
  depth: z.number(),
  isLeaf: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  fetchedAt: z.string(),
});

export interface ExternalCategory {
  id: string;
  connectionId: string;
  externalId: string;
  name: string;
  parentExternalId: string | null;
  path: string | null;
  depth: number;
  isLeaf: boolean;
  metadata: Record<string, unknown> | null;
  fetchedAt: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ExternalCategoryWithChildren extends ExternalCategory {
  children: ExternalCategoryWithChildren[];
}

export const externalCategoryWithChildrenSchema: z.ZodType<ExternalCategoryWithChildren> = externalCategorySchema.extend({
  children: z.array(z.lazy(() => externalCategoryWithChildrenSchema)),
});

export const baseCategoryFromApiSchema = z.object({
  category_id: z.union([z.number(), z.string()]),
  name: z.string(),
  parent_id: z.union([z.number(), z.string()]).nullable(),
});

export type BaseCategoryFromApi = z.infer<typeof baseCategoryFromApiSchema>;

export const baseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
});

export type BaseCategory = z.infer<typeof baseCategorySchema>;

export const externalCategorySyncInputSchema = z.object({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  parentExternalId: z.string().nullable(),
  path: z.string().nullable(),
  depth: z.number(),
  isLeaf: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export interface ExternalCategorySyncInput {
  connectionId: string;
  externalId: string;
  name: string;
  parentExternalId: string | null;
  path: string | null;
  depth: number;
  isLeaf: boolean;
  metadata?: Record<string, unknown> | null;
}

export const categoryMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalCategoryId: z.string(),
  internalCategoryId: z.string(),
  catalogId: z.string(),
});

export interface CategoryMappingCreateInput {
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
}

export const categoryMappingUpdateInputSchema = z.object({
  internalCategoryId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export interface CategoryMappingUpdateInput {
  internalCategoryId?: string;
  isActive?: boolean;
}

export const categoryMappingWithDetailsSchema = categoryMappingSchema.extend({
  externalCategory: externalCategorySchema,
  internalCategory: z.any(), // ProductCategory
});

export interface CategoryMappingWithDetails extends CategoryMapping {
  externalCategory: ExternalCategory;
  internalCategory: ProductCategory | null;
}

export const externalTagSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  fetchedAt: z.string(),
});

export type ExternalTag = z.infer<typeof externalTagSchema>;

export const tagMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalTagId: z.string(),
  internalTagId: z.string(),
  isActive: z.boolean(),
});

export interface TagMapping {
  id: string;
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export const tagMappingWithDetailsSchema = tagMappingSchema.extend({
  externalTag: externalTagSchema,
  internalTag: z.any(), // ProductTag
});

export interface TagMappingWithDetails extends TagMapping {
  externalTag: ExternalTag;
  internalTag: ProductTag | null;
}

export interface BaseTag {
  id: string;
  name: string;
}

export interface ExternalTagSyncInput {
  connectionId: string;
  externalId: string;
  name: string;
  metadata?: Record<string, unknown> | null;
}

export const tagMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalTagId: z.string(),
  internalTagId: z.string(),
});

export interface TagMappingCreateInput {
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
}

export const tagMappingUpdateInputSchema = z.object({
  externalTagId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export interface TagMappingUpdateInput {
  externalTagId?: string;
  isActive?: boolean;
}

export const externalProducerSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  fetchedAt: z.string(),
});

export interface ExternalProducer {
  id: string;
  connectionId: string;
  externalId: string;
  name: string;
  metadata: Record<string, unknown> | null;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const producerMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalProducerId: z.string(),
  internalProducerId: z.string(),
  isActive: z.boolean(),
});

export interface ProducerMapping {
  id: string;
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export const producerMappingWithDetailsSchema = producerMappingSchema.extend({
  externalProducer: externalProducerSchema,
  internalProducer: z.any(), // Producer
});

export interface ProducerMappingWithDetails extends ProducerMapping {
  externalProducer: ExternalProducer;
  internalProducer: Producer | null;
}

export const baseProducerFromApiSchema = z.object({
  manufacturer_id: z.union([z.number(), z.string()]).optional(),
  producer_id: z.union([z.number(), z.string()]).optional(),
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().optional(),
});

export type BaseProducerFromApi = z.infer<typeof baseProducerFromApiSchema>;

export interface BaseProducer {
  id: string;
  name: string;
}

export interface ExternalProducerSyncInput {
  connectionId: string;
  externalId: string;
  name: string;
  metadata?: Record<string, unknown> | null;
}

export const producerMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalProducerId: z.string(),
  internalProducerId: z.string(),
});

export interface ProducerMappingCreateInput {
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
}

export const producerMappingUpdateInputSchema = z.object({
  externalProducerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export interface ProducerMappingUpdateInput {
  externalProducerId?: string;
  isActive?: boolean;
}

/**
 * Template DTOs
 */

export const templateMappingSchema = z.object({
  sourceKey: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
});

export type TemplateMapping = z.infer<typeof templateMappingSchema>;

export const templateSchema = namedDtoSchema.extend({
  provider: z.string(),
  mappings: z.array(templateMappingSchema),
  config: z.record(z.string(), z.unknown()),
  description: z.string().nullable().optional(),
  exportImagesAsBase64: z.boolean().optional(),
});

export type Template = z.infer<typeof templateSchema>;

export const createTemplateSchema = templateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTemplate = z.infer<typeof createTemplateSchema>;
export type UpdateTemplate = Partial<CreateTemplate>;

/**
 * Base.com Metadata DTOs
 */

export const baseInventorySchema = z.object({
  id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
});

export type BaseInventory = z.infer<typeof baseInventorySchema>;

export const baseWarehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
  typedId: z.string().optional(),
});

export type BaseWarehouse = z.infer<typeof baseWarehouseSchema>;

export const fetchMarketplaceCategoriesRequestSchema = z.object({
  connectionId: z.string(),
});

export type FetchMarketplaceCategoriesRequest = z.infer<typeof fetchMarketplaceCategoriesRequestSchema>;

export const bulkCategoryMappingRequestSchema = z.object({
  connectionId: z.string(),
  catalogId: z.string(),
  mappings: z.array(z.object({
    externalCategoryId: z.string(),
    internalCategoryId: z.string().nullable(),
  })),
});

export type BulkCategoryMappingRequest = z.infer<typeof bulkCategoryMappingRequestSchema>;

/**
 * Base.com Import DTOs
 */

export const baseImportRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'partial_success',
  'failed',
  'canceled',
]);
export type BaseImportRunStatus = z.infer<typeof baseImportRunStatusSchema>;

export const baseImportItemStatusSchema = z.enum([
  'pending',
  'processing',
  'imported',
  'updated',
  'skipped',
  'failed',
]);
export type BaseImportItemStatus = z.infer<typeof baseImportItemStatusSchema>;

export const baseImportItemActionSchema = z.enum([
  'pending',
  'processing',
  'imported',
  'updated',
  'skipped',
  'failed',
  'dry_run',
]);
export type BaseImportItemAction = z.infer<typeof baseImportItemActionSchema>;

export const baseImportModeSchema = z.enum([
  'create_only',
  'upsert_on_base_id',
  'upsert_on_sku',
]);
export type BaseImportMode = z.infer<typeof baseImportModeSchema>;

export const baseImportErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'DUPLICATE_SKU',
  'BASE_FETCH_ERROR',
  'MISSING_BASE_ID',
  'MISSING_SKU',
  'MISSING_CONNECTION',
  'MISSING_CATALOG',
  'MISSING_PRICE_GROUP',
  'UNEXPECTED_ERROR',
  'LINKING_ERROR',
  'CONFLICT',
  'PRECHECK_FAILED',
  'NOT_FOUND',
  'CANCELED',
  'RATE_LIMITED',
  'TIMEOUT',
  'NETWORK_ERROR',
]);
export type BaseImportErrorCode = z.infer<typeof baseImportErrorCodeSchema>;

export const baseImportErrorClassSchema = z.enum([
  'transient',
  'permanent',
  'configuration',
  'canceled',
]);
export type BaseImportErrorClass = z.infer<typeof baseImportErrorClassSchema>;

export const baseImportParameterImportSummarySchema = z.object({
  extracted: z.number(),
  resolved: z.number(),
  created: z.number(),
  written: z.number(),
});
export type BaseImportParameterImportSummary = z.infer<typeof baseImportParameterImportSummarySchema>;

export const baseImportRunParameterImportSummarySchema = baseImportParameterImportSummarySchema.extend({
  itemsApplied: z.number(),
});
export type BaseImportRunParameterImportSummary = z.infer<typeof baseImportRunParameterImportSummarySchema>;

export const baseImportRunStatsSchema = z.object({
  total: z.number(),
  pending: z.number(),
  processing: z.number(),
  imported: z.number(),
  updated: z.number(),
  skipped: z.number(),
  failed: z.number(),
  parameterImportSummary: baseImportRunParameterImportSummarySchema.optional(),
});
export type BaseImportRunStats = z.infer<typeof baseImportRunStatsSchema>;

export const baseImportRunParamsSchema = z.object({
  connectionId: z.string().optional(),
  inventoryId: z.string(),
  catalogId: z.string(),
  templateId: z.string().optional(),
  limit: z.number().optional(),
  imageMode: z.enum(['links', 'download']),
  uniqueOnly: z.boolean(),
  allowDuplicateSku: z.boolean(),
  selectedIds: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
  mode: baseImportModeSchema.optional(),
  requestId: z.string().optional(),
});
export type BaseImportRunParams = z.infer<typeof baseImportRunParamsSchema>;

export const baseImportPreflightIssueSchema = z.object({
  code: baseImportErrorCodeSchema,
  message: z.string(),
  severity: z.enum(['error', 'warning']),
});
export type BaseImportPreflightIssue = z.infer<typeof baseImportPreflightIssueSchema>;

export const baseImportPreflightSchema = z.object({
  ok: z.boolean(),
  issues: z.array(baseImportPreflightIssueSchema),
  checkedAt: z.string(),
});
export type BaseImportPreflight = z.infer<typeof baseImportPreflightSchema>;

export const baseImportRunRecordSchema = z.object({
  id: z.string(),
  status: baseImportRunStatusSchema,
  params: baseImportRunParamsSchema,
  idempotencyKey: z.string().nullable().optional(),
  queueJobId: z.string().nullable().optional(),
  lockOwnerId: z.string().nullable().optional(),
  lockToken: z.string().nullable().optional(),
  lockExpiresAt: z.string().nullable().optional(),
  lockHeartbeatAt: z.string().nullable().optional(),
  cancellationRequestedAt: z.string().nullable().optional(),
  canceledAt: z.string().nullable().optional(),
  maxAttempts: z.number().optional(),
  preflight: baseImportPreflightSchema,
  stats: baseImportRunStatsSchema,
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  summaryMessage: z.string().nullable().optional(),
});
export type BaseImportRunRecord = z.infer<typeof baseImportRunRecordSchema>;

export const baseImportItemRecordSchema = z.object({
  runId: z.string(),
  itemId: z.string(),
  baseProductId: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  status: baseImportItemStatusSchema,
  attempt: z.number(),
  idempotencyKey: z.string(),
  action: baseImportItemActionSchema,
  errorCode: baseImportErrorCodeSchema.nullable().optional(),
  errorClass: baseImportErrorClassSchema.nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  retryable: z.boolean().nullable().optional(),
  nextRetryAt: z.string().nullable().optional(),
  lastErrorAt: z.string().nullable().optional(),
  importedProductId: z.string().nullable().optional(),
  payloadSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  parameterImportSummary: baseImportParameterImportSummarySchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});
export type BaseImportItemRecord = z.infer<typeof baseImportItemRecordSchema>;

export const baseImportStartResponseSchema = z.object({
  runId: z.string(),
  status: baseImportRunStatusSchema,
  preflight: baseImportPreflightSchema,
  queueJobId: z.string().nullable().optional(),
  summaryMessage: z.string().nullable().optional(),
});
export type BaseImportStartResponse = z.infer<typeof baseImportStartResponseSchema>;

export const baseImportRunDetailResponseSchema = z.object({
  run: baseImportRunRecordSchema,
  items: z.array(baseImportItemRecordSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }).optional(),
});
export type BaseImportRunDetailResponse = z.infer<typeof baseImportRunDetailResponseSchema>;

/**
 * Base.com Parameter Import DTOs
 */

export const extractedBaseParameterSchema = z.object({
  key: z.string(),
  baseParameterId: z.string().nullable(),
  namesByLanguage: z.record(z.string(), z.string()),
  valuesByLanguage: z.record(z.string(), z.string()),
});

export interface ExtractedBaseParameter {
  key: string;
  baseParameterId: string | null;
  namesByLanguage: Record<string, string>;
  valuesByLanguage: Record<string, string>;
}

export const baseParameterImportSummarySchema = z.object({
  extracted: z.number(),
  resolved: z.number(),
  created: z.number(),
  written: z.number(),
});

export type BaseParameterImportSummary = z.infer<typeof baseParameterImportSummarySchema>;

/**
 * Base.com Parameter Import Settings DTOs
 */

export const baseImportParameterImportModeSchema = z.enum(['all', 'mapped']);
export type BaseImportParameterImportMode = z.infer<typeof baseImportParameterImportModeSchema>;

export const baseImportParameterLanguageScopeSchema = z.enum(['catalog_languages', 'default_only']);
export type BaseImportParameterLanguageScope = z.infer<typeof baseImportParameterLanguageScopeSchema>;

export const baseImportParameterMatchBySchema = z.enum(['base_id_then_name', 'name_only']);
export type BaseImportParameterMatchBy = z.infer<typeof baseImportParameterMatchBySchema>;

export const baseImportParameterImportSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: baseImportParameterImportModeSchema,
  languageScope: baseImportParameterLanguageScopeSchema,
  createMissingParameters: z.boolean(),
  overwriteExistingValues: z.boolean(),
  matchBy: baseImportParameterMatchBySchema,
});

export type BaseImportParameterImportSettings = z.infer<typeof baseImportParameterImportSettingsSchema>;

export const DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS: BaseImportParameterImportSettings =
  {
    enabled: false,
    mode: 'all',
    languageScope: 'catalog_languages',
    createMissingParameters: true,
    overwriteExistingValues: false,
    matchBy: 'base_id_then_name',
  };

export const defaultBaseImportParameterImportSettings = DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS;

export function normalizeBaseImportParameterImportSettings(input: unknown): BaseImportParameterImportSettings {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;
    return {
      enabled: typeof record['enabled'] === 'boolean' ? record['enabled'] : DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS.enabled,
      mode: typeof record['mode'] === 'string' && ['all', 'mapped'].includes(record['mode']) ? (record['mode'] as BaseImportParameterImportMode) : DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS.mode,
      languageScope: typeof record['languageScope'] === 'string' && ['catalog_languages', 'default_only'].includes(record['languageScope']) ? (record['languageScope'] as BaseImportParameterLanguageScope) : DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS.languageScope,
      createMissingParameters: typeof record['createMissingParameters'] === 'boolean' ? record['createMissingParameters'] : DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS.createMissingParameters,
      overwriteExistingValues: typeof record['overwriteExistingValues'] === 'boolean' ? record['overwriteExistingValues'] : DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS.overwriteExistingValues,
      matchBy: typeof record['matchBy'] === 'string' && ['base_id_then_name', 'name_only'].includes(record['matchBy']) ? (record['matchBy'] as BaseImportParameterMatchBy) : DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS.matchBy,
    };
  }
  return DEFAULT_BASE_IMPORT_PARAMETER_IMPORT_SETTINGS;
}

export const applyBaseParameterImportInputSchema = z.object({
  record: z.record(z.string(), z.unknown()),
  catalogId: z.string(),
  connectionId: z.string().nullable().optional(),
  inventoryId: z.string().nullable().optional(),
  existingValues: z.array(productParameterValueSchema),
  catalogLanguageCodes: z.array(z.string()),
  defaultLanguageCode: z.string().nullable().optional(),
  settings: baseImportParameterImportSettingsSchema,
  templateMappings: z.array(z.object({ sourceKey: z.string(), targetField: z.string() })),
});

export interface ApplyBaseParameterImportInput {
  record: Record<string, unknown>;
  catalogId: string;
  parameterRepository: ParameterRepository;
  connectionId?: string | null | undefined;
  inventoryId?: string | null | undefined;
  existingValues: ProductParameterValue[];
  catalogLanguageCodes: string[];
  defaultLanguageCode?: string | null | undefined;
  settings: BaseImportParameterImportSettings;
  templateMappings: { sourceKey: string; targetField: string }[];
  prefetchedParameters?: ProductParameter[];
  prefetchedLinks?: Record<string, string>;
}

export const applyBaseParameterImportResultSchema = z.object({
  applied: z.boolean(),
  parameters: z.array(productParameterValueSchema),
  summary: baseParameterImportSummarySchema,
});

export interface ApplyBaseParameterImportResult {
  applied: boolean;
  parameters: ProductParameterValue[];
  summary: BaseParameterImportSummary;
}

/**
 * Integration Test DTOs
 */

export const testStatusSchema = z.enum(['pending', 'ok', 'failed']);
export type TestStatus = z.infer<typeof testStatusSchema>;

export const TEST_STATUSES = ['pending', 'ok', 'failed'] as const;

export const testLogEntrySchema = z.object({
  step: z.string(),
  status: testStatusSchema,
  timestamp: z.string(),
  detail: z.string().optional(),
});

export type TestLogEntry = z.infer<typeof testLogEntrySchema>;

export const testConnectionResponseSchema = z.object({
  error: z.string().optional(),
  errorId: z.string().optional(),
  integrationId: z.string().nullable().optional(),
  connectionId: z.string().nullable().optional(),
  steps: z.unknown().optional(),
  profile: z.unknown().optional(),
});

export type TestConnectionResponse = z.infer<typeof testConnectionResponseSchema>;

export const sessionCookieSchema = z.object({
  name: z.string().optional(),
  value: z.string().optional(),
  domain: z.string().optional(),
  path: z.string().optional(),
  expires: z.number().optional(),
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  sameSite: z.string().optional(),
});

export type SessionCookie = z.infer<typeof sessionCookieSchema>;

/**
 * Image Export Diagnostics DTOs
 */

export const imageUrlDiagnosticSchema = z.object({
  sourceType: z.enum(['slot', 'link', 'mapped', 'unknown']),
  index: z.number(),
  filepath: z.string().nullable(),
  resolvedUrl: z.string().nullable(),
  mimetype: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  supported: z.boolean(),
  reason: z.string().optional(),
  extension: z.string().nullable().optional(),
  normalizedMime: z.string().nullable().optional(),
  url: z.string().optional(), // For compatibility with simpler versions
  status: z.enum(['valid', 'invalid', 'unreachable']).optional(), // For compatibility
  error: z.string().optional(), // For compatibility
});

export type ImageUrlDiagnostic = z.infer<typeof imageUrlDiagnosticSchema>;

export const imageExportDiagnosticsSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  skipped: z.number(),
  errors: z.array(z.object({
    imageId: z.string(),
    error: z.string(),
  })),
});

export type ImageExportDiagnostics = z.infer<typeof imageExportDiagnosticsSchema>;

/**
 * Operation Logging DTOs
 */

export const capturedLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CapturedLog = z.infer<typeof capturedLogSchema>;

/**
 * Integration Domain DTOs
 */

export const integrationConnectionBasicSchema = z.object({
  id: z.string(),
  name: z.string(),
  integrationId: z.string(),
  traderaDefaultTemplateId: z.string().nullable().optional(),
  traderaDefaultDurationHours: z.number().nullable().optional(),
  traderaAutoRelistEnabled: z.boolean().nullable().optional(),
  traderaAutoRelistLeadMinutes: z.number().nullable().optional(),
  traderaApiAppId: z.number().nullable().optional(),
  traderaApiPublicKey: z.string().nullable().optional(),
  traderaApiUserId: z.number().nullable().optional(),
  traderaApiSandbox: z.boolean().nullable().optional(),
});

export type IntegrationConnectionBasic = z.infer<typeof integrationConnectionBasicSchema>;

export const integrationWithConnectionsSchema = namedDtoSchema.extend({
  slug: z.string(),
  connections: z.array(integrationConnectionBasicSchema),
});

export type IntegrationWithConnections = z.infer<typeof integrationWithConnectionsSchema>;

export const listingJobSchema = productListingSchema.extend({
  integrationName: z.string(),
  integrationSlug: z.string(),
  connectionName: z.string(),
});

export type ListingJob = z.infer<typeof listingJobSchema>;

export const productJobSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string().nullable(),
  listings: z.array(listingJobSchema),
});

export type ProductJob = z.infer<typeof productJobSchema>;

export const exportJobDetailSchema = z.object({
  job: productJobSchema,
  listing: listingJobSchema,
});

export type ExportJobDetail = z.infer<typeof exportJobDetailSchema>;

/**
 * Base.com API DTOs
 */

export const baseProductRecordSchema = z.record(z.string(), z.unknown());
export type BaseProductRecord = z.infer<typeof baseProductRecordSchema>;

export const baseApiRawResultSchema = z.object({
  status: z.string(),
}).catchall(z.unknown());

export type BaseApiRawResult = z.infer<typeof baseApiRawResultSchema>;

export const importParameterCacheSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  expiresAt: z.number(),
});

export type ImportParameterCache = z.infer<typeof importParameterCacheSchema>;

export const baseApiResponseSchema = z.object({
  status: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
}).catchall(z.unknown());

export type BaseApiResponse = z.infer<typeof baseApiResponseSchema>;

export const priceGroupLookupSchema = z.object({
  id: z.string(),
  groupId: z.string().nullable().optional(),
  currencyId: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type PriceGroupLookup = z.infer<typeof priceGroupLookupSchema>;

export const baseConnectionContextSchema = z.object({
  baseIntegrationId: z.string().nullable(),
  connectionId: z.string().nullable(),
  token: z.string().nullable(),
  issue: baseImportPreflightIssueSchema.nullable(),
});

export type BaseConnectionContext = z.infer<typeof baseConnectionContextSchema>;

/**
 * Tradera API DTOs
 */

export const traderaApiCredentialsSchema = z.object({
  appId: z.number(),
  appKey: z.string(),
  userId: z.number(),
  token: z.string(),
  sandbox: z.boolean().optional(),
  maxResultAgeSeconds: z.number().optional(),
});

export type TraderaApiCredentials = z.infer<typeof traderaApiCredentialsSchema>;

export const traderaApiUserInfoSchema = z.object({
  userId: z.number(),
  alias: z.string().nullable(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export type TraderaApiUserInfo = z.infer<typeof traderaApiUserInfoSchema>;

export const traderaAddShopItemInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  categoryId: z.number(),
  price: z.number(),
  quantity: z.number(),
  shippingCondition: z.string(),
  paymentCondition: z.string(),
  acceptedBuyerId: z.number().optional(),
});

export type TraderaAddShopItemInput = z.infer<typeof traderaAddShopItemInputSchema>;

export const traderaAddShopItemResultSchema = z.object({
  itemId: z.number(),
  requestId: z.number().nullable(),
  resultCode: z.string().nullable(),
  resultMessage: z.string().nullable(),
});

export type TraderaAddShopItemResult = z.infer<typeof traderaAddShopItemResultSchema>;

/**
 * Session & Payload DTOs
 */

export const sessionPayloadSchema = z.object({
  cookies: z.array(sessionCookieSchema).optional(),
  origins: z.array(z.unknown()).optional(),
  updatedAt: z.string().optional(),
  error: z.string().optional(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

/**
 * Tradera System Settings DTO
 */

export const traderaSystemSettingsSchema = z.object({
  defaultDurationHours: z.number(),
  autoRelistEnabled: z.boolean(),
  autoRelistLeadMinutes: z.number(),
  schedulerEnabled: z.boolean(),
  schedulerIntervalMs: z.number(),
  allowSimulatedSuccess: z.boolean(),
  listingFormUrl: z.string(),
  selectorProfile: z.string(),
});

export type TraderaSystemSettings = z.infer<typeof traderaSystemSettingsSchema>;

export const traderaListingJobInputSchema = z.object({
  listingId: z.string(),
  action: z.enum(['list', 'relist']),
  source: z.enum(['manual', 'scheduler', 'api']).optional(),
  jobId: z.string().optional(),
});

export type TraderaListingJobInput = z.infer<typeof traderaListingJobInputSchema>;

export const traderaCategoryRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string(),
});

export type TraderaCategoryRecord = z.infer<typeof traderaCategoryRecordSchema>;

export const importParameterCacheResponseSchema = z.object({
  inventoryId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  keys: z.array(z.string()).optional(),
  values: z.record(z.string(), z.string()).optional(),
  updatedAt: z.string().optional(),
});

export type ImportParameterCacheResponse = z.infer<typeof importParameterCacheResponseSchema>;

/**
 * Integration Repository Interfaces
 */

export type IntegrationRecord = Omit<Integration, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
};

export type IntegrationConnectionRecord = Omit<IntegrationConnection, 'createdAt' | 'updatedAt' | 'playwrightStorageStateUpdatedAt' | 'traderaApiTokenUpdatedAt'> & {
  createdAt: string | Date;
  updatedAt: string | Date | null;
  playwrightStorageStateUpdatedAt?: string | Date | null;
  traderaApiTokenUpdatedAt?: string | Date | null;
};

export type IntegrationRepository = {
  listIntegrations: () => Promise<IntegrationRecord[]>;
  upsertIntegration: (input: { name: string; slug: string }) => Promise<IntegrationRecord>;
  getIntegrationById: (id: string) => Promise<IntegrationRecord | null>;
  listConnections: (integrationId: string) => Promise<IntegrationConnectionRecord[]>;
  getConnectionById: (id: string) => Promise<IntegrationConnectionRecord | null>;
  getConnectionByIdAndIntegration: (id: string, integrationId: string) => Promise<IntegrationConnectionRecord | null>;
  createConnection: (integrationId: string, input: Record<string, unknown>) => Promise<IntegrationConnectionRecord>;
  updateConnection: (id: string, input: Partial<IntegrationConnectionRecord>) => Promise<IntegrationConnectionRecord>;
  deleteConnection: (id: string) => Promise<void>;
};

export type ExternalCategoryRepository = {
  listCategories: (integrationId: string) => Promise<{ category_id: string; name: string; parent_id: string }[]>;
  syncCategories: (integrationId: string) => Promise<void>;
};

export type CategoryMappingRepository = {
  getMapping: (categoryId: string, integrationId: string) => Promise<string | null>;
  saveMapping: (categoryId: string, integrationId: string, externalId: string) => Promise<void>;
};

export type CreateProductListingInput = Omit<CreateProductListing, 'listedAt' | 'expiresAt' | 'nextRelistAt' | 'lastRelistedAt' | 'lastStatusCheckAt'> & {
  listedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  nextRelistAt?: string | Date | null;
  lastRelistedAt?: string | Date | null;
  lastStatusCheckAt?: string | Date | null;
};

export type ProductListingExportEventRecord = Omit<ProductListingExportEvent, 'exportedAt' | 'expiresAt'> & {
  exportedAt: string | Date;
  expiresAt?: string | Date | null | undefined;
};

export type ProductListingRepository = {
  getListingsByProductId: (productId: string) => Promise<ProductListingWithDetails[]>;
  getListingById: (id: string) => Promise<ProductListing | null>;
  createListing: (input: CreateProductListingInput) => Promise<ProductListingWithDetails>;
  updateListingExternalId: (id: string, externalListingId: string | null) => Promise<void>;
  updateListingStatus: (id: string, status: string) => Promise<void>;
  updateListing: (id: string, input: Partial<CreateProductListingInput>) => Promise<void>;
  updateListingInventoryId: (id: string, inventoryId: string | null) => Promise<void>;
  appendExportHistory: (id: string, event: ProductListingExportEventRecord) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  listingExists: (productId: string, connectionId: string) => Promise<boolean>;
  getListingsByProductIds: (productIds: string[]) => Promise<ProductListing[]>;
  getListingsByConnection: (connectionId: string) => Promise<ProductListing[]>;
  listAllListings: () => Promise<Array<Pick<ProductListing, 'productId' | 'status' | 'integrationId' | 'marketplaceData'>>>;
};

/**
 * Integration UI Constants
 */

export const integrationDefinitions = [
  { name: 'Tradera', slug: 'tradera' },
  { name: 'Tradera API', slug: 'tradera-api' },
  { name: 'Allegro', slug: 'allegro' },
  { name: 'Baselinker', slug: 'baselinker' },
] as const;

/**
 * Legacy Integration Type Aliases (Standardized names already defined above)
 */
export type ProductListingRecord = ProductListing;
export type IntegrationWithConnectionsBasic = IntegrationWithConnections;

// Backward-compatible aliases for modules that still import *Dto names.
export type ImageTransformOptionsDto = ImageTransformOptions;
export type ImageRetryPresetDto = ImageRetryPreset;
export type TemplateMappingDto = TemplateMapping;
export type TemplateDto = Template;
export type BaseInventoryDto = BaseInventory;
export type FetchMarketplaceCategoriesRequestDto = FetchMarketplaceCategoriesRequest;
export type BulkCategoryMappingRequestDto = BulkCategoryMappingRequest;
export type BaseImportItemStatusDto = BaseImportItemStatus;
export type BaseImportModeDto = BaseImportMode;
export type BaseImportRunRecordDto = BaseImportRunRecord;
export type BaseImportStartResponseDto = BaseImportStartResponse;
export type BaseImportRunDetailResponseDto = BaseImportRunDetailResponse;
export type BaseImportParameterImportSettingsDto = BaseImportParameterImportSettings;
export type SessionCookieDto = SessionCookie;
export type ImageUrlDiagnosticDto = ImageUrlDiagnostic;
export type ImageExportDiagnosticsDto = ImageExportDiagnostics;
export type CapturedLogDto = CapturedLog;
export type IntegrationConnectionBasicDto = IntegrationConnectionBasic;
export type IntegrationWithConnectionsDto = IntegrationWithConnections;
export type ImportParameterCacheResponseDto = ImportParameterCacheResponse;
export type ProductListingExportEventDto = ProductListingExportEvent;
export type ListingAttemptDto = ListingAttempt;
