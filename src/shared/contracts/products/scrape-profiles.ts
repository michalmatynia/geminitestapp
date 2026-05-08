import { z } from 'zod';

export const PRODUCT_SCRAPE_SOURCE_PRICE_CURRENCY_CODES = [
  'PLN',
  'EUR',
  'USD',
  'GBP',
  'SEK',
] as const;

export const productScrapeSourcePriceCurrencyCodeSchema = z.enum(
  PRODUCT_SCRAPE_SOURCE_PRICE_CURRENCY_CODES
);

export type ProductScrapeSourcePriceCurrencyCode = z.infer<
  typeof productScrapeSourcePriceCurrencyCodeSchema
>;

export const productScrapeProfileSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  description: z.string().trim().nullable(),
  siteHost: z.string().trim().min(1),
  sourceUrl: z.string().trim().url(),
  scripterId: z.string().trim().min(1),
  runtimeActionKey: z.string().trim().min(1).nullable().optional(),
  targetCatalogName: z.string().trim().min(1),
  defaultLimit: z.number().int().positive().nullable(),
  maxPages: z.number().int().positive().nullable(),
  defaultSourcePriceCurrencyCode: productScrapeSourcePriceCurrencyCodeSchema.optional(),
  sourcePriceCurrencyCodes: z.array(productScrapeSourcePriceCurrencyCodeSchema).optional(),
});

export type ProductScrapeProfile = z.infer<typeof productScrapeProfileSchema>;

export const productScrapeProfilesListResponseSchema = z.object({
  profiles: z.array(productScrapeProfileSchema),
});

export type ProductScrapeProfilesListResponse = z.infer<
  typeof productScrapeProfilesListResponseSchema
>;

export const productScrapeProfileImageImportModeSchema = z.enum(['links', 'files']);

export type ProductScrapeProfileImageImportMode = z.infer<
  typeof productScrapeProfileImageImportModeSchema
>;

export const productScrapeProfileRunRequestSchema = z
  .object({
    profileId: z.string().trim().min(1),
    limit: z.number().int().positive().max(5000).optional(),
    dryRun: z.boolean().optional(),
    skipRecordsWithErrors: z.boolean().optional(),
    draftTemplateId: z.string().trim().min(1).optional(),
    imageImportMode: productScrapeProfileImageImportModeSchema.optional(),
    sourcePriceCurrencyCode: productScrapeSourcePriceCurrencyCodeSchema.optional(),
  })
  .strict();

export type ProductScrapeProfileRunRequest = z.infer<
  typeof productScrapeProfileRunRequestSchema
>;

export const productScrapeProfileRunProductStatusSchema = z.enum([
  'created',
  'updated',
  'skipped',
  'failed',
  'dry_run',
]);

export type ProductScrapeProfileRunProductStatus = z.infer<
  typeof productScrapeProfileRunProductStatusSchema
>;

export const productScrapeProfileRunProductSchema = z.object({
  index: z.number().int().min(0),
  status: productScrapeProfileRunProductStatusSchema,
  productId: z.string().nullable(),
  sku: z.string().nullable(),
  title: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  error: z.string().nullable(),
});

export type ProductScrapeProfileRunProduct = z.infer<
  typeof productScrapeProfileRunProductSchema
>;

export const productScrapeProfileRunSummarySchema = z.object({
  rawCount: z.number().int().min(0),
  mappedCount: z.number().int().min(0),
  recordsWithErrors: z.number().int().min(0),
  recordsWithWarnings: z.number().int().min(0),
  totalIssues: z.number().int().min(0),
});

export const productScrapeProfileRunRuntimeSchema = z.object({
  queueName: z.string().trim().min(1).nullable(),
  runtimeActionId: z.string().trim().min(1),
  runtimeActionName: z.string().trim().min(1),
  runtimeActionKey: z.string().trim().min(1),
  browserMode: z.enum(['headed', 'headless', 'runtime_default']),
  enabledStepCount: z.number().int().min(0),
  totalStepCount: z.number().int().min(0),
});

export const productScrapeProfileRunResponseSchema = z.object({
  profileId: z.string(),
  profileLabel: z.string(),
  dryRun: z.boolean(),
  catalog: z.object({
    id: z.string(),
    name: z.string(),
  }),
  scrapedCount: z.number().int().min(0),
  createdCount: z.number().int().min(0),
  updatedCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  failedCount: z.number().int().min(0),
  issueCount: z.number().int().min(0),
  products: z.array(productScrapeProfileRunProductSchema),
  summary: productScrapeProfileRunSummarySchema,
  runtime: productScrapeProfileRunRuntimeSchema.optional(),
});

export type ProductScrapeProfileRunResponse = z.infer<
  typeof productScrapeProfileRunResponseSchema
>;
