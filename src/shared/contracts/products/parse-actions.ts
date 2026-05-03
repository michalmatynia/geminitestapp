import { z } from 'zod';

export const productParseActionSourceSchema = z.enum(['tradera']);

export type ProductParseActionSource = z.infer<typeof productParseActionSourceSchema>;

export const productParseActionsMatchRequestSchema = z.object({
  source: productParseActionSourceSchema.default('tradera'),
  text: z.string().trim().min(1).max(500_000),
});

export type ProductParseActionsMatchRequest = z.infer<
  typeof productParseActionsMatchRequestSchema
>;

export const productParseActionsParsedRowSchema = z.object({
  rowId: z.string().min(1),
  source: productParseActionSourceSchema,
  title: z.string().min(1),
  normalizedTitle: z.string().min(1),
  objectNumber: z.string().nullable(),
  status: z.string().nullable(),
  currency: z.string().nullable(),
  price: z.number().nullable(),
  rawPrice: z.string().nullable(),
  rawText: z.string(),
});

export type ProductParseActionsParsedRow = z.infer<
  typeof productParseActionsParsedRowSchema
>;

export const productParseActionsProductSummarySchema = z.object({
  id: z.string().min(1),
  sku: z.string().nullable(),
  name: z.string().nullable(),
});

export type ProductParseActionsProductSummary = z.infer<
  typeof productParseActionsProductSummarySchema
>;

export const productParseActionsListingSummarySchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  integrationId: z.string().min(1),
  externalListingId: z.string().nullable(),
  status: z.string(),
});

export type ProductParseActionsListingSummary = z.infer<
  typeof productParseActionsListingSummarySchema
>;

export const productParseActionsMatchStatusSchema = z.enum([
  'confirmed',
  'ambiguous',
  'unmatched',
]);

export type ProductParseActionsMatchStatus = z.infer<
  typeof productParseActionsMatchStatusSchema
>;

export const productParseActionsMatchRowSchema = z.object({
  row: productParseActionsParsedRowSchema,
  matchStatus: productParseActionsMatchStatusSchema,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  product: productParseActionsProductSummarySchema.nullable(),
  listing: productParseActionsListingSummarySchema.nullable(),
  candidates: z.array(productParseActionsProductSummarySchema),
});

export type ProductParseActionsMatchRow = z.infer<
  typeof productParseActionsMatchRowSchema
>;

export const productParseActionsMatchResponseSchema = z.object({
  source: productParseActionSourceSchema,
  parsedCount: z.number().int().min(0),
  matchedCount: z.number().int().min(0),
  actionableCount: z.number().int().min(0),
  rows: z.array(productParseActionsMatchRowSchema),
});

export type ProductParseActionsMatchResponse = z.infer<
  typeof productParseActionsMatchResponseSchema
>;

export const productParseActionsMarkClosedTargetSchema = z.object({
  rowId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  listingId: z.string().trim().min(1),
  objectNumber: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1).optional(),
});

export type ProductParseActionsMarkClosedTarget = z.infer<
  typeof productParseActionsMarkClosedTargetSchema
>;

export const productParseActionsMarkTraderaClosedRequestSchema = z.object({
  matches: z.array(productParseActionsMarkClosedTargetSchema).min(1).max(500),
});

export type ProductParseActionsMarkTraderaClosedRequest = z.infer<
  typeof productParseActionsMarkTraderaClosedRequestSchema
>;

export const productParseActionsMarkClosedResultSchema = z.object({
  rowId: z.string().min(1),
  productId: z.string().min(1),
  listingId: z.string().min(1),
  status: z.enum(['updated', 'skipped', 'failed']),
  message: z.string().nullable(),
});

export type ProductParseActionsMarkClosedResult = z.infer<
  typeof productParseActionsMarkClosedResultSchema
>;

export const productParseActionsMarkTraderaClosedResponseSchema = z.object({
  status: z.literal('ok'),
  requested: z.number().int().min(0),
  updated: z.number().int().min(0),
  skipped: z.number().int().min(0),
  failed: z.number().int().min(0),
  results: z.array(productParseActionsMarkClosedResultSchema),
});

export type ProductParseActionsMarkTraderaClosedResponse = z.infer<
  typeof productParseActionsMarkTraderaClosedResponseSchema
>;
