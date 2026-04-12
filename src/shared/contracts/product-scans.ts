import { z } from 'zod';

const trimmedString = z.string().trim();

const optionalTrimmedString = (max: number) => trimmedString.max(max).nullable().default(null);

export const PRODUCT_SCANS_COLLECTION = 'product_scans';

export const productScanProviderSchema = z.enum(['amazon', '1688']);
export type ProductScanProvider = z.infer<typeof productScanProviderSchema>;

export const productScanTypeSchema = z.enum(['google_reverse_image', 'supplier_reverse_image']);
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

export const productScanStepGroupSchema = z.enum([
  'input',
  'google_lens',
  'amazon',
  'supplier',
  'product',
]);
export type ProductScanStepGroup = z.infer<typeof productScanStepGroupSchema>;

export const productScanStepInputSourceSchema = z.enum(['url', 'file']);
export type ProductScanStepInputSource = z.infer<typeof productScanStepInputSourceSchema>;

export const productScanStepDetailSchema = z.object({
  label: trimmedString.min(1).max(120),
  value: optionalTrimmedString(500),
});
export type ProductScanStepDetail = z.infer<typeof productScanStepDetailSchema>;

export const productScanStepSchema = z.object({
  key: trimmedString.min(1).max(120),
  label: trimmedString.min(1).max(160),
  group: productScanStepGroupSchema.nullable().default(null),
  attempt: z.number().int().positive().nullable().default(null),
  candidateId: optionalTrimmedString(160),
  candidateRank: z.number().int().positive().nullable().optional(),
  inputSource: productScanStepInputSourceSchema.nullable().default(null),
  retryOf: optionalTrimmedString(160).optional(),
  resultCode: optionalTrimmedString(120).optional(),
  status: productScanStepStatusSchema,
  message: optionalTrimmedString(2_000),
  warning: optionalTrimmedString(500),
  details: z.array(productScanStepDetailSchema).max(20).default([]),
  url: optionalTrimmedString(4_000),
  startedAt: z.string().datetime().nullable().default(null),
  completedAt: z.string().datetime().nullable().default(null),
  durationMs: z.number().int().nonnegative().nullable().default(null),
});
export type ProductScanStep = z.infer<typeof productScanStepSchema>;

export const productScanAmazonAttributeSchema = z.object({
  key: trimmedString.min(1).max(160),
  label: trimmedString.min(1).max(200),
  value: trimmedString.min(1).max(2_000),
  source: optionalTrimmedString(120),
});
export type ProductScanAmazonAttribute = z.infer<typeof productScanAmazonAttributeSchema>;

export const productScanAmazonRankingSchema = z.object({
  rank: trimmedString.min(1).max(120),
  category: optionalTrimmedString(500),
  source: optionalTrimmedString(120),
});
export type ProductScanAmazonRanking = z.infer<typeof productScanAmazonRankingSchema>;

export const productScanAmazonDetailsSchema = z
  .object({
    brand: optionalTrimmedString(300),
    manufacturer: optionalTrimmedString(300),
    modelNumber: optionalTrimmedString(300),
    partNumber: optionalTrimmedString(300),
    color: optionalTrimmedString(300),
    style: optionalTrimmedString(300),
    material: optionalTrimmedString(300),
    size: optionalTrimmedString(300),
    pattern: optionalTrimmedString(300),
    finish: optionalTrimmedString(300),
    itemDimensions: optionalTrimmedString(500),
    packageDimensions: optionalTrimmedString(500),
    itemWeight: optionalTrimmedString(200),
    packageWeight: optionalTrimmedString(200),
    bestSellersRank: optionalTrimmedString(2_000),
    ean: optionalTrimmedString(120),
    gtin: optionalTrimmedString(120),
    upc: optionalTrimmedString(120),
    isbn: optionalTrimmedString(120),
    bulletPoints: z.array(trimmedString.max(1_000)).max(30).default([]),
    attributes: z.array(productScanAmazonAttributeSchema).max(100).default([]),
    rankings: z.array(productScanAmazonRankingSchema).max(20).default([]),
  })
  .nullable()
  .default(null);
export type ProductScanAmazonDetails = z.infer<typeof productScanAmazonDetailsSchema>;

