import { z } from 'zod';

/**
 * Marketplace sync DTOs
 */

export const TRADERA_CATEGORY_FETCH_METHODS = ['playwright', 'soap'] as const;
export type TraderaCategoryFetchMethod = (typeof TRADERA_CATEGORY_FETCH_METHODS)[number];

export const marketplaceConnectionRequestSchema = z.object({
  connectionId: z.string().trim().min(1),
  /** Tradera only: override which fetch method to use for category sync */
  categoryFetchMethod: z.enum(TRADERA_CATEGORY_FETCH_METHODS).optional(),
});

export type MarketplaceConnectionRequestDto = z.infer<typeof marketplaceConnectionRequestSchema>;
export type MarketplaceConnectionRequest = MarketplaceConnectionRequestDto;

export const marketplaceCategoryStatsSchema = z.object({
  rootCount: z.number().int().nonnegative(),
  withParentCount: z.number().int().nonnegative(),
  maxDepth: z.number().int().nonnegative(),
  depthHistogram: z.record(z.string(), z.number().int().nonnegative()),
});

export type MarketplaceCategoryStatsDto = z.infer<typeof marketplaceCategoryStatsSchema>;
export type MarketplaceCategoryStats = MarketplaceCategoryStatsDto;

export const marketplaceFetchResponseSchema = z.object({
  fetched: z.number().int().nonnegative(),
  total: z.number().int().nonnegative().optional(),
  message: z.string(),
  source: z.string().optional(),
  categoryStats: marketplaceCategoryStatsSchema.optional(),
});

export type MarketplaceFetchResponseDto = z.infer<typeof marketplaceFetchResponseSchema>;
export type MarketplaceFetchResponse = MarketplaceFetchResponseDto;

export const marketplaceBulkUpsertResponseSchema = z.object({
  success: z.boolean().optional(),
  upserted: z.number().int().nonnegative(),
  message: z.string(),
});

export type MarketplaceBulkUpsertResponseDto = z.infer<typeof marketplaceBulkUpsertResponseSchema>;
export type MarketplaceBulkUpsertResponse = MarketplaceBulkUpsertResponseDto;
