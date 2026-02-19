import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import { productParameterValueSchema } from './products';

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

export type ImageTransformOptionsDto = z.infer<typeof imageTransformOptionsSchema>;

export const imageBase64ModeSchema = z.enum(['base-only', 'full-data-uri']);
export type ImageBase64ModeDto = z.infer<typeof imageBase64ModeSchema>;

export const imageRetryPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string().optional(),
  description: z.string(),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']),
  transform: imageTransformOptionsSchema,
});

export type ImageRetryPresetDto = z.infer<typeof imageRetryPresetSchema>;

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
  baseApiToken: z.string().nullable().optional(),
  baseTokenUpdatedAt: z.string().nullable().optional(),
  baseLastInventoryId: z.string().nullable().optional(),
  traderaDefaultTemplateId: z.string().nullable().optional(),
  traderaDefaultDurationHours: z.number().optional(),
  traderaAutoRelistEnabled: z.boolean().optional(),
  traderaAutoRelistLeadMinutes: z.number().optional(),
  traderaApiAppId: z.number().nullable().optional(),
  traderaApiPublicKey: z.string().nullable().optional(),
  traderaApiUserId: z.number().nullable().optional(),
  traderaApiSandbox: z.boolean().optional(),
  hasTraderaApiAppKey: z.boolean().optional(),
  hasTraderaApiToken: z.boolean().optional(),
  traderaApiTokenUpdatedAt: z.string().nullable().optional(),
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
  expiresAt: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  relist: z.boolean().optional(),
  fields: z.array(z.string()).nullable().optional(),
  requestId: z.string().nullable().optional(),
});

export type ProductListingExportEventDto = z.infer<typeof productListingExportEventSchema>;

export const productListingRelistPolicySchema = z.object({
  enabled: z.boolean().optional(),
  leadMinutes: z.number().optional(),
  maxAttempts: z.number().optional(),
  durationHours: z.number().optional(),
  templateId: z.string().nullable().optional(),
});

export type ProductListingRelistPolicyDto = z.infer<typeof productListingRelistPolicySchema>;

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

export type ProductListingDto = z.infer<typeof productListingSchema>;

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

export type ProductListingWithDetailsDto = z.infer<typeof productListingWithDetailsSchema>;

export const createProductListingSchema = z.object({
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
});

export type CreateProductListingDto = z.infer<typeof createProductListingSchema>;

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

export type ExternalCategoryDto = z.infer<typeof externalCategorySchema>;

export interface ExternalCategoryWithChildrenDto extends ExternalCategoryDto {
  children: ExternalCategoryWithChildrenDto[];
}

export const externalCategoryWithChildrenSchema: z.ZodType<ExternalCategoryWithChildrenDto> = externalCategorySchema.extend({
  children: z.lazy(() => z.array(externalCategoryWithChildrenSchema)),
});

export const baseCategoryFromApiSchema = z.object({
  category_id: z.union([z.number(), z.string()]),
  name: z.string(),
  parent_id: z.union([z.number(), z.string()]).nullable(),
});

export type BaseCategoryFromApiDto = z.infer<typeof baseCategoryFromApiSchema>;

export const baseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
});

export type BaseCategoryDto = z.infer<typeof baseCategorySchema>;

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

export type ExternalCategorySyncInputDto = z.infer<typeof externalCategorySyncInputSchema>;

export const categoryMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalCategoryId: z.string(),
  internalCategoryId: z.string(),
  catalogId: z.string(),
});

export type CategoryMappingCreateInputDto = z.infer<typeof categoryMappingCreateInputSchema>;

export const categoryMappingUpdateInputSchema = z.object({
  internalCategoryId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CategoryMappingUpdateInputDto = z.infer<typeof categoryMappingUpdateInputSchema>;

export const categoryMappingWithDetailsSchema = categoryMappingSchema.extend({
  externalCategory: externalCategorySchema,
  internalCategory: z.any(), // ProductCategoryDto
});

export type CategoryMappingWithDetailsDto = z.infer<typeof categoryMappingWithDetailsSchema>;

export const externalTagSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  fetchedAt: z.string(),
});

export type ExternalTagDto = z.infer<typeof externalTagSchema>;

export const tagMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalTagId: z.string(),
  internalTagId: z.string(),
  isActive: z.boolean(),
});