export const productScanAmazonProbeSchema = z
  .object({
    asin: optionalTrimmedString(40),
    pageTitle: optionalTrimmedString(1_000),
    descriptionSnippet: optionalTrimmedString(4_000),
    pageLanguage: optionalTrimmedString(80).optional(),
    pageLanguageSource: optionalTrimmedString(120).optional(),
    marketplaceDomain: optionalTrimmedString(200).optional(),
    candidateUrl: optionalTrimmedString(4_000),
    canonicalUrl: optionalTrimmedString(4_000),
    heroImageUrl: optionalTrimmedString(4_000),
    heroImageAlt: optionalTrimmedString(1_000),
    heroImageArtifactName: optionalTrimmedString(260),
    artifactKey: optionalTrimmedString(260),
    bulletPoints: z.array(trimmedString.max(1_000)).max(12).default([]),
    bulletCount: z.number().int().nonnegative().nullable().default(null),
    attributeCount: z.number().int().nonnegative().nullable().default(null),
  })
  .nullable()
  .default(null);
export type ProductScanAmazonProbe = z.infer<typeof productScanAmazonProbeSchema>;

export const productScanAmazonEvaluationStatusSchema = z.enum([
  'approved',
  'rejected',
  'skipped',
  'failed',
]);
export type ProductScanAmazonEvaluationStatus = z.infer<
  typeof productScanAmazonEvaluationStatusSchema
>;

export const productScanAmazonEvaluationEvidenceSchema = z.object({
  candidateUrl: optionalTrimmedString(4_000),
  pageTitle: optionalTrimmedString(1_000),
  heroImageSource: optionalTrimmedString(4_000),
  heroImageArtifactName: optionalTrimmedString(260),
  screenshotArtifactName: optionalTrimmedString(260),
  htmlArtifactName: optionalTrimmedString(260),
  productImageSource: optionalTrimmedString(4_000),
});
export type ProductScanAmazonEvaluationEvidence = z.infer<
  typeof productScanAmazonEvaluationEvidenceSchema
>;

export const productScanAmazonEvaluationResultSchema = z.object({
  status: productScanAmazonEvaluationStatusSchema,
  sameProduct: z.boolean().nullable().default(null),
  imageMatch: z.boolean().nullable().default(null),
  descriptionMatch: z.boolean().nullable().default(null),
  pageRepresentsSameProduct: z.boolean().nullable().default(null),
  pageLanguage: optionalTrimmedString(80).optional(),
  languageConfidence: z.number().min(0).max(1).nullable().optional(),
  languageAccepted: z.boolean().nullable().optional(),
  languageReason: optionalTrimmedString(500).optional(),
  confidence: z.number().min(0).max(1).nullable().default(null),
  proceed: z.boolean().default(false),
  scrapeAllowed: z.boolean().optional(),
  threshold: z.number().min(0).max(1).nullable().default(null),
  reasons: z.array(trimmedString.max(500)).max(10).default([]),
  mismatches: z.array(trimmedString.max(500)).max(10).default([]),
  modelId: optionalTrimmedString(200),
  brainApplied: z.record(z.string(), z.unknown()).nullable().default(null),
  evidence: productScanAmazonEvaluationEvidenceSchema.nullable().default(null),
  error: optionalTrimmedString(2_000),
  evaluatedAt: z.string().datetime().nullable().default(null),
});
export type ProductScanAmazonEvaluationResult = z.infer<typeof productScanAmazonEvaluationResultSchema>;

export const productScanAmazonEvaluationSchema = productScanAmazonEvaluationResultSchema
  .nullable()
  .default(null);
export type ProductScanAmazonEvaluation = z.infer<typeof productScanAmazonEvaluationSchema>;

export const productScanSupplierImageSchema = z.object({
  url: optionalTrimmedString(4_000),
  alt: optionalTrimmedString(1_000),
  artifactName: optionalTrimmedString(260),
  source: optionalTrimmedString(120),
});
export type ProductScanSupplierImage = z.infer<typeof productScanSupplierImageSchema>;

export const productScanSupplierPriceSchema = z.object({
  label: optionalTrimmedString(200),
  amount: optionalTrimmedString(120),
  currency: optionalTrimmedString(40),
  rangeStart: optionalTrimmedString(120),
  rangeEnd: optionalTrimmedString(120),
  moq: optionalTrimmedString(120),
  unit: optionalTrimmedString(120),
  source: optionalTrimmedString(120),
});
export type ProductScanSupplierPrice = z.infer<typeof productScanSupplierPriceSchema>;

