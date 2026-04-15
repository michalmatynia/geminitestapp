import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  startPlaywrightEngineTask,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  type ProductScanAmazonEvaluation,
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';

import {
  type AmazonCandidateTriageEvaluationResult,
} from './product-scan-amazon-evaluator';
import {
  type ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  resolveProductScannerAmazonCandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorTriageConfig,
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
} from './product-scanner-settings';

import {
  toRecord,
  readOptionalString,
  resolvePersistableScanUrl,
  resolveIsoAgeMs,
} from './product-scans-service.helpers';

export const AMAZON_SCAN_DEFAULT_SLOW_MO_MS = 80;
export const AMAZON_BATCH_SCAN_START_CONCURRENCY = 1;
export const AMAZON_SCAN_DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const AMAZON_SCAN_STEALTH_LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled'];

export const isApprovedAmazonCandidateExtractionRun = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'amazonEvaluation'>
): boolean =>
  toRecord(scan.rawResult)?.['approvedCandidateExtraction'] === true &&
  (scan.amazonEvaluation?.status === 'approved' || scan.amazonEvaluation?.status === 'skipped');

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
  const existingStages = Array.isArray(existingEvidence['stages'])
    ? existingEvidence['stages'].filter(
        (entry): entry is Record<string, unknown> =>
          entry != null && typeof entry === 'object' && !Array.isArray(entry)
      )
    : [];

  return {
    ...existingRawResult,
    amazonAiEvidence: {
      ...existingEvidence,
      stages: [...existingStages, summary].slice(-20),
    },
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
  stage: input.stage,
  status: evaluation?.status ?? 'failed',
  model: evaluation?.modelId ?? null,
  threshold: evaluation?.threshold ?? null,
  candidateRankBefore: input.candidateRankBefore,
  candidateRankAfter: input.candidateRankAfter ?? null,
  recommendedAction: evaluation?.recommendedAction ?? null,
  rejectionCategory: evaluation?.rejectionCategory ?? null,
  pageLanguage: evaluation?.pageLanguage ?? null,
  languageAccepted:
    typeof evaluation?.languageAccepted === 'boolean' ? evaluation.languageAccepted : null,
  topReasons: evaluation?.reasons.slice(0, 3) ?? [],
  provider: input.provider ?? null,
  evaluatedAt: evaluation?.evaluatedAt ?? null,
});

export const buildAmazonCandidateTriageStageSummary = (
  evaluation: AmazonCandidateTriageEvaluationResult,
  provider: string | null
): AmazonAiStageSummary => ({
  stage: 'candidate_triage',
  status: evaluation.status,
  model: evaluation.modelId,
  threshold: evaluation.threshold,
  candidateRankBefore: evaluation.candidates[0]?.rankBefore ?? null,
  candidateRankAfter: evaluation.candidates[0]?.rankAfter ?? null,
  recommendedAction: evaluation.recommendedAction,
  rejectionCategory: evaluation.rejectionCategory,
  pageLanguage: evaluation.candidates[0]?.pageLanguage ?? null,
  languageAccepted:
    typeof evaluation.candidates[0]?.languageAccepted === 'boolean'
      ? evaluation.candidates[0].languageAccepted
      : null,
  topReasons: evaluation.reasons.slice(0, 3),
  provider,
  evaluatedAt: evaluation.evaluatedAt,
});

export const mergeUniqueStringValues = (
  values: ReadonlyArray<string>,
  nextValues: ReadonlyArray<string>
): string[] => {
  const merged = new Set(values.filter((value) => value.trim().length > 0));
  for (const value of nextValues) {
    const normalized = value.trim();
    if (normalized.length > 0) {
      merged.add(normalized);
    }
  }
  return Array.from(merged);
};

export const buildAmazonScannerRequestRuntimeOptions = (input: {
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  scannerEngineRequestOptions: Record<string, unknown>;
  forceHeadless?: boolean;
}): Pick<
  NonNullable<Parameters<typeof startPlaywrightEngineTask>[0]['request']>,
  'personaId' | 'settingsOverrides' | 'launchOptions' | 'contextOptions'
