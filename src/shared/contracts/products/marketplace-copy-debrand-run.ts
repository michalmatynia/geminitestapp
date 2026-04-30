import { z } from 'zod';

export const marketplaceCopyDebrandTriggerInputSchema = z.object({
  sourceEnglishTitle: z.string(),
  sourceEnglishDescription: z.string(),
  targetRow: z.object({
    id: z.string().trim().min(1),
    index: z.number().int().min(0),
    integrationIds: z.array(z.string().trim().min(1)).min(1),
    integrationNames: z.array(z.string()).default([]),
    currentAlternateTitle: z.string().nullable().optional(),
    currentAlternateDescription: z.string().nullable().optional(),
  }),
});

export type MarketplaceCopyDebrandTriggerInput = z.infer<
  typeof marketplaceCopyDebrandTriggerInputSchema
>;

export const productMarketplaceCopyDebrandRunRequestSchema = z.object({
  productId: z.string().trim().min(1).nullable().optional(),
  entityJson: z.record(z.string(), z.unknown()),
  marketplaceCopyDebrandInput: marketplaceCopyDebrandTriggerInputSchema,
});

export type ProductMarketplaceCopyDebrandRunRequest = z.infer<
  typeof productMarketplaceCopyDebrandRunRequestSchema
>;

export const productMarketplaceCopyDebrandRunResponseSchema = z.object({
  status: z.literal('queued'),
  runId: z.string().min(1),
  productId: z.string().nullable(),
});

export type ProductMarketplaceCopyDebrandRunResponse = z.infer<
  typeof productMarketplaceCopyDebrandRunResponseSchema
>;
