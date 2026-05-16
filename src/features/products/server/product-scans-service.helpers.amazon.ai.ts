import 'server-only';

import type {
  ProductScanAmazonEvaluation,
} from '@/shared/contracts/product-scans';
import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';

import type {
  ProductScanCandidateTriageEvaluationResult,
} from './product-scan-ai-evaluator';
import {
  type ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  resolveProductScannerAmazonCandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
  resolveProductScannerAmazonCandidateEvaluatorTriageConfig,
} from './product-scanner-settings';
import { toRecord } from './product-scans-service.helpers.base';

type ScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
type AmazonEvaluatorBase = Omit<
  ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  'brainApplied' | 'enabled' | 'modelId' | 'systemPrompt'
>;
type EnabledEvaluatorFields = Pick<
  Extract<ProductScannerAmazonCandidateEvaluatorResolvedConfig, { enabled: true }>,
  'brainApplied' | 'modelId' | 'systemPrompt'
>;

export type AmazonAiStageSummary = {
  stage: 'candidate_triage' | 'probe_evaluate' | 'extraction_evaluate' | 'candidate_triage_retry';
  status: string;
  model: string | null;
  threshold: number | null;
  candidateRankBefore: number | null;
  candidateRankAfter: number | null;
  recommendedAction: string | null;
  rejectionCategory: string | null;
  pageLanguage: string | null;
  languageAccepted: boolean | null;
  topReasons: string[];
  provider: string | null;
  evaluatedAt: string | null;
};

export const appendAmazonAiStageSummary = (
  rawResult: unknown,
  summary: AmazonAiStageSummary
): Record<string, unknown> => {
  const existingRawResult = toRecord(rawResult) ?? {};
  const existingEvidence = toRecord(existingRawResult['amazonAiEvidence']) ?? {};
  const stages = existingEvidence['stages'];
  const existingStages = Array.isArray(stages)
    ? stages.filter(
        (entry): entry is Record<string, unknown> =>
          entry !== null && entry !== undefined && typeof entry === 'object' && !Array.isArray(entry)
      )
    : [];
  return {
    ...existingRawResult,
    amazonAiEvidence: { ...existingEvidence, stages: [...existingStages, summary].slice(-20) },
  };
};

const resolveEvaluationLanguageAccepted = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): boolean | null =>
  typeof evaluation?.languageAccepted === 'boolean' ? evaluation.languageAccepted : null;

const resolveEvaluationReasons = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string[] => evaluation?.reasons.slice(0, 3) ?? [];

const buildEvaluationStageDetails = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): Pick<
  AmazonAiStageSummary,
  | 'evaluatedAt'
  | 'languageAccepted'
  | 'model'
  | 'pageLanguage'
  | 'recommendedAction'
  | 'rejectionCategory'
  | 'status'
  | 'threshold'
  | 'topReasons'
> => {
  if (evaluation === null || evaluation === undefined) {
    return {
      evaluatedAt: null,
      languageAccepted: null,
      model: null,
      pageLanguage: null,
      recommendedAction: null,
      rejectionCategory: null,
      status: 'failed',
      threshold: null,
      topReasons: [],
    };
  }
  return {
    evaluatedAt: evaluation.evaluatedAt,
    languageAccepted: resolveEvaluationLanguageAccepted(evaluation),
    model: evaluation.modelId,
    pageLanguage: evaluation.pageLanguage ?? null,
    recommendedAction: evaluation.recommendedAction,
    rejectionCategory: evaluation.rejectionCategory,
    status: evaluation.status,
    threshold: evaluation.threshold,
    topReasons: resolveEvaluationReasons(evaluation),
  };
};

export const buildAmazonEvaluationStageSummary = (
  evaluation: ProductScanAmazonEvaluation | null | undefined,
  input: {
    stage: AmazonAiStageSummary['stage'];
    candidateRankBefore: number | null;
    candidateRankAfter?: number | null;
    provider?: string | null;
  }
): AmazonAiStageSummary => ({
  ...buildEvaluationStageDetails(evaluation),
  candidateRankAfter: input.candidateRankAfter ?? null,
  candidateRankBefore: input.candidateRankBefore,
  provider: input.provider ?? null,
  stage: input.stage,
});

