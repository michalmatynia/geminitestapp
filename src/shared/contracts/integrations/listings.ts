import { z } from 'zod';

import { dtoBaseSchema, type IdNameDto } from '../base';
import {
  productCategorySchema,
  productTagSchema,
} from '../products';
import { type RecursiveTreeNode } from '../tree';

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

export type ProductListingExportEvent = z.infer<typeof productListingExportEventSchema>;

export type ListingAttempt = ProductListingExportEvent;

export const productListingRelistPolicySchema = z.object({
  enabled: z.boolean().optional(),
  leadMinutes: z.number().optional(),
  maxAttempts: z.number().optional(),
  durationHours: z.number().optional(),
  templateId: z.string().nullable().optional(),
});

export type ProductListingRelistPolicy = z.infer<typeof productListingRelistPolicySchema>;

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

export type ProductListing = z.infer<typeof productListingSchema>;

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

export type ProductListingWithDetails = z.infer<typeof productListingWithDetailsSchema>;

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

export const productListingActionSchema = z.object({
  listingId: z.string().trim().min(1),
});

export type ProductListingAction = z.infer<typeof productListingActionSchema>;

export const playwrightRelistBrowserModeSchema = z.enum([
  'connection_default',
  'headless',
  'headed',
]);

export type PlaywrightRelistBrowserMode = z.infer<typeof playwrightRelistBrowserModeSchema>;

export const productListingCreatePayloadSchema = z.object({
  integrationId: z.string().trim().min(1),
  connectionId: z.string().trim().min(1),
  durationHours: z.number().int().min(1).max(720).optional(),
  autoRelistEnabled: z.boolean().optional(),
  autoRelistLeadMinutes: z.number().int().min(0).max(10080).optional(),
  templateId: z.string().trim().nullable().optional(),
});

export type ProductListingCreatePayload = z.infer<typeof productListingCreatePayloadSchema>;

export const productListingCreateVariablesSchema = productListingCreatePayloadSchema.extend({
  productId: z.string().trim().min(1),
});

export type ProductListingCreateVariables = z.infer<typeof productListingCreateVariablesSchema>;

export const productListingQueueJobSchema = z.object({
  name: z.string(),
  jobId: z.string(),
  enqueuedAt: z.string(),
});

export type ProductListingQueueJob = z.infer<typeof productListingQueueJobSchema>;

export const productListingCreateResponseSchema = productListingWithDetailsSchema.extend({
  queued: z.boolean().optional(),
  queue: productListingQueueJobSchema.optional(),
});

export type ProductListingCreateResponse = z.infer<typeof productListingCreateResponseSchema>;

export const productListingInventoryUpdatePayloadSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable(),
});

export type ProductListingInventoryUpdatePayload = z.infer<
  typeof productListingInventoryUpdatePayloadSchema
>;

export const productListingInventoryUpdateVariablesSchema = productListingActionSchema.extend({
  inventoryId: z.string().trim().min(1),
});

export type ProductListingInventoryUpdateVariables = z.infer<
  typeof productListingInventoryUpdateVariablesSchema
>;

export const productListingUpdateResponseSchema = z.object({
  success: z.literal(true),
});

export type ProductListingUpdateResponse = z.infer<typeof productListingUpdateResponseSchema>;

export const productListingDeleteFromBasePayloadSchema = z.object({
  inventoryId: z.string().trim().min(1).optional(),
});

export type ProductListingDeleteFromBasePayload = z.infer<
  typeof productListingDeleteFromBasePayloadSchema
>;

export const productListingDeleteFromBaseVariablesSchema = productListingActionSchema.extend({
  inventoryId: z.string().trim().min(1).optional(),
});

export type ProductListingDeleteFromBaseVariables = z.infer<
  typeof productListingDeleteFromBaseVariablesSchema
>;

export const productListingDeleteFromBaseResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
  runId: z.string().nullable(),
});

export type ProductListingDeleteFromBaseResponse = z.infer<
  typeof productListingDeleteFromBaseResponseSchema
>;

export const productListingSyncBaseImagesPayloadSchema = z.object({
  inventoryId: z.string().trim().min(1).optional(),
});

export type ProductListingSyncBaseImagesPayload = z.infer<
  typeof productListingSyncBaseImagesPayloadSchema