> => {
  const scannerEngineRequestOptions =
    input.scannerEngineRequestOptions &&
    typeof input.scannerEngineRequestOptions === 'object'
      ? (input.scannerEngineRequestOptions as {
          settingsOverrides?: unknown;
          launchOptions?: unknown;
          contextOptions?: unknown;
          personaId?: unknown;
        })
      : {};
  const existingSettingsOverrides =
    toRecord(scannerEngineRequestOptions.settingsOverrides) ?? {};
  const existingLaunchOptions = toRecord(scannerEngineRequestOptions.launchOptions) ?? {};
  const existingContextOptions =
    toRecord(scannerEngineRequestOptions.contextOptions) ?? {};

  const settingsOverrides: Record<string, unknown> = {
    ...existingSettingsOverrides,
  };

  if (typeof input.forceHeadless === 'boolean') {
    settingsOverrides['headless'] = input.forceHeadless;
  }

  if (!input.scannerSettings.playwrightPersonaId) {
    if (typeof settingsOverrides['humanizeMouse'] !== 'boolean') {
      settingsOverrides['humanizeMouse'] = true;
    }
    const slowMo = settingsOverrides['slowMo'];
    if (typeof slowMo !== 'number' || !Number.isFinite(slowMo) || slowMo <= 0) {
      settingsOverrides['slowMo'] = AMAZON_SCAN_DEFAULT_SLOW_MO_MS;
    }
  }

  const existingLaunchArgs = Array.isArray(existingLaunchOptions['args'])
    ? existingLaunchOptions['args'].filter((entry): entry is string => typeof entry === 'string')
    : [];

  const launchOptions: Record<string, unknown> = {
    ...existingLaunchOptions,
    args: mergeUniqueStringValues(existingLaunchArgs, AMAZON_SCAN_STEALTH_LAUNCH_ARGS),
  };

  const contextOptions: Record<string, unknown> = {
    ...existingContextOptions,
  };
  if (typeof contextOptions['userAgent'] !== 'string' || contextOptions['userAgent'].trim().length === 0) {
    contextOptions['userAgent'] = AMAZON_SCAN_DEFAULT_USER_AGENT;
  }

  return {
    ...(typeof scannerEngineRequestOptions.personaId === 'string' &&
    scannerEngineRequestOptions.personaId.trim().length > 0
      ? { personaId: scannerEngineRequestOptions.personaId }
      : {}),
    settingsOverrides,
    launchOptions,
    contextOptions,
  };
};

export const resolveAmazonImageSearchProvider = (
  rawResult: unknown,
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>
) => {
  const rawRecord = toRecord(rawResult);
  const rawProvider = readOptionalString(rawRecord?.['imageSearchProvider']);
  if (rawProvider === 'google_images_url' || rawProvider === 'google_lens_upload') {
    return rawProvider;
  }
  return scannerSettings.amazonImageSearchProvider;
};

export const normalizeAmazonImageSearchProvider = (
  value: unknown
): ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider'] | null =>
  value === 'google_images_upload' ||
  value === 'google_images_url' ||
  value === 'google_lens_upload'
    ? (value as ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider'])
    : null;

export const resolveAmazonImageSearchProviderHistory = (
  rawResult: unknown,
  currentProvider: ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider']
) => {
  const rawRecord = toRecord(rawResult);
  const history = Array.isArray(rawRecord?.['imageSearchProviderHistory'])
    ? rawRecord['imageSearchProviderHistory']
        .map((value) => normalizeAmazonImageSearchProvider(value))
        .filter(
          (
            value
          ): value is ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider'] =>
            value != null
        )
    : [];
  const current = normalizeAmazonImageSearchProvider(rawRecord?.['imageSearchProvider']);
  return Array.from(new Set([...history, current ?? currentProvider, currentProvider]));
};

export const mergeAmazonCandidateEvaluatorConfig = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): ProductScannerAmazonCandidateEvaluatorResolvedConfig => {
  const normalizedBaseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig = {
    enabled: baseConfig?.enabled ?? false,
    mode: baseConfig?.mode ?? 'disabled',
    threshold: baseConfig?.threshold ?? 0.85,
    onlyForAmbiguousCandidates: baseConfig?.onlyForAmbiguousCandidates ?? false,
    candidateSimilarityMode:
      baseConfig?.candidateSimilarityMode ?? 'deterministic_then_ai',
    allowedContentLanguage: baseConfig?.allowedContentLanguage ?? 'en',
    rejectNonEnglishContent: baseConfig?.rejectNonEnglishContent ?? true,
    languageDetectionMode:
      baseConfig?.languageDetectionMode ?? 'deterministic_then_ai',
    modelId: baseConfig?.modelId ?? null,
    systemPrompt: baseConfig?.systemPrompt ?? null,
    brainApplied: baseConfig?.brainApplied ?? null,
  };

  return {
  enabled: overrideConfig?.enabled ?? normalizedBaseConfig.enabled,
  mode: overrideConfig?.mode ?? normalizedBaseConfig.mode,
  threshold: overrideConfig?.threshold ?? normalizedBaseConfig.threshold,
  onlyForAmbiguousCandidates:
    overrideConfig?.onlyForAmbiguousCandidates ?? normalizedBaseConfig.onlyForAmbiguousCandidates,
  candidateSimilarityMode:
    overrideConfig?.candidateSimilarityMode ?? normalizedBaseConfig.candidateSimilarityMode,
  allowedContentLanguage:
    overrideConfig?.allowedContentLanguage ?? normalizedBaseConfig.allowedContentLanguage,
  rejectNonEnglishContent:
    overrideConfig?.rejectNonEnglishContent ?? normalizedBaseConfig.rejectNonEnglishContent,
  languageDetectionMode:
    overrideConfig?.languageDetectionMode ?? normalizedBaseConfig.languageDetectionMode,
  modelId: overrideConfig?.modelId ?? normalizedBaseConfig.modelId,
  systemPrompt: overrideConfig?.systemPrompt ?? normalizedBaseConfig.systemPrompt,
  brainApplied: overrideConfig?.brainApplied ?? normalizedBaseConfig.brainApplied,
};
};

