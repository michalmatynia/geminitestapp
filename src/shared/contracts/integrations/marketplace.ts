import { z } from 'zod';

/**
 * Marketplace sync DTOs
 */

export const marketplaceConnectionRequestSchema = z.object({
  connectionId: z.string().trim().min(1),
});

export type MarketplaceConnectionRequestDto = z.infer<typeof marketplaceConnectionRequestSchema>;
export type MarketplaceConnectionRequest = MarketplaceConnectionRequestDto;

export const marketplaceFetchResponseSchema = z.object({
  fetched: z.number().int().nonnegative(),
  total: z.number().int().nonnegative().optional(),
  message: z.string(),
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