>;

export const productListingSyncBaseImagesVariablesSchema = productListingActionSchema.extend({
  inventoryId: z.string().trim().min(1).optional(),
});

export type ProductListingSyncBaseImagesVariables = z.infer<
  typeof productListingSyncBaseImagesVariablesSchema
>;

export const productListingSyncBaseImagesResponseSchema = z.object({
  status: z.literal('synced'),
  count: z.number().int().nonnegative(),
  added: z.number().int().nonnegative(),
});

export type ProductListingSyncBaseImagesResponse = z.infer<
  typeof productListingSyncBaseImagesResponseSchema
>;

export const productListingRelistPayloadSchema = z.object({
  browserMode: playwrightRelistBrowserModeSchema.optional(),
});

export type ProductListingRelistPayload = z.infer<typeof productListingRelistPayloadSchema>;

export const productListingRelistVariablesSchema = productListingActionSchema.extend({
  browserMode: playwrightRelistBrowserModeSchema.optional(),
});

export type ProductListingRelistVariables = z.infer<typeof productListingRelistVariablesSchema>;

export const productListingRelistResponseSchema = z.object({
  queued: z.boolean(),
  alreadyQueued: z.boolean().optional(),
  listingId: z.string(),
  status: z.string().optional(),
  queue: productListingQueueJobSchema.optional(),
});

export type ProductListingRelistResponse = z.infer<typeof productListingRelistResponseSchema>;

export const productListingSyncPayloadSchema = z.object({
  browserMode: playwrightRelistBrowserModeSchema.optional(),
  skipImages: z.boolean().optional(),
});

export type ProductListingSyncPayload = z.infer<typeof productListingSyncPayloadSchema>;

export const productListingSyncVariablesSchema = productListingActionSchema.extend({
  browserMode: playwrightRelistBrowserModeSchema.optional(),
  skipImages: z.boolean().optional(),
});

export type ProductListingSyncVariables = z.infer<typeof productListingSyncVariablesSchema>;

export const productListingSyncResponseSchema = z.object({
  queued: z.boolean(),
  alreadyQueued: z.boolean().optional(),
  listingId: z.string(),
  status: z.string().optional(),
  queue: productListingQueueJobSchema.optional(),
});

export type ProductListingSyncResponse = z.infer<typeof productListingSyncResponseSchema>;

export const traderaExecutionStepStatusSchema = z.enum([
  'pending',
  'running',
  'success',
  'error',
  'skipped',
]);

export type TraderaExecutionStepStatus = z.infer<typeof traderaExecutionStepStatusSchema>;

export const traderaExecutionStepSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  status: traderaExecutionStepStatusSchema,
  message: z.string().nullable().optional(),
});

export type TraderaExecutionStep = z.infer<typeof traderaExecutionStepSchema>;

export const traderaListingStatusCheckBatchPayloadSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1).max(250),
});

export type TraderaListingStatusCheckBatchPayload = z.infer<
  typeof traderaListingStatusCheckBatchPayloadSchema
>;

export const traderaListingStatusCheckBatchItemStatusSchema = z.enum([
  'queued',
  'already_queued',
  'skipped',
  'error',
]);

export type TraderaListingStatusCheckBatchItemStatus = z.infer<
  typeof traderaListingStatusCheckBatchItemStatusSchema
>;

export const traderaListingStatusCheckBatchItemSchema = z.object({
  productId: z.string(),
  listingId: z.string().nullable(),
  status: traderaListingStatusCheckBatchItemStatusSchema,
  message: z.string().nullable().optional(),
  queue: productListingQueueJobSchema.optional(),
});

export type TraderaListingStatusCheckBatchItem = z.infer<
  typeof traderaListingStatusCheckBatchItemSchema
>;

export const traderaListingStatusCheckBatchResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  queued: z.number().int().nonnegative(),
  alreadyQueued: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  results: z.array(traderaListingStatusCheckBatchItemSchema),
});

export type TraderaListingStatusCheckBatchResponse = z.infer<
  typeof traderaListingStatusCheckBatchResponseSchema
>;

export const baseProductSkuCheckPayloadSchema = z.object({
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
});

export type BaseProductSkuCheckPayload = z.infer<typeof baseProductSkuCheckPayloadSchema>;