export const resolveAmazonProbeEvaluatorConfig = async (
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  const baseConfig = await resolveProductScannerAmazonCandidateEvaluatorConfig(scannerSettings);
  try {
    return mergeAmazonCandidateEvaluatorConfig(
      baseConfig,
      await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings)
    );
  } catch {
    return mergeAmazonCandidateEvaluatorConfig(baseConfig, null);
  }
};

export const resolveAmazonTriageEvaluatorConfig = async (
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  const baseConfig = await resolveProductScannerAmazonCandidateEvaluatorConfig(scannerSettings);
  try {
    return mergeAmazonCandidateEvaluatorConfig(
      baseConfig,
      await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(scannerSettings)
    );
  } catch {
    return mergeAmazonCandidateEvaluatorConfig(baseConfig, null);
  }
};

export const resolveAmazonExtractionEvaluatorConfig = async (
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>
): Promise<ProductScannerAmazonCandidateEvaluatorResolvedConfig> => {
  const baseConfig = await resolveProductScannerAmazonCandidateEvaluatorConfig(scannerSettings);
  try {
    return mergeAmazonCandidateEvaluatorConfig(
      baseConfig,
      await resolveProductScannerAmazonCandidateEvaluatorExtractionConfig(scannerSettings)
    );
  } catch {
    return mergeAmazonCandidateEvaluatorConfig(baseConfig, null);
  }
};

export const resolveAmazonImageSearchFallbackProvider = (input: {
  rawResult: unknown;
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  currentProvider: ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider'];
}) => {
  const fallbackProvider = normalizeAmazonImageSearchProvider(
    input.scannerSettings.amazonImageSearchFallbackProvider
  );
  if (!fallbackProvider || fallbackProvider === input.currentProvider) {
    return null;
  }
  const history = resolveAmazonImageSearchProviderHistory(
    input.rawResult,
    input.currentProvider
  );
  return history.includes(fallbackProvider) ? null : fallbackProvider;
};

export const formatAmazonEvaluationConfidence = (confidence: number | null | undefined): string | null =>
  typeof confidence === 'number' && Number.isFinite(confidence)
    ? `${Math.round(confidence * 100)}%`
    : null;

export const resolveAmazonEvaluationStepStatus = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): ProductScanRecord['steps'][number]['status'] => {
  if (!evaluation) {
    return 'failed';
  }
  if (evaluation.status === 'approved') {
    return 'completed';
  }
  if (evaluation.status === 'skipped') {
    return 'skipped';
  }
  return 'failed';
};

export const resolveAmazonCandidateTriageStepStatus = (
  evaluation: AmazonCandidateTriageEvaluationResult | null | undefined
): ProductScanRecord['steps'][number]['status'] => {
  if (!evaluation) {
    return 'failed';
  }
  if (evaluation.status === 'approved') {
    return 'completed';
  }
  if (evaluation.status === 'skipped') {
    return 'skipped';
  }
  return 'failed';
};

