import { z } from 'zod';

const trimmedString = z.string().trim();

const optionalTrimmedString = (max: number) => trimmedString.max(max).nullable().default(null);

export const PRODUCT_SCANS_COLLECTION = 'product_scans';

export const productScanProviderSchema = z.enum(['amazon']);
export type ProductScanProvider = z.infer<typeof productScanProviderSchema>;

export const productScanTypeSchema = z.enum(['google_reverse_image']);
export type ProductScanType = z.infer<typeof productScanTypeSchema>;

export const productScanStatusSchema = z.enum([
  'queued',
  'enqueuing',
  'running',
  'completed',
  'no_match',
  'conflict',
  'failed',
]);
export type ProductScanStatus = z.infer<typeof productScanStatusSchema>;

export const PRODUCT_SCAN_ACTIVE_STATUSES = ['queued', 'enqueuing', 'running'] as const;

export const isProductScanActiveStatus = (
  value: ProductScanStatus | null | undefined
): boolean => value === 'queued' || value === 'enqueuing' || value === 'running';

export const isProductScanTerminalStatus = (
  value: ProductScanStatus | null | undefined
): boolean => !isProductScanActiveStatus(value);

export const productScanAsinUpdateStatusSchema = z.enum([
  'pending',
  'updated',
  'unchanged',
  'conflict',
  'not_needed',
  'failed',
]);
export type ProductScanAsinUpdateStatus = z.infer<typeof productScanAsinUpdateStatusSchema>;

export const productScanStepStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
]);
export type ProductScanStepStatus = z.infer<typeof productScanStepStatusSchema>;

export const productScanStepSchema = z.object({
  key: trimmedString.min(1).max(120),
  label: trimmedString.min(1).max(160),
  status: productScanStepStatusSchema,
  message: optionalTrimmedString(2_000),
  url: optionalTrimmedString(4_000),
  startedAt: z.string().datetime().nullable().default(null),
  completedAt: z.string().datetime().nullable().default(null),
});
export type ProductScanStep = z.infer<typeof productScanStepSchema>;

export const productScanImageCandidateSchema = z.object({
  id: optionalTrimmedString(160),
  url: optionalTrimmedString(4_000),
  filepath: optionalTrimmedString(4_000),
  filename: optionalTrimmedString(512),
});
export type ProductScanImageCandidate = z.infer<typeof productScanImageCandidateSchema>;

export const productScanRecordSchema = z.object({
  id: trimmedString.min(1).max(160),
  productId: trimmedString.min(1).max(160),
  provider: productScanProviderSchema.default('amazon'),
  scanType: productScanTypeSchema.default('google_reverse_image'),
  status: productScanStatusSchema,
  productName: optionalTrimmedString(300),
  engineRunId: optionalTrimmedString(160),
  imageCandidates: z.array(productScanImageCandidateSchema).max(5).default([]),
  matchedImageId: optionalTrimmedString(160),
  asin: optionalTrimmedString(40),
  title: optionalTrimmedString(1_000),
  price: optionalTrimmedString(200),
  url: optionalTrimmedString(4_000),
  description: optionalTrimmedString(8_000),
  steps: z.array(productScanStepSchema).max(40).default([]),
  rawResult: z.unknown().nullable().default(null),
  error: optionalTrimmedString(2_000),
  asinUpdateStatus: productScanAsinUpdateStatusSchema.nullable().default(null),
  asinUpdateMessage: optionalTrimmedString(2_000),
  createdBy: optionalTrimmedString(120),
  updatedBy: optionalTrimmedString(120),
  completedAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type ProductScanRecord = z.infer<typeof productScanRecordSchema>;

export const productScanListResponseSchema = z.object({
  scans: z.array(productScanRecordSchema).default([]),
});
export type ProductScanListResponse = z.infer<typeof productScanListResponseSchema>;

export const productAmazonBatchScanRequestSchema = z.object({
  productIds: z.array(trimmedString.min(1).max(160)).min(1).max(100),
});
export type ProductAmazonBatchScanRequest = z.infer<typeof productAmazonBatchScanRequestSchema>;

export const productAmazonBatchScanItemStatusSchema = z.enum([
  'queued',
  'running',
  'already_running',
  'failed',
]);
export type ProductAmazonBatchScanItemStatus = z.infer<
  typeof productAmazonBatchScanItemStatusSchema
>;

export const productAmazonBatchScanItemSchema = z.object({
  productId: trimmedString.min(1).max(160),
  scanId: optionalTrimmedString(160),
  runId: optionalTrimmedString(160),
  status: productAmazonBatchScanItemStatusSchema,
  currentStatus: productScanStatusSchema.nullable().default(null),
  message: optionalTrimmedString(1_000),
});
export type ProductAmazonBatchScanItem = z.infer<typeof productAmazonBatchScanItemSchema>;

export const productAmazonBatchScanResponseSchema = z.object({
  queued: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  alreadyRunning: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  results: z.array(productAmazonBatchScanItemSchema).default([]),
});
export type ProductAmazonBatchScanResponse = z.infer<
  typeof productAmazonBatchScanResponseSchema
>;

export type CreateProductScanInput = Omit<ProductScanRecord, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateProductScanInput = Partial<CreateProductScanInput>;

export const normalizeProductScanRecord = (
  value: ProductScanRecord
): ProductScanRecord => productScanRecordSchema.parse(value);
