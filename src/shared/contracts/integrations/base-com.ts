import { z } from 'zod';

import { marketplaceConnectionRequestSchema } from './marketplace';

import type { ImageTransformOptions, ImageBase64Mode, CapturedLog } from './base';
import type { TemplateMapping as BaseFieldMapping } from './templates';

/**
 * Base.com Metadata DTOs
 */

export type { BaseFieldMapping };

export type BaseExportProductLike = {
  id: string;
  sku?: string | null;
  categoryId?: string | null;
  producers?: Array<{
    id?: string;
    producerId?: string;
    producer_id?: string;
    manufacturerId?: string;
    [key: string]: unknown;
  }>;
  tags?: Array<{ tagId?: string; id?: string }>;
  catalogs?: Array<{ catalogId: string; [key: string]: unknown }>;
  parameters?: Array<{ name?: string; id?: string; value?: unknown }>;
  [key: string]: unknown;
};

export const baseExportRequestSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(),
  exportImagesAsBase64: z.boolean().optional(),
  imageBase64Mode: z.enum(['base-only', 'full-data-uri']).optional(),
  imagesOnly: z.boolean().optional(),
  listingId: z.string().optional(),
  externalListingId: z.string().optional(),
  imageTransform: z
    .object({
      forceJpeg: z.boolean().optional(),
      maxDimension: z.number().int().positive().optional(),
      jpegQuality: z.number().int().min(10).max(100).optional(),
    })
    .optional(),
});

export type BaseExportRequestData = z.infer<typeof baseExportRequestSchema>;

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

export const fetchMarketplaceCategoriesRequestSchema = marketplaceConnectionRequestSchema;

export type FetchMarketplaceCategoriesRequest = z.infer<
  typeof fetchMarketplaceCategoriesRequestSchema
>;

export const categoryMappingAssignmentSchema = z.object({
  externalCategoryId: z.string().trim().min(1),
  internalCategoryId: z.string().trim().min(1).nullable(),
});

export type CategoryMappingAssignment = z.infer<typeof categoryMappingAssignmentSchema>;

export const bulkCategoryMappingRequestSchema = z.object({
  connectionId: z.string().trim().min(1),
  catalogId: z.string().trim().min(1),
  mappings: z.array(categoryMappingAssignmentSchema).min(1),
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

export const baseImportModeSchema = z.enum(['create_only', 'upsert_on_base_id', 'upsert_on_sku']);
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
export type BaseImportParameterImportSummary = z.infer<
  typeof baseImportParameterImportSummarySchema
>;

export const baseImportRunParameterImportSummarySchema =
  baseImportParameterImportSummarySchema.extend({
    itemsApplied: z.number(),
  });
export type BaseImportRunParameterImportSummary = z.infer<
  typeof baseImportRunParameterImportSummarySchema
>;

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
  connectionId: z.string().trim().min(1),
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

export const baseImportRunStartPayloadSchema = z.object({
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
  catalogId: z.string().trim().min(1),
  templateId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
  imageMode: z.enum(['links', 'download']).default('links'),
  uniqueOnly: z.boolean().default(true),
  allowDuplicateSku: z.boolean().default(false),
  selectedIds: z.array(z.string().trim().min(1)).optional(),
  dryRun: z.boolean().optional(),
  mode: baseImportModeSchema.optional(),
  requestId: z.string().trim().min(1).optional(),
});
export type BaseImportRunStartPayload = z.infer<typeof baseImportRunStartPayloadSchema>;

export const baseImportRunsListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type BaseImportRunsListQuery = z.infer<typeof baseImportRunsListQuerySchema>;

export type ExportToBaseVariables = {
  connectionId: string;
  inventoryId: string;
  templateId?: string;
  imageBase64Mode?: ImageBase64Mode;
  imageTransform?: ImageTransformOptions | null;
  // For images only export
  imagesOnly?: boolean;
  listingId?: string;
  externalListingId?: string;
  exportImagesAsBase64?: boolean;
  allowDuplicateSku?: boolean;
  requestId?: string;
};

export type ExportResponse = {
  logs?: CapturedLog[];
  error?: string;
  skuExists?: boolean;
  runId?: string | null;
  status?: 'queued' | 'completed' | 'failed' | undefined;
  jobId?: string | null | undefined;
};

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
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  errorCode: baseImportErrorCodeSchema.nullable().optional(),
  errorClass: baseImportErrorClassSchema.nullable().optional(),
  stats: baseImportRunStatsSchema.optional(),
  preflight: baseImportPreflightSchema.nullable().optional(),
  summaryMessage: z.string().nullable().optional(),
  maxAttempts: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BaseImportRunRecord = z.infer<typeof baseImportRunRecordSchema>;

export const baseImportRunItemRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  externalId: z.string(),
  itemId: z.string(),
  baseProductId: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  status: baseImportItemStatusSchema,
  action: baseImportItemActionSchema.nullable().optional(),
  productId: z.string().nullable().optional(),
  importedProductId: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  errorCode: baseImportErrorCodeSchema.nullable().optional(),
  errorClass: baseImportErrorClassSchema.nullable().optional(),
  parameterImportSummary: baseImportParameterImportSummarySchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  payloadSnapshot: z.unknown().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  attempt: z.number(),
  idempotencyKey: z.string().optional(),
  retryable: z.boolean().nullable().optional(),
  nextRetryAt: z.string().nullable().optional(),
  lastErrorAt: z.string().nullable().optional(),
});
export type BaseImportRunItemRecord = z.infer<typeof baseImportRunItemRecordSchema>;
export type BaseImportItemRecord = BaseImportRunItemRecord;

