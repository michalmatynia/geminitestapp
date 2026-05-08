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

export const productScrapeProfileRunRuntimeImageStepControlsSchema = z.object({
  applyImagePayload: z.boolean(),
  collectProductGalleryImages: z.boolean(),
  collectScrapedImageLinks: z.boolean(),
  downloadProductGalleryImages: z.boolean(),
  downloadScrapedImages: z.boolean(),
  uploadProductImages: z.boolean(),
});

export const productScrapeProfileRunRuntimeSchema = z.object({
  queueName: z.string().trim().min(1).nullable(),
  runtimeActionId: z.string().trim().min(1),
  runtimeActionName: z.string().trim().min(1),
  runtimeActionKey: z.string().trim().min(1),
  browserMode: z.enum(['headed', 'headless', 'runtime_default']),
  enabledStepCount: z.number().int().min(0),
  imageImportMode: productScrapeProfileImageImportModeSchema.optional(),
  imageStepControls: productScrapeProfileRunRuntimeImageStepControlsSchema.optional(),
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

export const productScrapeProfileRuntimeStatusSchema = z.enum([
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
]);

export type ProductScrapeProfileRuntimeStatus = z.infer<
  typeof productScrapeProfileRuntimeStatusSchema
>;

export const productScrapeProfileRuntimeProgressSchema = z.object({
  current: z.number().int().min(0).nullable(),
  message: z.string().trim().min(1).nullable(),
  stage: z.string().trim().min(1),
  total: z.number().int().min(0).nullable(),
  updatedAt: z.string().trim().min(1),
});

export type ProductScrapeProfileRuntimeProgress = z.infer<
  typeof productScrapeProfileRuntimeProgressSchema
>;

export type ProductScrapeProfileRuntimeProgressUpdate = Omit<
  ProductScrapeProfileRuntimeProgress,
  'updatedAt'
>;

export const productScrapeProfileRuntimeRunSchema = z.object({
  completedAt: z.string().trim().min(1).nullable(),
  createdAt: z.string().trim().min(1),
  dryRun: z.boolean(),
  error: z.string().nullable(),
  id: z.string().trim().min(1),
  imageImportMode: productScrapeProfileImageImportModeSchema.optional(),
  profileId: z.string().trim().min(1),
  progress: productScrapeProfileRuntimeProgressSchema.nullable().optional(),
  queueName: z.string().trim().min(1),
  result: productScrapeProfileRunResponseSchema.nullable(),
  startedAt: z.string().trim().min(1).nullable(),
  status: productScrapeProfileRuntimeStatusSchema,
  updatedAt: z.string().trim().min(1),
});

export type ProductScrapeProfileRuntimeRun = z.infer<
  typeof productScrapeProfileRuntimeRunSchema
>;

export const productScrapeProfileRuntimeSnapshotSchema = z.object({
  run: productScrapeProfileRuntimeRunSchema.nullable(),
});

export type ProductScrapeProfileRuntimeSnapshot = z.infer<
  typeof productScrapeProfileRuntimeSnapshotSchema
>;

export const productScrapeProfileRuntimeRunResponseSchema = z.object({
  run: productScrapeProfileRuntimeRunSchema,
});

export type ProductScrapeProfileRuntimeRunResponse = z.infer<
  typeof productScrapeProfileRuntimeRunResponseSchema
>;

export const productScrapeProfileRunQueuedResponseSchema = z.object({
  status: z.literal('queued'),
  profileId: z.string().trim().min(1),
  dryRun: z.boolean(),
  jobId: z.string().trim().min(1),
  imageImportMode: productScrapeProfileImageImportModeSchema.optional(),
  queueName: z.string().trim().min(1),
  enqueuedAt: z.string().trim().min(1),
  run: productScrapeProfileRuntimeRunSchema.optional(),
});

export type ProductScrapeProfileRunQueuedResponse = z.infer<
  typeof productScrapeProfileRunQueuedResponseSchema
>;

export const productScrapeProfileRunLaunchResponseSchema = z.union([
  productScrapeProfileRunResponseSchema,
  productScrapeProfileRunQueuedResponseSchema,
]);

export type ProductScrapeProfileRunLaunchResponse = z.infer<
  typeof productScrapeProfileRunLaunchResponseSchema
>;
