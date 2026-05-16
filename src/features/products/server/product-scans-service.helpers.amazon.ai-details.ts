import 'server-only';

import type { ProductScanAmazonEvaluation } from '@/shared/contracts/product-scans';

import type {
  ProductScanCandidateTriageEvaluationResult,
} from './product-scan-ai-evaluator';
import type {
  ProductScannerAmazonCandidateEvaluatorResolvedConfig,
} from './product-scanner-settings';
import { readOptionalString } from './product-scans-service.helpers.base';
import { formatEvaluationConfidence } from './product-scans-service.helpers.amazon.constants';
import {
  formatAmazonEvaluatorAllowedContentLanguage,
  formatAmazonEvaluatorLanguageDetectionMode,
  formatAmazonEvaluatorModelSource,
  formatAmazonEvaluatorSimilarityMode,
  resolveAmazonEvaluationRejectionKindLabel,
} from './product-scans-service.helpers.amazon.ai';

type Detail = { label: string; value: string | null };
type KnownProductScanAmazonEvaluation = NonNullable<ProductScanAmazonEvaluation>;

type EvaluationDetailValues = {
  candidateAsin: string | null;
  candidateUrl: string | null;
  confidence: string | null;
  descriptionMatch: string | null;
  imageMatch: string | null;
  languageAccepted: string | null;
  languageConfidence: string | null;
  languageReason: string | null;
  mismatch: string | null;
  model: string | null;
  pageLanguage: string | null;
  reason: string | null;
  recommendedAction: string | null;
  rejectionCategory: string | null;
  sameProduct: string | null;
  sourceAsin: string | null;
};

const booleanDetailValue = (value: boolean | null | undefined): string | null =>
  typeof value === 'boolean' ? String(value) : null;

const resolveAsinRelation = (
  sourceAsin: string | null,
  candidateAsin: string | null
): string | null => {
  if (sourceAsin === null || candidateAsin === null) return null;
  return sourceAsin === candidateAsin ? 'Match' : 'Conflict';
};

const buildEmptyEvaluationDetailValues = (): EvaluationDetailValues => ({
  candidateAsin: null,
  candidateUrl: null,
  confidence: null,
  descriptionMatch: null,
  imageMatch: null,
  languageAccepted: null,
  languageConfidence: null,
  languageReason: null,
  mismatch: null,
  model: null,
  pageLanguage: null,
  reason: null,
  recommendedAction: null,
  rejectionCategory: null,
  sameProduct: null,
  sourceAsin: null,
});

const buildEvaluationDetailValues = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): EvaluationDetailValues => {
  if (evaluation === null || evaluation === undefined) return buildEmptyEvaluationDetailValues();
  return buildKnownEvaluationDetailValues(evaluation);
};

const readEvaluationEvidenceString = (
  evaluation: KnownProductScanAmazonEvaluation,
  key: 'candidateAsin' | 'sourceAsin'
): string | null => readOptionalString(evaluation.evidence?.[key]);

const readEvaluationCandidateUrl = (
  evaluation: KnownProductScanAmazonEvaluation
): string | null => readOptionalString(evaluation.evidence?.candidateUrl);

const buildKnownEvaluationDetailValues = (
  evaluation: KnownProductScanAmazonEvaluation
): EvaluationDetailValues => {
  return {
    candidateAsin: readEvaluationEvidenceString(evaluation, 'candidateAsin'),
    candidateUrl: readEvaluationCandidateUrl(evaluation),
    confidence: formatEvaluationConfidence(evaluation.confidence),
    descriptionMatch: booleanDetailValue(evaluation.descriptionMatch),
    imageMatch: booleanDetailValue(evaluation.imageMatch),
    languageAccepted: booleanDetailValue(evaluation.languageAccepted),
    languageConfidence: formatEvaluationConfidence(evaluation.languageConfidence),
    languageReason: evaluation.languageReason ?? null,
    mismatch: evaluation.mismatches[0] ?? null,
    model: evaluation.modelId ?? null,
    pageLanguage: evaluation.pageLanguage ?? null,
    reason: evaluation.reasons[0] ?? null,
    recommendedAction: evaluation.recommendedAction ?? null,
    rejectionCategory: evaluation.rejectionCategory ?? null,
    sameProduct: booleanDetailValue(evaluation.sameProduct),
    sourceAsin: readOptionalString(evaluation.evidence?.sourceAsin),
  };
};

export const buildAmazonEvaluationStepDetails = (
  evaluation: ProductScanAmazonEvaluation | null | undefined,
  evaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  stage: 'probe' | 'extraction'
): Detail[] => {
  const values = buildEvaluationDetailValues(evaluation);
  return [
    { label: 'Evaluation stage', value: stage === 'probe' ? 'Probe' : 'Extraction' },
    { label: 'Model', value: values.model },
    { label: 'Threshold', value: formatEvaluationConfidence(evaluatorConfig.threshold) },
    { label: 'Rejection kind', value: resolveAmazonEvaluationRejectionKindLabel(evaluation) },
    { label: 'Confidence', value: values.confidence },
    { label: 'Same product', value: values.sameProduct },
    { label: 'Image match', value: values.imageMatch },
    { label: 'Description match', value: values.descriptionMatch },
    { label: 'Page language', value: values.pageLanguage },
    { label: 'Language accepted', value: values.languageAccepted },
    { label: 'Language confidence', value: values.languageConfidence },
    { label: 'Language reason', value: values.languageReason },
    { label: 'Recommended action', value: values.recommendedAction },
    { label: 'Rejection category', value: values.rejectionCategory },
    { label: 'Source ASIN', value: values.sourceAsin },
    { label: 'Candidate ASIN', value: values.candidateAsin },
    { label: 'ASIN relation', value: resolveAsinRelation(values.sourceAsin, values.candidateAsin) },
    { label: 'Candidate URL', value: values.candidateUrl },
    { label: 'Reason', value: values.reason },
    { label: 'Mismatch', value: values.mismatch },
  ];
};

export const buildAmazonCandidateTriageStepDetails = (
  evaluation: ProductScanCandidateTriageEvaluationResult,
  evaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  provider: string | null
): Detail[] => [
  { label: 'Evaluation stage', value: 'Candidate triage' },
  { label: 'Model', value: evaluation.modelId },
  { label: 'Model source', value: formatAmazonEvaluatorModelSource(evaluatorConfig.mode) },
  { label: 'Threshold', value: formatEvaluationConfidence(evaluatorConfig.threshold) },
  { label: 'Evaluation scope', value: evaluatorConfig.onlyForAmbiguousCandidates === true ? 'Ambiguous Amazon candidates only' : 'Every Amazon candidate' },
  { label: 'Similarity decision', value: formatAmazonEvaluatorSimilarityMode(evaluatorConfig.candidateSimilarityMode) },
  { label: 'Allowed content language', value: formatAmazonEvaluatorAllowedContentLanguage(evaluatorConfig.allowedContentLanguage) },
  { label: 'Language policy', value: evaluatorConfig.rejectNonEnglishContent !== false ? 'Reject non-English content' : 'Allow non-English content' },
  { label: 'Language detection', value: formatAmazonEvaluatorLanguageDetectionMode(evaluatorConfig.languageDetectionMode) },
  { label: 'Image search provider', value: provider },
  { label: 'Recommended action', value: evaluation.recommendedAction },
  { label: 'Rejection category', value: evaluation.rejectionCategory },
  { label: 'Kept candidates', value: String(evaluation.keptCandidateUrls.length) },
  { label: 'Candidate count', value: String(evaluation.candidates.length) },
  { label: 'Reason', value: evaluation.reasons[0] ?? null },
];