export type TagMappingDto = z.infer<typeof tagMappingSchema>;

export const tagMappingWithDetailsSchema = tagMappingSchema.extend({
  externalTag: externalTagSchema,
  internalTag: z.any(), // ProductTagDto
});

export type TagMappingWithDetailsDto = z.infer<typeof tagMappingWithDetailsSchema>;

export const baseTagSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type BaseTagDto = z.infer<typeof baseTagSchema>;

export const externalTagSyncInputSchema = z.object({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ExternalTagSyncInputDto = z.infer<typeof externalTagSyncInputSchema>;

export const tagMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalTagId: z.string(),
  internalTagId: z.string(),
});

export type TagMappingCreateInputDto = z.infer<typeof tagMappingCreateInputSchema>;

export const tagMappingUpdateInputSchema = z.object({
  externalTagId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type TagMappingUpdateInputDto = z.infer<typeof tagMappingUpdateInputSchema>;

export const externalProducerSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  fetchedAt: z.string(),
});

export type ExternalProducerDto = z.infer<typeof externalProducerSchema>;

export const producerMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalProducerId: z.string(),
  internalProducerId: z.string(),
  isActive: z.boolean(),
});

export type ProducerMappingDto = z.infer<typeof producerMappingSchema>;

export const producerMappingWithDetailsSchema = producerMappingSchema.extend({
  externalProducer: externalProducerSchema,
  internalProducer: z.any(), // ProducerDto
});

export type ProducerMappingWithDetailsDto = z.infer<typeof producerMappingWithDetailsSchema>;

export const baseProducerFromApiSchema = z.object({
  manufacturer_id: z.union([z.number(), z.string()]).optional(),
  producer_id: z.union([z.number(), z.string()]).optional(),
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().optional(),
});

export type BaseProducerFromApiDto = z.infer<typeof baseProducerFromApiSchema>;

export const baseProducerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type BaseProducerDto = z.infer<typeof baseProducerSchema>;

export const externalProducerSyncInputSchema = z.object({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ExternalProducerSyncInputDto = z.infer<typeof externalProducerSyncInputSchema>;

export const producerMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalProducerId: z.string(),
  internalProducerId: z.string(),
});

export type ProducerMappingCreateInputDto = z.infer<typeof producerMappingCreateInputSchema>;

export const producerMappingUpdateInputSchema = z.object({
  externalProducerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type ProducerMappingUpdateInputDto = z.infer<typeof producerMappingUpdateInputSchema>;

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
  id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
});

export type BaseInventoryDto = z.infer<typeof baseInventorySchema>;

export const baseWarehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_default: z.boolean(),
});

export type BaseWarehouseDto = z.infer<typeof baseWarehouseSchema>;

export const fetchMarketplaceCategoriesRequestSchema = z.object({
  connectionId: z.string(),
});

export type FetchMarketplaceCategoriesRequestDto = z.infer<typeof fetchMarketplaceCategoriesRequestSchema>;

export const bulkCategoryMappingRequestSchema = z.object({
  connectionId: z.string(),
  catalogId: z.string(),
  mappings: z.array(z.object({
    externalCategoryId: z.string(),
    internalCategoryId: z.string().nullable(),
  })),
});

export type BulkCategoryMappingRequestDto = z.infer<typeof bulkCategoryMappingRequestSchema>;

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
export type BaseImportRunStatusDto = z.infer<typeof baseImportRunStatusSchema>;

export const baseImportItemStatusSchema = z.enum([
  'pending',
  'processing',
  'imported',
  'updated',
  'skipped',
  'failed',
]);
export type BaseImportItemStatusDto = z.infer<typeof baseImportItemStatusSchema>;

export const baseImportItemActionSchema = z.enum([
  'pending',
  'processing',
  'imported',
  'updated',
  'skipped',
  'failed',
  'dry_run',
]);
export type BaseImportItemActionDto = z.infer<typeof baseImportItemActionSchema>;

export const baseImportModeSchema = z.enum([
  'create_only',
  'upsert_on_base_id',
  'upsert_on_sku',
]);
export type BaseImportModeDto = z.infer<typeof baseImportModeSchema>;

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
export type BaseImportErrorCodeDto = z.infer<typeof baseImportErrorCodeSchema>;