type AmazonTriageCandidate = ProductScanCandidateTriageEvaluationResult['candidates'][number] | null;

const resolveTriageCandidateLanguageAccepted = (
  candidate: AmazonTriageCandidate
): boolean | null =>
  typeof candidate?.languageAccepted === 'boolean' ? candidate.languageAccepted : null;

export const buildAmazonCandidateTriageStageSummary = (
  evaluation: ProductScanCandidateTriageEvaluationResult,
  provider: string | null
): AmazonAiStageSummary => {
  const candidate = evaluation.candidates[0] ?? null;
  return {
    stage: 'candidate_triage',
    status: evaluation.status,
    model: evaluation.modelId,
    threshold: evaluation.threshold,
    candidateRankBefore: candidate?.rankBefore ?? null,
    candidateRankAfter: candidate?.rankAfter ?? null,
    recommendedAction: evaluation.recommendedAction,
    rejectionCategory: evaluation.rejectionCategory,
    pageLanguage: candidate?.pageLanguage ?? null,
    languageAccepted: resolveTriageCandidateLanguageAccepted(candidate),
    topReasons: evaluation.reasons.slice(0, 3),
    provider,
    evaluatedAt: evaluation.evaluatedAt,
  };
};

const resolveMergedEvaluatorEnabled = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): boolean => {
  if (typeof overrideConfig?.enabled === 'boolean') return overrideConfig.enabled;
  if (typeof baseConfig?.enabled === 'boolean') return baseConfig.enabled;
  return false;
};

const resolveEvaluatorBaseValue = <K extends keyof AmazonEvaluatorBase>({
  baseConfig,
  fallback,
  key,
  overrideConfig,
}: {
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined;
  fallback: AmazonEvaluatorBase[K];
  key: K;
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null;
}): AmazonEvaluatorBase[K] => {
  const overrideValue = overrideConfig?.[key] as AmazonEvaluatorBase[K] | undefined;
  if (overrideValue !== undefined) return overrideValue;
  const baseValue = baseConfig?.[key] as AmazonEvaluatorBase[K] | undefined;
  return baseValue ?? fallback;
};

const resolveMergedEvaluatorBase = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): AmazonEvaluatorBase => ({
  allowedContentLanguage: resolveEvaluatorBaseValue({ baseConfig, overrideConfig, key: 'allowedContentLanguage', fallback: 'en' }),
  candidateSimilarityMode: resolveEvaluatorBaseValue({ baseConfig, overrideConfig, key: 'candidateSimilarityMode', fallback: 'deterministic_then_ai' }),
  languageDetectionMode: resolveEvaluatorBaseValue({ baseConfig, overrideConfig, key: 'languageDetectionMode', fallback: 'deterministic_then_ai' }),
  mode: resolveEvaluatorBaseValue({ baseConfig, overrideConfig, key: 'mode', fallback: 'disabled' }),
  onlyForAmbiguousCandidates: resolveEvaluatorBaseValue({ baseConfig, overrideConfig, key: 'onlyForAmbiguousCandidates', fallback: false }),
  rejectNonEnglishContent: resolveEvaluatorBaseValue({ baseConfig, overrideConfig, key: 'rejectNonEnglishContent', fallback: true }),
  threshold: resolveEvaluatorBaseValue({ baseConfig, overrideConfig, key: 'threshold', fallback: 0.85 }),
});

const buildDisabledMergedEvaluatorConfig = (
  base: AmazonEvaluatorBase
): ProductScannerAmazonCandidateEvaluatorResolvedConfig => ({
  ...base,
  brainApplied: null,
  enabled: false,
  modelId: null,
  systemPrompt: null,
});

const resolveEnabledEvaluatorModelId = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): string | null =>
  overrideConfig?.modelId ?? (baseConfig?.enabled === true ? baseConfig.modelId : null);

const resolveEnabledEvaluatorSystemPrompt = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): string | null =>
  overrideConfig?.systemPrompt ?? (baseConfig?.enabled === true ? baseConfig.systemPrompt : null);

