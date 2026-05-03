import { z } from 'zod';

export const productScrapedSourceActionRequestSchema = z.object({
  productId: z.string().trim().min(1),
});

export type ProductScrapedSourceActionRequest = z.infer<
  typeof productScrapedSourceActionRequestSchema
>;

export const productScrapedSourceActionResponseSchema = z.object({
  productId: z.string().trim().min(1),
  listingId: z.string().trim().min(1).nullable(),
  status: z.string().trim().min(1),
  sourceUrl: z.string().trim().min(1).nullable(),
  checkedAt: z.string().trim().min(1).nullable(),
  runId: z.string().trim().min(1).nullable().optional(),
  actionRunUrl: z.string().trim().min(1).nullable().optional(),
  message: z.string().trim().min(1),
});

export type ProductScrapedSourceActionResponse = z.infer<
  typeof productScrapedSourceActionResponseSchema
>;
