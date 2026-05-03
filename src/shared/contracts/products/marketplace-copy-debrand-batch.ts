import { z } from 'zod';

export const productMarketplaceCopyDebrandBatchRequestSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
  integrationId: z.string().trim().min(1),
});

export type ProductMarketplaceCopyDebrandBatchRequest = z.infer<
  typeof productMarketplaceCopyDebrandBatchRequestSchema
>;

export const productMarketplaceCopyDebrandBatchResponseSchema = z.object({
  status: z.literal('queued'),
  jobId: z.string().min(1),
  requested: z.number().int().min(1),
  integrationId: z.string().min(1),
  integrationSlug: z.string(),
  integrationName: z.string().min(1),
});

export type ProductMarketplaceCopyDebrandBatchResponse = z.infer<
  typeof productMarketplaceCopyDebrandBatchResponseSchema
>;