export const resolveAmazonCandidateTriageStepResultCode = (
  evaluation: AmazonCandidateTriageEvaluationResult | null | undefined
): string => {
  if (!evaluation) {
    return 'triage_failed';
  }
  if (evaluation.status === 'approved') {
    return 'candidates_triaged';
  }
  if (evaluation.status === 'skipped') {
    return 'triage_skipped';
  }
  if (evaluation.recommendedAction === 'fallback_provider') {
    return 'provider_fallback_requested';
  }
  return 'triage_rejected';
};

export const resolveAmazonCandidateTriageMessage = (
  evaluation: AmazonCandidateTriageEvaluationResult | null | undefined
): string => {
  if (!evaluation) {
    return 'Amazon candidate triage failed.';
  }
  if (evaluation.status === 'approved') {
    return evaluation.keptCandidateUrls.length > 1
      ? `Amazon candidate triage kept ${evaluation.keptCandidateUrls.length} candidates and reranked them.`
      : 'Amazon candidate triage selected the best candidate.';
  }
  if (evaluation.status === 'skipped') {
    return (
      evaluation.reasons[0] ??
      'Skipped Amazon candidate triage because deterministic hints already identified the best candidate.'
    );
  }
  if (evaluation.recommendedAction === 'fallback_provider') {
    return 'Amazon candidate triage requested a fallback image-search provider.';
  }
  if (evaluation.status === 'rejected') {
    return (
      evaluation.reasons[0] ?? 'Amazon candidate triage rejected the current Google candidate set.'
    );
  }
  return evaluation.error ?? 'Amazon candidate triage failed.';
};

export const formatAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = readOptionalString(value, 160);
  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .trim();
};

export const humanizeAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = formatAmazonRuntimeStageLabel(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const buildAmazonActiveRunDiagnostics = (
  run: PlaywrightEngineRunRecord
): Record<string, unknown> => {
  const metaRecord =
    toRecord(buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true })) ?? {};
  const metaRawResult = toRecord(metaRecord['rawResult']) ?? {};
  const failureArtifacts = Array.isArray(metaRecord['failureArtifacts'])
    ? metaRecord['failureArtifacts']
    : (Array.isArray(metaRawResult['failureArtifacts'])
        ? metaRawResult['failureArtifacts']
        : null);
  const logTail = Array.isArray(metaRecord['logTail'])
    ? metaRecord['logTail']
    : (Array.isArray(metaRawResult['logTail']) ? metaRawResult['logTail'] : null);
  const runtimePosture = toRecord(metaRecord['runtimePosture']) ?? toRecord(metaRawResult['runtimePosture']);

  return {
    ...metaRawResult,
    ...(readOptionalString(metaRecord['runId']) || readOptionalString(metaRawResult['runId'])
      ? {
          runId:
            readOptionalString(metaRecord['runId']) ?? readOptionalString(metaRawResult['runId']),
        }
      : {}),
    ...(readOptionalString(metaRecord['runStatus']) ||
    readOptionalString(metaRawResult['runStatus'])
      ? {
          runStatus:
            readOptionalString(metaRecord['runStatus']) ??
            readOptionalString(metaRawResult['runStatus']),
        }
      : {}),
    ...(resolvePersistableScanUrl(metaRecord['finalUrl'], metaRawResult['finalUrl'])
      ? {
          finalUrl: resolvePersistableScanUrl(metaRecord['finalUrl'], metaRawResult['finalUrl']),
        }
      : {}),
    ...(readOptionalString(metaRecord['latestStage']) ||
    readOptionalString(metaRawResult['latestStage']) ||
    readOptionalString(metaRawResult['stage'])
      ? {
          latestStage:
            readOptionalString(metaRecord['latestStage']) ??
            readOptionalString(metaRawResult['latestStage']) ??
            readOptionalString(metaRawResult['stage']),
        }
      : {}),
    ...(resolvePersistableScanUrl(
      metaRecord['latestStageUrl'],
      metaRawResult['latestStageUrl'],
      metaRawResult['currentUrl']
    )
      ? {
          latestStageUrl: resolvePersistableScanUrl(
            metaRecord['latestStageUrl'],
            metaRawResult['latestStageUrl'],
            metaRawResult['currentUrl']
          ),
        }
      : {}),
    ...(failureArtifacts ? { failureArtifacts } : {}),
    ...(logTail ? { logTail } : {}),
    ...(runtimePosture ? { runtimePosture } : {}),
  };
};

