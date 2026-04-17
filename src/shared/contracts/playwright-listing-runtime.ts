import { z } from 'zod';

import { dtoBaseSchema } from './base';

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

export const playwrightRelistBrowserModeSchema = z.enum([
  'connection_default',
  'headless',
  'headed',
]);

export type PlaywrightRelistBrowserMode = z.infer<typeof playwrightRelistBrowserModeSchema>;

export const browserListingResultSchema = z.object({
  externalListingId: z.string().nullable(),
  listingUrl: z.string().optional(),
  completedAt: z.string().optional(),
  simulated: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BrowserListingResultDto = z.infer<typeof browserListingResultSchema>;
export type BrowserListingResult = BrowserListingResultDto;
