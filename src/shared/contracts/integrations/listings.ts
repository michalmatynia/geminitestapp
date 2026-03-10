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

export const productListingRelistVariablesSchema = productListingActionSchema;

export type ProductListingRelistVariables = z.infer<typeof productListingRelistVariablesSchema>;

export const productListingRelistResponseSchema = z.object({
  queued: z.boolean(),
  alreadyQueued: z.boolean().optional(),
  listingId: z.string(),
  status: z.string().optional(),
  queue: productListingQueueJobSchema.optional(),
});

export type ProductListingRelistResponse = z.infer<typeof productListingRelistResponseSchema>;

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

/**
 * Product Listing Badges DTOs
 */

export type MarketplaceBadgeEntry = {
  base?: string;
  tradera?: string;
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