export const baseImportErrorClassSchema = z.enum([
  'transient',
  'permanent',
  'configuration',
  'canceled',
]);
export type BaseImportErrorClassDto = z.infer<typeof baseImportErrorClassSchema>;

export const baseImportParameterImportSummarySchema = z.object({
  extracted: z.number(),
  resolved: z.number(),
  created: z.number(),
  written: z.number(),
});
export type BaseImportParameterImportSummaryDto = z.infer<typeof baseImportParameterImportSummarySchema>;

export const baseImportRunParameterImportSummarySchema = baseImportParameterImportSummarySchema.extend({
  itemsApplied: z.number(),
});
export type BaseImportRunParameterImportSummaryDto = z.infer<typeof baseImportRunParameterImportSummarySchema>;

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
export type BaseImportRunStatsDto = z.infer<typeof baseImportRunStatsSchema>;

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
export type BaseImportRunParamsDto = z.infer<typeof baseImportRunParamsSchema>;

export const baseImportPreflightIssueSchema = z.object({
  code: baseImportErrorCodeSchema,
  message: z.string(),
  severity: z.enum(['error', 'warning']),
});
export type BaseImportPreflightIssueDto = z.infer<typeof baseImportPreflightIssueSchema>;

export const baseImportPreflightSchema = z.object({
  ok: z.boolean(),
  issues: z.array(baseImportPreflightIssueSchema),
  checkedAt: z.string(),
});
export type BaseImportPreflightDto = z.infer<typeof baseImportPreflightSchema>;

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
export type BaseImportRunRecordDto = z.infer<typeof baseImportRunRecordSchema>;

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
export type BaseImportItemRecordDto = z.infer<typeof baseImportItemRecordSchema>;

export const baseImportStartResponseSchema = z.object({
  runId: z.string(),
  status: baseImportRunStatusSchema,
  preflight: baseImportPreflightSchema,
  queueJobId: z.string().nullable().optional(),
  summaryMessage: z.string().nullable().optional(),
});
export type BaseImportStartResponseDto = z.infer<typeof baseImportStartResponseSchema>;

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
export type BaseImportRunDetailResponseDto = z.infer<typeof baseImportRunDetailResponseSchema>;

/**
 * Base.com Parameter Import DTOs
 */

export const extractedBaseParameterSchema = z.object({
  key: z.string(),
  baseParameterId: z.string().nullable(),
  namesByLanguage: z.record(z.string(), z.string()),
  valuesByLanguage: z.record(z.string(), z.string()),
});

export type ExtractedBaseParameterDto = z.infer<typeof extractedBaseParameterSchema>;

export const baseParameterImportSummarySchema = z.object({
  extracted: z.number(),
  resolved: z.number(),
  created: z.number(),
  written: z.number(),
});

export type BaseParameterImportSummaryDto = z.infer<typeof baseParameterImportSummarySchema>;

/**
 * Base.com Parameter Import Settings DTOs
 */

export const baseImportParameterImportModeSchema = z.enum(['all', 'mapped']);
export type BaseImportParameterImportModeDto = z.infer<typeof baseImportParameterImportModeSchema>;

export const baseImportParameterLanguageScopeSchema = z.enum(['catalog_languages', 'default_only']);
export type BaseImportParameterLanguageScopeDto = z.infer<typeof baseImportParameterLanguageScopeSchema>;

export const baseImportParameterMatchBySchema = z.enum(['base_id_then_name', 'name_only']);
export type BaseImportParameterMatchByDto = z.infer<typeof baseImportParameterMatchBySchema>;

export const baseImportParameterImportSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: baseImportParameterImportModeSchema,
  languageScope: baseImportParameterLanguageScopeSchema,
  createMissingParameters: z.boolean(),
  overwriteExistingValues: z.boolean(),
  matchBy: baseImportParameterMatchBySchema,
});

export type BaseImportParameterImportSettingsDto = z.infer<typeof baseImportParameterImportSettingsSchema>;

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

export type ApplyBaseParameterImportInputDto = z.infer<typeof applyBaseParameterImportInputSchema>;

export const applyBaseParameterImportResultSchema = z.object({
  applied: z.boolean(),
  parameters: z.array(productParameterValueSchema),
  summary: baseParameterImportSummarySchema,
});

