import { z } from 'zod';
import { dtoBaseSchema } from '../base';
import {
  productCategorySchema,
  productTagSchema,
  type ProductCategory,
  type ProductTag,
} from '../products';

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
  updatedAt: string | null;
}

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
  internalCategory: productCategorySchema.nullable(),
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
  internalTag: productTagSchema.nullable(),
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