export const baseImportStartResponseSchema = z.object({
  runId: z.string(),
  status: baseImportRunStatusSchema,
  preflight: baseImportPreflightSchema.nullable().optional(),
  queueJobId: z.string().nullable(),
  summaryMessage: z.string().nullable(),
});
export type BaseImportStartResponse = z.infer<typeof baseImportStartResponseSchema>;

export const baseImportRunsResponseSchema = z.object({
  runs: z.array(baseImportRunRecordSchema),
});
export type BaseImportRunsResponse = z.infer<typeof baseImportRunsResponseSchema>;

export const baseImportRunDetailPaginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});
export type BaseImportRunDetailPagination = z.infer<typeof baseImportRunDetailPaginationSchema>;

export const baseImportRunDetailResponseSchema = z.object({
  run: baseImportRunRecordSchema,
  items: z.array(baseImportRunItemRecordSchema),
  pagination: baseImportRunDetailPaginationSchema,
});
export type BaseImportRunDetailResponse = z.infer<typeof baseImportRunDetailResponseSchema>;

export const baseImportRunDetailQuerySchema = z.object({
  statuses: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(1000).optional(),
  includeItems: z.enum(['true', 'false']).optional(),
});
export type BaseImportRunDetailQuery = z.infer<typeof baseImportRunDetailQuerySchema>;

export const baseImportRunResumePayloadSchema = z.object({
  statuses: z
    .array(z.enum(['pending', 'processing', 'imported', 'updated', 'skipped', 'failed']))
    .optional(),
});
export type BaseImportRunResumePayload = z.infer<typeof baseImportRunResumePayloadSchema>;

export const baseImportRunReportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).optional(),
  statuses: z.string().trim().optional(),
});
export type BaseImportRunReportQuery = z.infer<typeof baseImportRunReportQuerySchema>;

export const baseImportRunReportResponseSchema = baseImportRunDetailResponseSchema.extend({
  generatedAt: z.string(),
});
export type BaseImportRunReportResponse = z.infer<typeof baseImportRunReportResponseSchema>;

export const importParameterCacheResponseSchema = z.object({
  inventoryId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  keys: z.array(z.string()).optional(),
  values: z.record(z.string(), z.string()).optional(),
  updatedAt: z.string().optional(),
});

export type ImportParameterCacheResponse = z.infer<typeof importParameterCacheResponseSchema>;