export const productScanSupplierDetailsSchema = z
  .object({
    supplierName: optionalTrimmedString(300),
    supplierStoreUrl: optionalTrimmedString(4_000),
    supplierProductUrl: optionalTrimmedString(4_000),
    platformProductId: optionalTrimmedString(160),
    currency: optionalTrimmedString(40),
    priceText: optionalTrimmedString(200),
    priceRangeText: optionalTrimmedString(400),
    moqText: optionalTrimmedString(200),
    supplierLocation: optionalTrimmedString(300),
    supplierRating: optionalTrimmedString(120),
    sourceLanguage: optionalTrimmedString(80),
    images: z.array(productScanSupplierImageSchema).max(40).default([]),
    prices: z.array(productScanSupplierPriceSchema).max(20).default([]),
  })
  .nullable()
  .default(null);
export type ProductScanSupplierDetails = z.infer<typeof productScanSupplierDetailsSchema>;

export const productScanSupplierProbeSchema = z
  .object({
    candidateUrl: optionalTrimmedString(4_000),
    canonicalUrl: optionalTrimmedString(4_000),
    pageTitle: optionalTrimmedString(1_000),
    descriptionSnippet: optionalTrimmedString(4_000),
    pageLanguage: optionalTrimmedString(80).optional(),
    supplierName: optionalTrimmedString(300),
    supplierStoreUrl: optionalTrimmedString(4_000),
    priceText: optionalTrimmedString(200),
    currency: optionalTrimmedString(40),
    heroImageUrl: optionalTrimmedString(4_000),
    heroImageAlt: optionalTrimmedString(1_000),
    heroImageArtifactName: optionalTrimmedString(260),
    artifactKey: optionalTrimmedString(260),
    imageCount: z.number().int().nonnegative().nullable().default(null),
  })
  .nullable()
  .default(null);
export type ProductScanSupplierProbe = z.infer<typeof productScanSupplierProbeSchema>;

export const productScanSupplierEvaluationStatusSchema = z.enum([
  'approved',
  'rejected',
  'skipped',
  'failed',
]);
export type ProductScanSupplierEvaluationStatus = z.infer<
  typeof productScanSupplierEvaluationStatusSchema
>;

export const productScanSupplierEvaluationSchema = z
  .object({
    status: productScanSupplierEvaluationStatusSchema,
    sameProduct: z.boolean().nullable().default(null),
    imageMatch: z.boolean().nullable().default(null),
    titleMatch: z.boolean().nullable().default(null),
    confidence: z.number().min(0).max(1).nullable().default(null),
    proceed: z.boolean().default(false),
    reasons: z.array(trimmedString.max(500)).max(10).default([]),
    mismatches: z.array(trimmedString.max(500)).max(10).default([]),
    modelId: optionalTrimmedString(200),
    error: optionalTrimmedString(2_000),
    evaluatedAt: z.string().datetime().nullable().default(null),
  })
  .nullable()
  .default(null);
export type ProductScanSupplierEvaluation = z.infer<typeof productScanSupplierEvaluationSchema>;
export type NonNullableProductScanSupplierEvaluation = Exclude<
  ProductScanSupplierEvaluation,
  null
>;

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
  amazonDetails: productScanAmazonDetailsSchema,
  amazonProbe: productScanAmazonProbeSchema,
  amazonEvaluation: productScanAmazonEvaluationSchema,
  supplierDetails: productScanSupplierDetailsSchema,
  supplierProbe: productScanSupplierProbeSchema,
  supplierEvaluation: productScanSupplierEvaluationSchema,
  steps: z.array(productScanStepSchema).max(120).default([]),
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
export type ProductScanRecordInput = z.input<typeof productScanRecordSchema>;

export const productScanListResponseSchema = z.object({
  scans: z.array(productScanRecordSchema).default([]),
});
export type ProductScanListResponse = z.infer<typeof productScanListResponseSchema>;

export const productAmazonBatchScanRequestSchema = z.object({
  productIds: z.array(trimmedString.min(1).max(160)).min(1).max(100),
});
export type ProductAmazonBatchScanRequest = z.infer<typeof productAmazonBatchScanRequestSchema>;
export const productScanBatchRequestSchema = productAmazonBatchScanRequestSchema;
export type ProductScanBatchRequest = ProductAmazonBatchScanRequest;

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
export const productScanBatchItemSchema = productAmazonBatchScanItemSchema;
export type ProductScanBatchItem = ProductAmazonBatchScanItem;

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
export const productScanBatchResponseSchema = productAmazonBatchScanResponseSchema;
export type ProductScanBatchResponse = ProductAmazonBatchScanResponse;

export type CreateProductScanInput = Omit<ProductScanRecordInput, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateProductScanInput = Partial<CreateProductScanInput>;

export const normalizeProductScanRecord = (
  value: ProductScanRecordInput
): ProductScanRecord => productScanRecordSchema.parse(value);