const resolveEnabledEvaluatorBrainApplied = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): Record<string, unknown> | null =>
  overrideConfig?.brainApplied ?? (baseConfig?.enabled === true ? baseConfig.brainApplied : null);

const resolveEnabledEvaluatorFields = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): EnabledEvaluatorFields | null => {
  const modelId = resolveEnabledEvaluatorModelId(baseConfig, overrideConfig);
  const systemPrompt = resolveEnabledEvaluatorSystemPrompt(baseConfig, overrideConfig);
  if (modelId === null || systemPrompt === null) return null;
  return {
    brainApplied: resolveEnabledEvaluatorBrainApplied(baseConfig, overrideConfig),
    modelId,
    systemPrompt,
  };
};

export const mergeAmazonCandidateEvaluatorConfig = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): ProductScannerAmazonCandidateEvaluatorResolvedConfig => {
  const base = resolveMergedEvaluatorBase(baseConfig, overrideConfig);
  if (!resolveMergedEvaluatorEnabled(baseConfig, overrideConfig)) {
    return buildDisabledMergedEvaluatorConfig(base);
  }
  const enabledFields = resolveEnabledEvaluatorFields(baseConfig, overrideConfig);
  if (enabledFields === null) return buildDisabledMergedEvaluatorConfig(base);
  return { ...base, ...enabledFields, enabled: true };
};

const resolveAmazonEvaluatorConfig = async (
  scannerSettings: ScannerSettings,
  resolveOverride: (
    settings: ScannerSettings
  ) => Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig>
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  const baseConfig = await resolveProductScannerAmazonCandidateEvaluatorConfig(scannerSettings);
  try {
    return mergeAmazonCandidateEvaluatorConfig(baseConfig, await resolveOverride(scannerSettings));
  } catch {
    return mergeAmazonCandidateEvaluatorConfig(baseConfig, null);
  }
};

export const resolveAmazonProbeEvaluatorConfig = async (
  scannerSettings: ScannerSettings
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> =>
  resolveAmazonEvaluatorConfig(scannerSettings, resolveProductScannerAmazonCandidateEvaluatorProbeConfig);

export const resolveAmazonTriageEvaluatorConfig = async (
  scannerSettings: ScannerSettings
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> =>
  resolveAmazonEvaluatorConfig(scannerSettings, resolveProductScannerAmazonCandidateEvaluatorTriageConfig);

export const resolveAmazonExtractionEvaluatorConfig = async (
  scannerSettings: ScannerSettings
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> =>
  resolveAmazonEvaluatorConfig(scannerSettings, resolveProductScannerAmazonCandidateEvaluatorExtractionConfig);

export const formatAmazonEvaluatorAllowedContentLanguage = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['allowedContentLanguage'] | null | undefined
): string => {
  if (value === undefined || value === null || value === '' || value === 'en') return 'English';
  return String(value).toUpperCase();
};

export const formatAmazonEvaluatorLanguageDetectionMode = (
  value:
    | ProductScannerAmazonCandidateEvaluatorResolvedConfig['languageDetectionMode']
    | null
    | undefined
): string => (value === 'ai_only' ? 'AI only' : 'Deterministic first, then AI');

export const formatAmazonEvaluatorSimilarityMode = (
  value:
    | ProductScannerAmazonCandidateEvaluatorResolvedConfig['candidateSimilarityMode']
    | null
    | undefined
): string => (value === 'ai_only' ? 'AI only' : 'Deterministic hints, then AI');

export const formatAmazonEvaluatorModelSource = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['mode'] | null | undefined
): string | null => {
  if (value === 'brain_default') return 'AI Brain default';
  if (value === 'model_override') return 'Scanner override';
  return null;
};

export const resolveAmazonEvaluationRejectionKindLabel = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string | null => {
  if (evaluation?.status !== 'rejected') return null;
  if (evaluation.rejectionCategory === 'language' || evaluation.languageAccepted === false) return 'Language gate';
  if (evaluation.rejectionCategory === 'variant') return 'Variant mismatch';
  if (evaluation.rejectionCategory === 'low_confidence') return 'Low confidence';
  return 'Product mismatch';
};