export const resolveAmazonActiveRunStallMessage = ({
  reason,
  latestStage,
}: {
  reason: 'runtime_exceeded' | 'no_progress' | 'manual_verification_expired';
  latestStage: string | null;
}): string => {
  const displayStage = humanizeAmazonRuntimeStageLabel(latestStage);
  if (reason === 'manual_verification_expired') {
    return displayStage
      ? `Google Lens manual verification expired at ${displayStage}.`
      : 'Google Lens manual verification expired before completion.';
  }

  if (reason === 'no_progress') {
    return displayStage
      ? `Amazon reverse image scan stalled at ${displayStage}.`
      : 'Amazon reverse image scan stopped making progress.';
  }

  return displayStage
    ? `Amazon reverse image scan timed out at ${displayStage}.`
    : 'Amazon reverse image scan exceeded its runtime limit.';
};

export const shouldKeepAmazonManualVerificationPending = (input: {
  parsedStatus: string | null;
  existingPending: boolean;
  latestStage: string | null;
}): boolean => {
  const waitingForManualVerification =
    input.parsedStatus === 'captcha_required' ||
    (input.existingPending &&
      (input.parsedStatus === 'running' || input.parsedStatus == null));
  if (!waitingForManualVerification) {
    return false;
  }

  const normalizedStage = input.latestStage?.trim().toLowerCase() ?? null;
  if (!normalizedStage) {
    return true;
  }

  return !(
    normalizedStage.startsWith('amazon_') ||
    normalizedStage.startsWith('supplier_') ||
    normalizedStage === 'product_asin_update'
  );
};

export const resolveAmazonEvaluationStepResultCode = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string => {
  if (!evaluation) {
    return 'evaluation_failed';
  }
  if (evaluation.status === 'approved') {
    return 'candidate_approved';
  }
  if (evaluation.status === 'rejected') {
    return evaluation.languageAccepted === false
      ? 'candidate_language_rejected'
      : 'candidate_rejected';
  }
  if (evaluation.status === 'skipped') {
    return 'evaluation_skipped';
  }
  return 'evaluation_failed';
};

export const resolveAmazonEvaluationMessage = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string => {
  if (!evaluation) {
    return 'Amazon candidate AI evaluation failed.';
  }
  const confidenceLabel = formatAmazonEvaluationConfidence(evaluation.confidence);
  if (evaluation.status === 'approved') {
    return confidenceLabel
      ? `AI evaluator approved the Amazon candidate (${confidenceLabel}).`
      : 'AI evaluator approved the Amazon candidate.';
  }
  if (evaluation.status === 'rejected') {
    if (evaluation.languageAccepted === false) {
      return confidenceLabel
        ? `AI evaluator rejected the Amazon candidate because page content is not English (${confidenceLabel}).`
        : 'AI evaluator rejected the Amazon candidate because page content is not English.';
    }
    return confidenceLabel
      ? `AI evaluator rejected the Amazon candidate (${confidenceLabel}).`
      : 'AI evaluator rejected the Amazon candidate.';
  }
  if (evaluation.status === 'skipped') {
    return (
      evaluation.reasons[0] ??
      'Skipped Amazon candidate AI evaluation because deterministic identifiers already matched.'
    );
  }
  return evaluation.error ?? 'Amazon candidate AI evaluation failed.';
};

export const formatAmazonEvaluatorAllowedContentLanguage = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['allowedContentLanguage'] | null | undefined
): string => {
  if (!value || value === 'en') {
    return 'English';
  }

  return String(value).toUpperCase();
};

export const formatAmazonEvaluatorLanguageDetectionMode = (
  value:
    | ProductScannerAmazonCandidateEvaluatorResolvedConfig['languageDetectionMode']
    | null
    | undefined
): string => {
  if (value === 'ai_only') {
    return 'AI only';
  }

  return 'Deterministic first, then AI';
};

export const formatAmazonEvaluatorSimilarityMode = (
  value:
    | ProductScannerAmazonCandidateEvaluatorResolvedConfig['candidateSimilarityMode']
    | null
    | undefined
): string => {
  if (value === 'ai_only') {
    return 'AI only';
  }

  return 'Deterministic hints, then AI';
};