export const baseProductSkuCheckResponseSchema = z.object({
  sku: z.string().optional(),
  exists: z.boolean().optional(),
  existingProductId: z.string().nullable().optional(),
});

export type BaseProductSkuCheckResponse = z.infer<typeof baseProductSkuCheckResponseSchema>;

export const baseProductLinkExistingPayloadSchema = baseProductSkuCheckPayloadSchema.extend({
  externalListingId: z.string().trim().min(1),
});

export type BaseProductLinkExistingPayload = z.infer<typeof baseProductLinkExistingPayloadSchema>;

export const baseProductLinkExistingResponseSchema = z.object({
  linked: z.literal(true),
  listingId: z.string(),
  externalListingId: z.string(),
});

export type BaseProductLinkExistingResponse = z.infer<
  typeof baseProductLinkExistingResponseSchema
>;

export const traderaProductLinkExistingPayloadSchema = z.object({
  listingUrl: z.string().trim().min(1),
  connectionId: z.string().trim().min(1).optional(),
});

export type TraderaProductLinkExistingPayload = z.infer<
  typeof traderaProductLinkExistingPayloadSchema
>;

export const traderaProductLinkExistingInferenceMethodSchema = z.enum([
  'provided',
  'seller_alias',
  'preferred_default',
  'sole_connection',
]);

export type TraderaProductLinkExistingInferenceMethod = z.infer<
  typeof traderaProductLinkExistingInferenceMethodSchema
>;

export const traderaProductLinkExistingCandidateSchema = z.object({
  integrationId: z.string().trim().min(1),
  integrationName: z.string().trim().min(1),
  integrationSlug: z.string().trim().min(1),
  connectionId: z.string().trim().min(1),
  connectionName: z.string().trim().min(1),
  connectionUsername: z.string().trim().nullable(),
});

export type TraderaProductLinkExistingCandidate = z.infer<
  typeof traderaProductLinkExistingCandidateSchema
>;

export const traderaProductLinkExistingResponseSchema = z.object({
  linked: z.literal(true),
  listingId: z.string().trim().min(1),
  connectionId: z.string().trim().min(1),
  integrationId: z.string().trim().min(1),
  externalListingId: z.string().trim().min(1),
  listingUrl: z.string().trim().min(1),
  inferenceMethod: traderaProductLinkExistingInferenceMethodSchema,
});

export type TraderaProductLinkExistingResponse = z.infer<
  typeof traderaProductLinkExistingResponseSchema
>;

/**
 * Product Listing Badges DTOs
 */

export type MarketplaceBadgeEntry = {
  base?: string;
  tradera?: string;
  vinted?: string;
  playwrightProgrammable?: string;
};

export type ListingBadgesPayload = Record<string, MarketplaceBadgeEntry>;

/**
 * Category Mapping DTOs
 */

export const categoryMappingSchema = dtoBaseSchema.extend({
  connectionId: z.string(),
  externalCategoryId: z.string(),
  internalCategoryId: z.string().nullable(),
  catalogId: z.string(),
  isActive: z.boolean(),
});

export type CategoryMapping = z.infer<typeof categoryMappingSchema>;

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

export type ExternalCategory = z.infer<typeof externalCategorySchema>;

export type ExternalCategoryWithChildren = RecursiveTreeNode<ExternalCategory>;

export const externalCategoryWithChildrenSchema: z.ZodType<ExternalCategoryWithChildren> =
  externalCategorySchema.extend({
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
  metadata: z.record(z.string(), z.unknown()).optional(),
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

export type ExternalCategorySyncInput = z.infer<typeof externalCategorySyncInputSchema>;

export const categoryMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalCategoryId: z.string(),
  internalCategoryId: z.string().nullable(),
  catalogId: z.string(),
});

export type CategoryMappingCreateInput = z.infer<typeof categoryMappingCreateInputSchema>;

