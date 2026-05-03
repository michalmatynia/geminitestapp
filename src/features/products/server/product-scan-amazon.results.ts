import 'server-only';

import type { z } from 'zod';

import type {
  ProductScanAmazonEvaluationResult,
  ProductScanAmazonMismatchLabel,
  ProductScanAmazonRecommendedAction,
  ProductScanAmazonRejectionCategory,
  ProductScanAmazonVariantAssessment,
} from '@/shared/contracts/product-scans';

import {
  AMAZON_MISMATCH_LABEL_VALUES,
} from './product-scan-ai-evaluator.schema';
import type { amazonVariantAssessmentResponseSchema } from './product-scan-ai-evaluator.schema';
import type { ProductScanCandidateTriageEvaluationResult } from './product-scan-amazon.types';

export const dedupeMismatchLabels = (
  values: ReadonlyArray<ProductScanAmazonMismatchLabel | null | undefined>
): ProductScanAmazonMismatchLabel[] => {
  const normalized = new Set<ProductScanAmazonMismatchLabel>();
  const validLabels: readonly string[] = AMAZON_MISMATCH_LABEL_VALUES;
  for (const value of values) {
    if (value !== null && value !== undefined && validLabels.includes(value)) {
      normalized.add(value);
    }
  }
  return Array.from(normalized);
};

export const normalizeVariantAssessment = (
  value: z.infer<typeof amazonVariantAssessmentResponseSchema> | null | undefined
): ProductScanAmazonVariantAssessment => {
  if (value === null || value === undefined) return null;
  return {
    brand: value.brand,
    model: value.model,
    color: value.color,
    material: value.material,
    size: value.size,
    packCount: value.packCount,
    characterThemeLicense: value.characterThemeLicense,
  };
};

export const resolveAmazonRejectionCategory = (input: {
  approved: boolean;
  languageAccepted: boolean | null;
  parsedRejectionCategory: ProductScanAmazonRejectionCategory | null;
  mismatchLabels: ProductScanAmazonMismatchLabel[];
  sameProduct: boolean;
  pageRepresentsSameProduct: boolean;
  confidence: number;
  threshold: number;
}): ProductScanAmazonRejectionCategory | null => {
  if (input.approved) return null;
  if (input.parsedRejectionCategory !== null) return input.parsedRejectionCategory;
  if (input.languageAccepted === false) return 'language';
  if (hasVariantMismatchLabel(input.mismatchLabels)) return 'variant';
  if (input.sameProduct === false || input.pageRepresentsSameProduct === false) {
    return 'wrong_product';
  }
  return input.confidence < input.threshold ? 'low_confidence' : 'wrong_product';
};

const hasVariantMismatchLabel = (labels: ProductScanAmazonMismatchLabel[]): boolean =>
  labels.some((label) =>
    [
      'brand',
      'model',
      'color',
      'material',
      'size',
      'pack_count',
      'character_theme_license',
    ].includes(label)
  );

export const resolveAmazonRecommendedAction = (input: {
  approved: boolean;
  parsedRecommendedAction: ProductScanAmazonRecommendedAction | null;
  rejectionCategory: ProductScanAmazonRejectionCategory | null;
}): ProductScanAmazonRecommendedAction | null => {
  if (input.approved) return 'accept';
  if (input.parsedRecommendedAction !== null && input.parsedRecommendedAction !== 'accept') {
    return input.parsedRecommendedAction;
  }
  if (input.rejectionCategory !== null) return 'try_next_candidate';
  return 'reject';
};

export const createEvaluationResult = (
  input: Omit<Partial<ProductScanAmazonEvaluationResult>, 'evaluatedAt'> &
    Pick<ProductScanAmazonEvaluationResult, 'status'> & {
      evaluatedAt?: string | null;
    }
): ProductScanAmazonEvaluationResult => ({
  ...createEvaluationIdentity(input),
  ...createEvaluationLanguage(input),
  ...createEvaluationDecision(input),
  ...createEvaluationArrays(input),
  ...createEvaluationRuntimeMetadata(input),
  evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
});

const createEvaluationIdentity = (
  input: Partial<ProductScanAmazonEvaluationResult> &
    Pick<ProductScanAmazonEvaluationResult, 'status'>
): Pick<
  ProductScanAmazonEvaluationResult,
  'status' | 'stage' | 'sameProduct' | 'imageMatch' | 'descriptionMatch' | 'pageRepresentsSameProduct'
> => ({
  status: input.status,
  stage: input.stage ?? null,
  sameProduct: input.sameProduct ?? null,
  imageMatch: input.imageMatch ?? null,
  descriptionMatch: input.descriptionMatch ?? null,
  pageRepresentsSameProduct: input.pageRepresentsSameProduct ?? null,
});

const createEvaluationLanguage = (
  input: Partial<ProductScanAmazonEvaluationResult>
): Pick<
  ProductScanAmazonEvaluationResult,
  'pageLanguage' | 'languageConfidence' | 'languageAccepted' | 'languageReason'
> => ({
  pageLanguage: input.pageLanguage ?? null,
  languageConfidence: input.languageConfidence ?? null,
  languageAccepted: input.languageAccepted ?? null,
  languageReason: input.languageReason ?? null,
});

const createEvaluationDecision = (
  input: Partial<ProductScanAmazonEvaluationResult>
): Pick<
  ProductScanAmazonEvaluationResult,
  | 'confidence'
  | 'proceed'
  | 'scrapeAllowed'
  | 'recommendedAction'
  | 'rejectionCategory'
  | 'threshold'
> => ({
  confidence: input.confidence ?? null,
  proceed: input.proceed ?? false,
  scrapeAllowed: input.scrapeAllowed ?? false,
  recommendedAction: input.recommendedAction ?? null,
  rejectionCategory: input.rejectionCategory ?? null,
  threshold: input.threshold ?? null,
});

const createEvaluationArrays = (
  input: Partial<ProductScanAmazonEvaluationResult>
): Pick<
  ProductScanAmazonEvaluationResult,
  'reasons' | 'mismatches' | 'mismatchLabels' | 'variantAssessment'
> => ({
  reasons: input.reasons ?? [],
  mismatches: input.mismatches ?? [],
  mismatchLabels: input.mismatchLabels ?? [],
  variantAssessment: input.variantAssessment ?? null,
});

const createEvaluationRuntimeMetadata = (
  input: Partial<ProductScanAmazonEvaluationResult>
): Pick<
  ProductScanAmazonEvaluationResult,
  'modelId' | 'brainApplied' | 'evidence' | 'error'
> => ({
  modelId: input.modelId ?? null,
  brainApplied: input.brainApplied ?? null,
  evidence: input.evidence ?? null,
  error: input.error ?? null,
});

export const createCandidateTriageEvaluationResult = (
  input: Omit<ProductScanCandidateTriageEvaluationResult, 'evaluatedAt'> & {
    evaluatedAt?: string | null;
  }
): ProductScanCandidateTriageEvaluationResult => ({
  ...input,
  evaluatedAt: input.evaluatedAt ?? new Date().toISOString(),
});