export const formatAmazonEvaluatorModelSource = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['mode'] | null | undefined
): string | null => {
  if (value === 'brain_default') {
    return 'AI Brain default';
  }

  if (value === 'model_override') {
    return 'Scanner override';
  }

  return null;
};

export const resolveAmazonEvaluationRejectionKindLabel = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): string | null => {
  if (evaluation?.status !== 'rejected') {
    return null;
  }

  if (evaluation.rejectionCategory === 'language' || evaluation.languageAccepted === false) {
    return 'Language gate';
  }
  if (evaluation.rejectionCategory === 'variant') {
    return 'Variant mismatch';
  }
  if (evaluation.rejectionCategory === 'low_confidence') {
    return 'Low confidence';
  }

  return 'Product mismatch';
};

export const resolveNextAmazonCandidateUrl = (input: {
  candidateUrls: string[];
  currentUrl: string | null;
}): {
  nextUrl: string | null;
  nextRank: number | null;
  remainingCandidateUrls: string[];
} => {
  const normalizedUrls = input.candidateUrls.filter(
    (value, index, values) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      values.findIndex((entry) => entry === value) === index
  );
  if (normalizedUrls.length === 0) {
    return {
      nextUrl: null,
      nextRank: null,
      remainingCandidateUrls: [],
    };
  }

  const currentIndex = input.currentUrl ? normalizedUrls.indexOf(input.currentUrl) : -1;
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  const nextUrl = normalizedUrls[nextIndex] ?? null;
  return {
    nextUrl,
    nextRank: nextUrl ? nextIndex + 1 : null,
    remainingCandidateUrls: nextUrl ? normalizedUrls.slice(nextIndex) : [],
  };
};

export const resolveNextQueueStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    1,
    ...steps
      .filter((step) => step.key === 'queue_scan')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;

export const resolveNextAmazonEvaluationStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    0,
    ...steps
      .filter((step) => step.key === 'amazon_ai_evaluate')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;

export const resolveNextAmazonCandidateTriageStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    0,
    ...steps
      .filter((step) => step.key === 'amazon_ai_triage')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;

export const resolveLatestAmazonCandidateStepMeta = (
  steps: ProductScanRecord['steps']
): {
  candidateId: string | null;
  candidateRank: number | null;
  url: string | null;
} => {
  const latestCandidateStep =
    [...steps].reverse().find((step) =>
      step.key === 'amazon_extract' ||
      step.key === 'amazon_probe' ||
      step.key === 'amazon_content_ready' ||
      step.key === 'amazon_open'
    ) ?? null;

  return {
    candidateId: latestCandidateStep?.candidateId?.trim() || null,
    candidateRank:
      typeof latestCandidateStep?.candidateRank === 'number' &&
      Number.isFinite(latestCandidateStep.candidateRank) &&
      latestCandidateStep.candidateRank > 0
        ? latestCandidateStep.candidateRank
        : null,
    url: latestCandidateStep?.url?.trim() || null,
  };
};