export const categoryMappingUpdateInputSchema = z.object({
  internalCategoryId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CategoryMappingUpdateInput = z.infer<typeof categoryMappingUpdateInputSchema>;

export const categoryMappingWithDetailsSchema = categoryMappingSchema.extend({
  externalCategory: externalCategorySchema,
  internalCategory: productCategorySchema.nullable(),
});

export type CategoryMappingWithDetails = z.infer<typeof categoryMappingWithDetailsSchema>;

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

export type TagMapping = z.infer<typeof tagMappingSchema>;

export const tagMappingWithDetailsSchema = tagMappingSchema.extend({
  externalTag: externalTagSchema,
  internalTag: productTagSchema.nullable(),
});

export type TagMappingWithDetails = z.infer<typeof tagMappingWithDetailsSchema>;

export type { IdNameDto as BaseTag };

export const externalTagSyncInputSchema = z.object({
  connectionId: z.string(),
  externalId: z.string(),
  name: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ExternalTagSyncInput = z.infer<typeof externalTagSyncInputSchema>;

export const tagMappingCreateInputSchema = z.object({
  connectionId: z.string(),
  externalTagId: z.string(),
  internalTagId: z.string(),
});

export type TagMappingCreateInput = z.infer<typeof tagMappingCreateInputSchema>;

export const tagMappingUpdateInputSchema = z.object({
  externalTagId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type TagMappingUpdateInput = z.infer<typeof tagMappingUpdateInputSchema>;

export const tagMappingAssignmentSchema = z.object({
  internalTagId: z.string().trim().min(1),
  externalTagId: z.string().trim().min(1).nullable(),
});

export type TagMappingAssignment = z.infer<typeof tagMappingAssignmentSchema>;

export const bulkTagMappingItemSchema = tagMappingAssignmentSchema;

export type BulkTagMappingItem = TagMappingAssignment;

export const bulkTagMappingRequestSchema = z.object({
  connectionId: z.string().trim().min(1),
  mappings: z.array(tagMappingAssignmentSchema).min(1),
});

export type BulkTagMappingRequest = z.infer<typeof bulkTagMappingRequestSchema>;

/**
 * Product Listings Recovery DTOs
 */

export type ProductListingsRecoveryContext =
  | {
    source: 'base_quick_export_failed';
    integrationSlug: 'baselinker';
    status: string;
    runId: string | null;
    requestId?: string | null | undefined;
    integrationId?: string | null | undefined;
    connectionId?: string | null | undefined;
  }
  | {
    source: 'tradera_quick_export_failed' | 'tradera_quick_export_auth_required';
    integrationSlug: 'tradera';
    status: string;
    runId: string | null;
    failureReason?: string | null | undefined;
    requestId?: string | null | undefined;
    integrationId?: string | null | undefined;
    connectionId?: string | null | undefined;
  }
  | {
    source: 'vinted_quick_export_failed' | 'vinted_quick_export_auth_required';
    integrationSlug: 'vinted';
    status: string;
    runId: string | null;
    failureReason?: string | null | undefined;
    requestId?: string | null | undefined;
    integrationId?: string | null | undefined;
    connectionId?: string | null | undefined;
  };

/**
 * Browser-based listing execution result
 */
export const browserListingResultSchema = z.object({
  externalListingId: z.string().nullable(),
  listingUrl: z.string().optional(),
  completedAt: z.string().optional(),
  simulated: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BrowserListingResultDto = z.infer<typeof browserListingResultSchema>;
export type BrowserListingResult = BrowserListingResultDto;

/**
 * Quick export feedback tracking
 */
export type QuickExportFeedbackStatus =
  | 'processing'
  | 'queued'
  | 'completed'
  | 'failed'
  | 'auth_required';

export type QuickExportFeedbackOptionsDto = {
  runId?: string | null | undefined;
  requestId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  failureReason?: string | null | undefined;
  listingId?: string | null | undefined;
  listingUrl?: string | null | undefined;
  externalListingId?: string | null | undefined;
  completedAt?: number | null | undefined;
  duplicateLinked?: boolean | null | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type QuickExportFeedbackOptions = QuickExportFeedbackOptionsDto;

export type PersistedQuickExportFeedbackDto = QuickExportFeedbackOptionsDto & {
  productId: string;
  status: QuickExportFeedbackStatus;
  expiresAt: number;
};

export type PersistedQuickExportFeedback = PersistedQuickExportFeedbackDto;

/**
 * Canonical product image entry for listing
 */
export type CanonicalProductImageEntryDto = {
  imageUrls: string[];
  localCandidates: string[];
};

export type CanonicalProductImageEntry = CanonicalProductImageEntryDto;