export type ApplyBaseParameterImportResultDto = z.infer<typeof applyBaseParameterImportResultSchema>;

/**
 * Integration Test DTOs
 */

export const testStatusSchema = z.enum(['pending', 'ok', 'failed']);
export type TestStatusDto = z.infer<typeof testStatusSchema>;

export const testLogEntrySchema = z.object({
  step: z.string(),
  status: testStatusSchema,
  timestamp: z.string(),
  detail: z.string().optional(),
});

export type TestLogEntryDto = z.infer<typeof testLogEntrySchema>;

export const testConnectionResponseSchema = z.object({
  error: z.string().optional(),
  errorId: z.string().optional(),
  integrationId: z.string().nullable().optional(),
  connectionId: z.string().nullable().optional(),
  steps: z.unknown().optional(),
  profile: z.unknown().optional(),
});

export type TestConnectionResponseDto = z.infer<typeof testConnectionResponseSchema>;

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

export type SessionCookieDto = z.infer<typeof sessionCookieSchema>;

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

export type ImageUrlDiagnosticDto = z.infer<typeof imageUrlDiagnosticSchema>;

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

export type ImageExportDiagnosticsDto = z.infer<typeof imageExportDiagnosticsSchema>;

/**
 * Operation Logging DTOs
 */

export const capturedLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CapturedLogDto = z.infer<typeof capturedLogSchema>;

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

export type IntegrationConnectionBasicDto = z.infer<typeof integrationConnectionBasicSchema>;

export const integrationWithConnectionsSchema = namedDtoSchema.extend({
  slug: z.string(),
  connections: z.array(integrationConnectionBasicSchema),
});

export type IntegrationWithConnectionsDto = z.infer<typeof integrationWithConnectionsSchema>;

export const listingJobSchema = productListingSchema.extend({
  integrationName: z.string(),
  integrationSlug: z.string(),
  connectionName: z.string(),
});

export type ListingJobDto = z.infer<typeof listingJobSchema>;

export const productJobSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string().nullable(),
  listings: z.array(listingJobSchema),
});

export type ProductJobDto = z.infer<typeof productJobSchema>;

export const exportJobDetailSchema = z.object({
  job: productJobSchema,
  listing: listingJobSchema,
});

export type ExportJobDetailDto = z.infer<typeof exportJobDetailSchema>;

/**
 * Base.com API DTOs
 */

export const baseProductRecordSchema = z.record(z.string(), z.unknown());
export type BaseProductRecordDto = z.infer<typeof baseProductRecordSchema>;

export const baseApiRawResultSchema = z.object({
  status: z.string(),
}).catchall(z.unknown());

export type BaseApiRawResultDto = z.infer<typeof baseApiRawResultSchema>;

export const importParameterCacheSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  expiresAt: z.number(),
});

export type ImportParameterCacheDto = z.infer<typeof importParameterCacheSchema>;

export const baseApiResponseSchema = z.object({
  status: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
}).catchall(z.unknown());

export type BaseApiResponseDto = z.infer<typeof baseApiResponseSchema>;

export const priceGroupLookupSchema = z.object({
  id: z.string(),
  groupId: z.string().nullable().optional(),
  currencyId: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type PriceGroupLookupDto = z.infer<typeof priceGroupLookupSchema>;

export const baseConnectionContextSchema = z.object({
  baseIntegrationId: z.string().nullable(),
  connectionId: z.string().nullable(),
  token: z.string().nullable(),
  issue: baseImportPreflightIssueSchema.nullable(),
});

export type BaseConnectionContextDto = z.infer<typeof baseConnectionContextSchema>;

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

export type TraderaApiCredentialsDto = z.infer<typeof traderaApiCredentialsSchema>;

export const traderaApiUserInfoSchema = z.object({
  userId: z.number(),
  alias: z.string().nullable(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export type TraderaApiUserInfoDto = z.infer<typeof traderaApiUserInfoSchema>;

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

export type TraderaAddShopItemInputDto = z.infer<typeof traderaAddShopItemInputSchema>;

export const traderaAddShopItemResultSchema = z.object({
  itemId: z.number(),
  requestId: z.number().nullable(),
  resultCode: z.string().nullable(),
  resultMessage: z.string().nullable(),
});

export type TraderaAddShopItemResultDto = z.infer<typeof traderaAddShopItemResultSchema>;