export const buildAmazonEvaluationStepDetails = (
  evaluation: ProductScanAmazonEvaluation | null | undefined,
  evaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  stage: 'probe' | 'extraction'
): Array<{ label: string; value: string | null }> => [
  {
    label: 'Evaluation stage',
    value: stage === 'probe' ? 'Probe' : 'Extraction',
  },
  { label: 'Model', value: evaluation?.modelId ?? null },
  {
    label: 'Model source',
    value: formatAmazonEvaluatorModelSource(evaluatorConfig.mode),
  },
  {
    label: 'Threshold',
    value: formatAmazonEvaluationConfidence(evaluatorConfig.threshold),
  },
  {
    label: 'Evaluation scope',
    value: evaluatorConfig.onlyForAmbiguousCandidates
      ? 'Ambiguous Amazon candidates only'
      : 'Every Amazon candidate',
  },
  {
    label: 'Similarity decision',
    value: formatAmazonEvaluatorSimilarityMode(evaluatorConfig.candidateSimilarityMode),
  },
  {
    label: 'Allowed content language',
    value: formatAmazonEvaluatorAllowedContentLanguage(evaluatorConfig.allowedContentLanguage),
  },
  {
    label: 'Language policy',
    value: evaluatorConfig.rejectNonEnglishContent !== false
      ? 'Reject non-English content'
      : 'Allow non-English content',
  },
  {
    label: 'Language detection',
    value: formatAmazonEvaluatorLanguageDetectionMode(evaluatorConfig.languageDetectionMode),
  },
  {
    label: 'Rejection kind',
    value: resolveAmazonEvaluationRejectionKindLabel(evaluation),
  },
  {
    label: 'Confidence',
    value: formatAmazonEvaluationConfidence(evaluation?.confidence),
  },
  {
    label: 'Same product',
    value:
      typeof evaluation?.sameProduct === 'boolean' ? String(evaluation.sameProduct) : null,
  },
  {
    label: 'Image match',
    value:
      typeof evaluation?.imageMatch === 'boolean' ? String(evaluation.imageMatch) : null,
  },
  {
    label: 'Description match',
    value:
      typeof evaluation?.descriptionMatch === 'boolean'
        ? String(evaluation.descriptionMatch)
        : null,
  },
  {
    label: 'Page language',
    value: evaluation?.pageLanguage ?? null,
  },
  {
    label: 'Language accepted',
    value:
      typeof evaluation?.languageAccepted === 'boolean'
        ? String(evaluation.languageAccepted)
        : null,
  },
  {
    label: 'Language confidence',
    value: formatAmazonEvaluationConfidence(evaluation?.languageConfidence),
  },
  {
    label: 'Language reason',
    value: evaluation?.languageReason ?? null,
  },
  {
    label: 'Recommended action',
    value: evaluation?.recommendedAction ?? null,
  },
  {
    label: 'Rejection category',
    value: evaluation?.rejectionCategory ?? null,
  },
  {
    label: 'Mismatch labels',
    value: evaluation?.mismatchLabels?.join(', ') ?? null,
  },
  {
    label: 'Scrape allowed',
    value:
      typeof evaluation?.scrapeAllowed === 'boolean' ? String(evaluation.scrapeAllowed) : null,
  },
  {
    label: 'Candidate URL',
    value: evaluation?.evidence?.candidateUrl ?? null,
  },
  {
    label: 'Reason',
    value: evaluation?.reasons[0] ?? null,
  },
  {
    label: 'Mismatch',
    value: evaluation?.mismatches[0] ?? null,
  },
];

export const buildAmazonCandidateTriageStepDetails = (
  evaluation: AmazonCandidateTriageEvaluationResult,
  evaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  provider: string | null
): Array<{ label: string; value: string | null }> => [
  { label: 'Evaluation stage', value: 'Candidate triage' },
  { label: 'Model', value: evaluation.modelId },
  {
    label: 'Model source',
    value: formatAmazonEvaluatorModelSource(evaluatorConfig.mode),
  },
  {
    label: 'Threshold',
    value: formatAmazonEvaluationConfidence(evaluatorConfig.threshold),
  },
  {
    label: 'Evaluation scope',
    value: evaluatorConfig.onlyForAmbiguousCandidates
      ? 'Ambiguous Amazon candidates only'
      : 'Every Amazon candidate',
  },
  {
    label: 'Similarity decision',
    value: formatAmazonEvaluatorSimilarityMode(evaluatorConfig.candidateSimilarityMode),
  },
  {
    label: 'Allowed content language',
    value: formatAmazonEvaluatorAllowedContentLanguage(evaluatorConfig.allowedContentLanguage),
  },
  {
    label: 'Language policy',
    value: evaluatorConfig.rejectNonEnglishContent !== false
      ? 'Reject non-English content'
      : 'Allow non-English content',
  },
  {
    label: 'Language detection',
    value: formatAmazonEvaluatorLanguageDetectionMode(evaluatorConfig.languageDetectionMode),
  },
  { label: 'Image search provider', value: provider },
  {
    label: 'Recommended action',
    value: evaluation.recommendedAction,
  },
  {
    label: 'Rejection category',
    value: evaluation.rejectionCategory,
  },
  {
    label: 'Kept candidates',
    value: String(evaluation.keptCandidateUrls.length),
  },
  {
    label: 'Candidate count',
    value: String(evaluation.candidates.length),
  },
  {
    label: 'Reason',
    value: evaluation.reasons[0] ?? null,
  },
];

export const shouldWriteAmazonEnglishContent = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): boolean => evaluation?.languageAccepted !== false && evaluation?.scrapeAllowed !== false;
