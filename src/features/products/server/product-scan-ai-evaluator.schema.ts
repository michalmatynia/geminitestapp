import 'server-only';

import { z } from 'zod';

import type {
  ProductScanAmazonMismatchLabel,
  ProductScanAmazonRecommendedAction,
  ProductScanAmazonRejectionCategory,
} from '@/shared/contracts/product-scans';

export const EVALUATOR_MAX_REASON_COUNT = 10;

export const PRODUCT_SCAN_VERIFICATION_REVIEW_SYSTEM_PROMPT = [
  'Inspect the provided browser screenshot and text context.',
  'Describe the visible verification or anti-bot screen conservatively and precisely.',
  'Transcribe the visible question or instruction text when it is legible.',
  'Identify the challenge type and how the verification UI is structured.',
  'Do not solve the challenge, do not suggest bypasses, and do not provide attack guidance.',
  'State only what is visible and whether manual human verification is required.',
  'Return only JSON.',
].join(' ');

export const AMAZON_RECOMMENDED_ACTION_VALUES = [
  'accept',
  'reject',
  'try_next_candidate',
  'fallback_provider',
] as const satisfies ReadonlyArray<ProductScanAmazonRecommendedAction>;

export const AMAZON_REJECTION_CATEGORY_VALUES = [
  'language',
  'variant',
  'wrong_product',
  'low_confidence',
] as const satisfies ReadonlyArray<ProductScanAmazonRejectionCategory>;

export const AMAZON_MISMATCH_LABEL_VALUES = [
  'brand',
  'model',
  'color',
  'material',
  'size',
  'pack_count',
  'character_theme_license',
  'language',
  'wrong_product',
  'other',
] as const satisfies ReadonlyArray<ProductScanAmazonMismatchLabel>;

const amazonRecommendedActionSchema = z.enum(AMAZON_RECOMMENDED_ACTION_VALUES);
const amazonRejectionCategorySchema = z.enum(AMAZON_REJECTION_CATEGORY_VALUES);
export const amazonMismatchLabelSchema = z.enum(AMAZON_MISMATCH_LABEL_VALUES);
const amazonAttributeAssessmentSchema = z.enum(['match', 'mismatch', 'unknown']);

export const amazonVariantAssessmentResponseSchema = z.object({
  brand: amazonAttributeAssessmentSchema.default('unknown'),
  model: amazonAttributeAssessmentSchema.default('unknown'),
  color: amazonAttributeAssessmentSchema.default('unknown'),
  material: amazonAttributeAssessmentSchema.default('unknown'),
  size: amazonAttributeAssessmentSchema.default('unknown'),
  packCount: amazonAttributeAssessmentSchema.default('unknown'),
  characterThemeLicense: amazonAttributeAssessmentSchema.default('unknown'),
});

const normalizeConfidenceInput = (value: unknown): number => {
  let parsed = Number.NaN;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && value.trim().length > 0) {
    parsed = Number(value);
  }

  if (Number.isFinite(parsed) === false) return Number.NaN;
  if (parsed > 1 && parsed <= 100) return parsed / 100;
  return parsed;
};

const nullableConfidenceSchema = z.preprocess(
  (value) => (value === null || value === undefined || value === '' ? null : normalizeConfidenceInput(value)),
  z.number().min(0).max(1).nullable()
);

export const amazonEvaluatorResponseSchema = z.object({
  sameProduct: z.boolean(),
  imageMatch: z.boolean().nullable().optional().default(null),
  descriptionMatch: z.boolean().nullable().optional().default(null),
  pageRepresentsSameProduct: z.boolean(),
  pageLanguage: z.string().trim().min(1).max(80).nullable().optional().default(null),
  languageAccepted: z.boolean().nullable().optional().default(null),
  languageReason: z.string().trim().min(1).max(500).nullable().optional().default(null),
  languageConfidence: nullableConfidenceSchema.optional().default(null),
  confidence: z.preprocess(normalizeConfidenceInput, z.number().min(0).max(1)),
  proceed: z.boolean(),
  recommendedAction: amazonRecommendedActionSchema.nullable().optional().default(null),
  rejectionCategory: amazonRejectionCategorySchema.nullable().optional().default(null),
  reasons: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  mismatches: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  mismatchLabels: z.array(amazonMismatchLabelSchema).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  variantAssessment: amazonVariantAssessmentResponseSchema.nullable().optional().default(null),
});

export const amazonCandidateTriageCandidateSchema = z.object({
  url: z.string().trim().url(),
  keep: z.boolean(),
  confidence: nullableConfidenceSchema.optional().default(null),
  rankAfter: z.number().int().positive().nullable().optional().default(null),
  pageLanguage: z.string().trim().min(1).max(80).nullable().optional().default(null),
  languageAccepted: z.boolean().nullable().optional().default(null),
  recommendedAction: amazonRecommendedActionSchema.nullable().optional().default(null),
  rejectionCategory: amazonRejectionCategorySchema.nullable().optional().default(null),
  reasons: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  mismatchLabels: z.array(amazonMismatchLabelSchema).max(EVALUATOR_MAX_REASON_COUNT).default([]),
});

export const amazonCandidateTriageResponseSchema = z.object({
  recommendedAction: amazonRecommendedActionSchema.nullable().optional().default(null),
  rejectionCategory: amazonRejectionCategorySchema.nullable().optional().default(null),
  reasons: z.array(z.string().trim().min(1).max(500)).max(EVALUATOR_MAX_REASON_COUNT).default([]),
  candidates: z.array(amazonCandidateTriageCandidateSchema).max(20).default([]),
});

export const productScanVerificationReviewResponseSchema = z.object({
  challengeType: z.string().trim().min(1).max(120).nullable().optional().default(null),
  visibleQuestion: z.string().trim().min(1).max(1_500).nullable().optional().default(null),
  visibleInstructions: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
  uiElements: z.array(z.string().trim().min(1).max(300)).max(12).default([]),
  pageSummary: z.string().trim().min(1).max(2_000).nullable().optional().default(null),
  manualActionRequired: z.boolean().nullable().optional().default(true),
  confidence: nullableConfidenceSchema.optional().default(null),
});
