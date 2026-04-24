import 'server-only';

import { randomUUID } from 'crypto';

import {
  buildPlaywrightEngineRunFailureMeta,
  buildPlaywrightConnectionEngineLaunchOptions,
  type startPlaywrightEngineTask,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import {
  resolvePlaywrightActionExecutionSettingsOverrides,
} from '@/features/playwright/utils/playwright-action-execution-settings';
import {
  type createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  normalizeProductScanRecord,
  type ProductScanAmazonEvaluation,
  type ProductScanRecord,
  type ProductScanRequestSequenceEntry,
} from '@/shared/contracts/product-scans';
import {
  type ProductScannerAmazonImageSearchProvider,
} from '@/shared/contracts/products/scanner-settings';
import type {
  PlaywrightAction,
  PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import {
  resolveRuntimeActionDefinition,
} from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import {
  getPlaywrightRuntimeActionSeed,
} from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  resolveAmazonRuntimeOperationLabel,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';

import {
  type ProductScanCandidateTriageEvaluationResult,
} from './product-scan-ai-evaluator';
import {
  type ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  resolveProductScannerAmazonCandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorTriageConfig,
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
} from './product-scanner-settings';

import {
  AMAZON_SCAN_TIMEOUT_MS,
  PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH,
  PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH,
  PRODUCT_SCAN_URL_MAX_LENGTH,
} from './product-scans-service.constants';
import {
  normalizeProductScanRequestSequence,
  readOptionalString,
  resolvePersistableScanUrl,
  toRecord,
} from './product-scans-service.helpers.base';
import {
  buildPreparedProductScanSteps,
  normalizeParsedCandidateUrls,
} from './product-scans-service.helpers.steps';

export const AMAZON_SCAN_DEFAULT_SLOW_MO_MS = 80;
export const PRODUCT_SCAN_BATCH_START_CONCURRENCY = 1;
export const AMAZON_BATCH_SCAN_START_CONCURRENCY = PRODUCT_SCAN_BATCH_START_CONCURRENCY;
export const AMAZON_SCAN_DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
export const AMAZON_SCAN_STEALTH_LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled'];
export const AMAZON_SCAN_MANUAL_VERIFICATION_BUFFER_MS = 60_000;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MIN_MS = 90;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MAX_MS = 280;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MIN_MS = 70;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MAX_MS = 210;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MIN_MS = 650;
export const AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MAX_MS = 1900;
const AMAZON_IMAGE_SEARCH_PROVIDER_FALLBACK_ORDER = [
  'google_images_upload',
  'google_images_url',
  'google_lens_upload',
] as const satisfies ReadonlyArray<ProductScannerAmazonImageSearchProvider>;

export type AmazonProductScanRuntimeKey =
  | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
  | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
  | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;

const AMAZON_PRODUCT_SCAN_RUNTIME_KEYS = new Set<string>([
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
]);

export const resolveAmazonProductScanRuntimeKey = (
  value: unknown,
  fallback: AmazonProductScanRuntimeKey = AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
): AmazonProductScanRuntimeKey => {
  const normalized = readOptionalString(value, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH);
  return normalized !== null && AMAZON_PRODUCT_SCAN_RUNTIME_KEYS.has(normalized)
    ? (normalized as AmazonProductScanRuntimeKey)
    : fallback;
};

export const resolveAmazonRuntimeActionDefinition = async (
  runtimeKey: AmazonProductScanRuntimeKey | null | undefined
): Promise<PlaywrightAction | null> => {
  if (runtimeKey === null || runtimeKey === undefined) {
    return null;
  }

  try {
    return await resolveRuntimeActionDefinition(runtimeKey);
  } catch {
    return getPlaywrightRuntimeActionSeed(runtimeKey);
  }
};

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
  const amazonAiEvidence = existingRawResult['amazonAiEvidence'];
  const existingEvidence = toRecord(amazonAiEvidence) ?? {};
  const stages = existingEvidence['stages'];
  const existingStages = Array.isArray(stages)
    ? (stages as unknown[]).filter(
        (entry): entry is Record<string, unknown> =>
          entry !== null && entry !== undefined && typeof entry === 'object' && Array.isArray(entry) === false
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
  evaluation: ProductScanCandidateTriageEvaluationResult,
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

const hasFiniteNumberSetting = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isGoogleFacingAmazonRuntimeKey = (
  runtimeKey: string | null | undefined
): runtimeKey is
  | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
  | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY =>
  runtimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY ||
  runtimeKey === AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY;

export const buildAmazonScannerRequestRuntimeOptions = (input: {
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  scannerEngineRequestOptions: Record<string, unknown>;
  actionExecutionSettings?: PlaywrightActionExecutionSettings | null;
  actionPersonaId?: string | null;
  runtimeKey?: string | null;
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
  const actionSettingsOverrides = resolvePlaywrightActionExecutionSettingsOverrides(
    input.actionExecutionSettings
  );

  const settingsOverrides: Record<string, unknown> = {
    ...existingSettingsOverrides,
    ...actionSettingsOverrides,
  };

  if ((input.scannerSettings.playwrightPersonaId ?? '') === '') {
    if (typeof settingsOverrides['humanizeMouse'] !== 'boolean') {
      settingsOverrides['humanizeMouse'] = true;
    }
    const slowMo = settingsOverrides['slowMo'];
    if (typeof slowMo !== 'number' || !Number.isFinite(slowMo)) {
      settingsOverrides['slowMo'] = AMAZON_SCAN_DEFAULT_SLOW_MO_MS;
    }
  }

  settingsOverrides['headless'] =
    typeof input.forceHeadless === 'boolean' ? input.forceHeadless : true;

  const actionBrowserPreference = input.actionExecutionSettings?.browserPreference ?? null;
  const actionLaunchOptions =
    actionBrowserPreference !== null
      ? buildPlaywrightConnectionEngineLaunchOptions({
          browserPreference: actionBrowserPreference,
        })
      : {};
  const baseLaunchOptions: Record<string, unknown> = { ...existingLaunchOptions };
  if (actionBrowserPreference !== null) {
    delete baseLaunchOptions['channel'];
    delete baseLaunchOptions['executablePath'];
  }
  const mergedLaunchOptions: Record<string, unknown> = {
    ...baseLaunchOptions,
    ...actionLaunchOptions,
  };
  const existingLaunchArgs = Array.isArray(mergedLaunchOptions['args'])
    ? (mergedLaunchOptions['args'] as unknown[]).filter((entry): entry is string => typeof entry === 'string')
    : [];

  const launchOptions: Record<string, unknown> = {
    ...mergedLaunchOptions,
    args: mergeUniqueStringValues(existingLaunchArgs, AMAZON_SCAN_STEALTH_LAUNCH_ARGS),
  };

  const contextOptions: Record<string, unknown> = {
    ...existingContextOptions,
  };

  const actionPersonaId = readOptionalString(input.actionPersonaId, 160);
  const scannerPersonaId =
    typeof scannerEngineRequestOptions.personaId === 'string' &&
    scannerEngineRequestOptions.personaId.trim().length > 0
      ? scannerEngineRequestOptions.personaId
      : null;
  const personaId = actionPersonaId ?? scannerPersonaId;
  const shouldApplyGoogleFacingRuntimeDefaults =
    personaId === null && isGoogleFacingAmazonRuntimeKey(input.runtimeKey);

  if (shouldApplyGoogleFacingRuntimeDefaults) {
    settingsOverrides['identityProfile'] = 'search';
    if (!hasFiniteNumberSetting(settingsOverrides['clickDelayMin'])) {
      settingsOverrides['clickDelayMin'] = AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MIN_MS;
    }
    if (!hasFiniteNumberSetting(settingsOverrides['clickDelayMax'])) {
      settingsOverrides['clickDelayMax'] = AMAZON_GOOGLE_RUNTIME_DEFAULT_CLICK_DELAY_MAX_MS;
    }
    if (!hasFiniteNumberSetting(settingsOverrides['inputDelayMin'])) {
      settingsOverrides['inputDelayMin'] = AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MIN_MS;
    }
    if (!hasFiniteNumberSetting(settingsOverrides['inputDelayMax'])) {
      settingsOverrides['inputDelayMax'] = AMAZON_GOOGLE_RUNTIME_DEFAULT_INPUT_DELAY_MAX_MS;
    }
    if (!hasFiniteNumberSetting(settingsOverrides['actionDelayMin'])) {
      settingsOverrides['actionDelayMin'] = AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MIN_MS;
    }
    if (!hasFiniteNumberSetting(settingsOverrides['actionDelayMax'])) {
      settingsOverrides['actionDelayMax'] = AMAZON_GOOGLE_RUNTIME_DEFAULT_ACTION_DELAY_MAX_MS;
    }
    if (settingsOverrides['proxyEnabled'] === true) {
      if (typeof settingsOverrides['proxySessionAffinity'] !== 'boolean') {
        settingsOverrides['proxySessionAffinity'] = true;
      }
      if (
        settingsOverrides['proxySessionAffinity'] === true &&
        settingsOverrides['proxySessionMode'] !== 'sticky' &&
        settingsOverrides['proxySessionMode'] !== 'rotate'
      ) {
        settingsOverrides['proxySessionMode'] = 'sticky';
      }
    }
  }

  const userAgent = contextOptions['userAgent'];
  if (
    (typeof userAgent !== 'string' || userAgent.trim().length === 0) &&
    shouldApplyGoogleFacingRuntimeDefaults === false
  ) {
    contextOptions['userAgent'] = AMAZON_SCAN_DEFAULT_USER_AGENT;
  }

  return {
    ...(personaId !== null ? { personaId } : {}),
    settingsOverrides,
    launchOptions,
    contextOptions,
  };
};

export const resolveAmazonScanRuntimeTimeoutMs = (input: {
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
}): number =>
  input.allowManualVerification
    ? Math.max(
        AMAZON_SCAN_TIMEOUT_MS,
        input.manualVerificationTimeoutMs + AMAZON_SCAN_MANUAL_VERIFICATION_BUFFER_MS
      )
    : AMAZON_SCAN_TIMEOUT_MS;

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
    ? (value)
    : null;

export const normalizeAmazonImageSearchPageUrl = (value: unknown): string | null => {
  const rawUrl = readOptionalString(value, PRODUCT_SCAN_URL_MAX_LENGTH);
  if (rawUrl === null) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString().slice(0, PRODUCT_SCAN_URL_MAX_LENGTH);
  } catch {
    return null;
  }
};

export const resolveAmazonImageSearchPageUrl = (
  rawResult: unknown,
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>
): string | null => {
  const rawRecord = toRecord(rawResult);
  return (
    normalizeAmazonImageSearchPageUrl(rawRecord?.['imageSearchPageUrl']) ??
    normalizeAmazonImageSearchPageUrl(scannerSettings.amazonImageSearchPageUrl)
  );
};

export const resolveAmazonImageSearchProviderHistory = (
  rawResult: unknown,
  currentProvider: ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider']
) => {
  const rawRecord = toRecord(rawResult);
  const imageSearchProviderHistory = rawRecord?.['imageSearchProviderHistory'];
  const history = Array.isArray(imageSearchProviderHistory)
    ? (imageSearchProviderHistory as unknown[])
        .map((value) => normalizeAmazonImageSearchProvider(value))
        .filter(
          (
            value
          ): value is ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider'] =>
            value !== null
        )
    : [];
  const current = normalizeAmazonImageSearchProvider(rawRecord?.['imageSearchProvider']);
  return Array.from(new Set([...history, current ?? currentProvider, currentProvider]));
};

const canUseAmazonImageSearchProvider = (input: {
  provider: ProductScannerAmazonImageSearchProvider;
  imageCandidates: ProductScanRecord['imageCandidates'] | null | undefined;
}): boolean => {
  if (input.provider !== 'google_images_url') {
    return true;
  }

  return (input.imageCandidates ?? []).some((candidate) => {
    const candidateUrl = readOptionalString(candidate.url, PRODUCT_SCAN_URL_MAX_LENGTH);
    if (candidateUrl === null) {
      return false;
    }

    try {
      const parsed = new URL(candidateUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
};

export const mergeAmazonCandidateEvaluatorConfig = (
  baseConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig | null | undefined,
  overrideConfig?: Partial<ProductScannerAmazonCandidateEvaluatorResolvedConfig> | null
): ProductScannerAmazonCandidateEvaluatorResolvedConfig => {
  const enabled = overrideConfig?.enabled ?? baseConfig?.enabled ?? false;
  const base = {
    mode: overrideConfig?.mode ?? baseConfig?.mode ?? 'disabled',
    threshold: overrideConfig?.threshold ?? baseConfig?.threshold ?? 0.85,
    onlyForAmbiguousCandidates:
      overrideConfig?.onlyForAmbiguousCandidates ?? baseConfig?.onlyForAmbiguousCandidates ?? false,
    candidateSimilarityMode:
      overrideConfig?.candidateSimilarityMode ?? baseConfig?.candidateSimilarityMode ?? 'deterministic_then_ai',
    allowedContentLanguage:
      overrideConfig?.allowedContentLanguage ?? baseConfig?.allowedContentLanguage ?? 'en',
    rejectNonEnglishContent:
      overrideConfig?.rejectNonEnglishContent ?? baseConfig?.rejectNonEnglishContent ?? true,
    languageDetectionMode:
      overrideConfig?.languageDetectionMode ?? baseConfig?.languageDetectionMode ?? 'deterministic_then_ai',
  } as const;

  if (enabled === false) {
    return { ...base, enabled: false, modelId: null, systemPrompt: null, brainApplied: null } as any;
  }

  const modelId = overrideConfig?.modelId ?? (baseConfig?.enabled === true ? baseConfig.modelId : null) ?? null;
  const systemPrompt = overrideConfig?.systemPrompt ?? (baseConfig?.enabled === true ? baseConfig.systemPrompt : null) ?? null;
  const brainApplied = overrideConfig?.brainApplied ?? (baseConfig?.enabled === true ? baseConfig.brainApplied : null) ?? null;

  if (modelId === null || systemPrompt === null) {
    return { ...base, enabled: false, modelId: null, systemPrompt: null, brainApplied: null } as any;
  }

  return { ...base, enabled: true, modelId, systemPrompt, brainApplied };
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
  imageCandidates?: ProductScanRecord['imageCandidates'] | null;
}) => {
  const history = resolveAmazonImageSearchProviderHistory(
    input.rawResult,
    input.currentProvider
  );
  const configuredFallback = normalizeAmazonImageSearchProvider(
    input.scannerSettings.amazonImageSearchFallbackProvider
  );
  const providerCandidates = Array.from(
    new Set(
      [configuredFallback, ...AMAZON_IMAGE_SEARCH_PROVIDER_FALLBACK_ORDER].filter(
        (value): value is ProductScannerAmazonImageSearchProvider => value !== null
      )
    )
  );

  for (const provider of providerCandidates) {
    if (provider === input.currentProvider) {
      continue;
    }
    if (history.includes(provider)) {
      continue;
    }
    if (
      !canUseAmazonImageSearchProvider({
        provider,
        imageCandidates: input.imageCandidates,
      })
    ) {
      continue;
    }
    return provider;
  }

  return null;
};

export const formatEvaluationConfidence = (confidence: number | null | undefined): string | null =>
  typeof confidence === 'number' && Number.isFinite(confidence)
    ? `${Math.round(confidence * 100)}%`
    : null;

export const resolveAmazonEvaluationStepStatus = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): ProductScanRecord['steps'][number]['status'] => {
  if (evaluation === undefined || evaluation === null) {
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
  evaluation: ProductScanCandidateTriageEvaluationResult | null | undefined
): ProductScanRecord['steps'][number]['status'] => {
  if (evaluation === undefined || evaluation === null) {
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
  evaluation: ProductScanCandidateTriageEvaluationResult | null | undefined
): string => {
  if (evaluation === undefined || evaluation === null) {
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
  evaluation: ProductScanCandidateTriageEvaluationResult | null | undefined
): string => {
  if (evaluation === undefined || evaluation === null) {
    return 'Amazon candidate triage failed.';
  }
  if (evaluation.status === 'approved') {
    return evaluation.keptCandidateUrls.length > 1
      ? `Amazon candidate triage kept ${evaluation.keptCandidateUrls.length} candidates and reranked them.`
      : 'Amazon candidate triage selected the best candidate.';
  }
  if (evaluation.status === 'skipped') {
    const reasons = evaluation.reasons;
    return (
      reasons[0] ??
      'Skipped Amazon candidate triage because deterministic hints already identified the best candidate.'
    );
  }
  if (evaluation.recommendedAction === 'fallback_provider') {
    return 'Amazon candidate triage requested a fallback image-search provider.';
  }
  if (evaluation.status === 'rejected') {
    const reasons = evaluation.reasons;
    return (
      reasons[0] ?? 'Amazon candidate triage rejected the current Google candidate set.'
    );
  }
  return evaluation.error ?? 'Amazon candidate triage failed.';
};

export const formatAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = readOptionalString(value, 160);
  if (normalized === null || normalized === undefined || normalized === '') {
    return null;
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .trim();
};

export const humanizeAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = formatAmazonRuntimeStageLabel(value);
  if (normalized === null || normalized === undefined || normalized === '') {
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
    ...(readOptionalString(metaRecord['runId']) !== '' || readOptionalString(metaRawResult['runId']) !== ''
      ? {
          runId:
            readOptionalString(metaRecord['runId']) !== '' ? readOptionalString(metaRecord['runId']) : readOptionalString(metaRawResult['runId']),
        }
      : {}),
    ...(readOptionalString(metaRecord['runStatus']) !== '' ||
    readOptionalString(metaRawResult['runStatus']) !== ''
      ? {
          runStatus:
            readOptionalString(metaRecord['runStatus']) !== '' ?
            readOptionalString(metaRecord['runStatus']) :
            readOptionalString(metaRawResult['runStatus']),
        }
      : {}),
    ...(resolvePersistableScanUrl(metaRecord['finalUrl'], metaRawResult['finalUrl']) !== null
      ? {
          finalUrl: resolvePersistableScanUrl(metaRecord['finalUrl'], metaRawResult['finalUrl']),
        }
      : {}),
    ...(readOptionalString(metaRecord['latestStage']) !== '' ||
    readOptionalString(metaRawResult['latestStage']) !== '' ||
    readOptionalString(metaRawResult['stage']) !== ''
      ? {
          latestStage:
            readOptionalString(metaRecord['latestStage']) !== '' ?
            readOptionalString(metaRecord['latestStage']) :
            (readOptionalString(metaRawResult['latestStage']) !== '' ? readOptionalString(metaRawResult['latestStage']) : readOptionalString(metaRawResult['stage'])),
        }
      : {}),
    ...(resolvePersistableScanUrl(
      metaRecord['latestStageUrl'],
      metaRawResult['latestStageUrl'],
      metaRawResult['currentUrl']
    ) !== null
      ? {
          latestStageUrl: resolvePersistableScanUrl(
            metaRecord['latestStageUrl'],
            metaRawResult['latestStageUrl'],
            metaRawResult['currentUrl']
          ),
        }
      : {}),
    ...(failureArtifacts !== null ? { failureArtifacts } : {}),
    ...(logTail !== null ? { logTail } : {}),
    ...(runtimePosture !== null ? { runtimePosture } : {}),
  };
};

export const resolveAmazonActiveRunStallMessage = ({
  reason,
  latestStage,
  runtimeKey,
}: {
  reason: 'runtime_exceeded' | 'no_progress' | 'manual_verification_expired';
  latestStage: string | null;
  runtimeKey?: string | null;
}): string => {
  const displayStage = humanizeAmazonRuntimeStageLabel(latestStage);
  const operationLabel = resolveAmazonRuntimeOperationLabel(runtimeKey);
  if (reason === 'manual_verification_expired') {
    return (displayStage ?? null) !== null
      ? `Google Lens manual verification expired at ${displayStage!}.`
      : 'Google Lens manual verification expired before completion.';
  }

  if (reason === 'no_progress') {
    return (displayStage ?? null) !== null
      ? `${operationLabel} stalled at ${displayStage!}.`
      : `${operationLabel} stopped making progress.`;
  }

  return (displayStage ?? null) !== null
    ? `${operationLabel} timed out at ${displayStage!}.`
    : `${operationLabel} exceeded its runtime limit.`;
};

export const shouldKeepAmazonManualVerificationPending = (input: {
  parsedStatus: string | null;
  existingPending: boolean;
  latestStage: string | null;
}): boolean => {
  const waitingForManualVerification =
    input.parsedStatus === 'captcha_required' ||
    (input.existingPending === true &&
      (input.parsedStatus === 'running' || input.parsedStatus === null));
  if (waitingForManualVerification === false) {
    return false;
  }

  const normalizedStage = input.latestStage?.trim().toLowerCase() ?? null;
  if (normalizedStage === null) {
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
  if (evaluation === undefined || evaluation === null) {
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
  if (evaluation === undefined || evaluation === null) {
    return 'Amazon candidate AI evaluation failed.';
  }
  const confidenceLabel = formatEvaluationConfidence(evaluation.confidence);
  if (evaluation.status === 'approved') {
    return (confidenceLabel ?? null) !== null
      ? `AI evaluator approved the Amazon candidate (${confidenceLabel!}).`
      : 'AI evaluator approved the Amazon candidate.';
  }
  if (evaluation.status === 'rejected') {
    if (evaluation.languageAccepted === false) {
      return (confidenceLabel ?? null) !== null
        ? `AI evaluator rejected the Amazon candidate because page content is not English (${confidenceLabel!}).`
        : 'AI evaluator rejected the Amazon candidate because page content is not English.';
    }
    return (confidenceLabel ?? null) !== null
      ? `AI evaluator rejected the Amazon candidate (${confidenceLabel!}).`
      : 'AI evaluator rejected the Amazon candidate.';
  }
  if (evaluation.status === 'skipped') {
    const reasons = evaluation.reasons;
    return (
      reasons[0] ??
      'Skipped Amazon candidate AI evaluation because deterministic identifiers already matched.'
    );
  }
  return evaluation.error ?? 'Amazon candidate AI evaluation failed.';
};

export const formatAmazonEvaluatorAllowedContentLanguage = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['allowedContentLanguage'] | null | undefined
): string => {
  if (value === undefined || value === null || value === '' || value === 'en') {
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

  const currentIndex = input.currentUrl !== null ? normalizedUrls.indexOf(input.currentUrl) : -1;
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  const nextUrl = normalizedUrls[nextIndex] ?? null;
  return {
    nextUrl,
    nextRank: nextUrl !== null ? nextIndex + 1 : null,
    remainingCandidateUrls: nextUrl !== null ? normalizedUrls.slice(nextIndex) : [],
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

  const candidateId = (latestCandidateStep?.candidateId ?? '').trim();
  const url = (latestCandidateStep?.url ?? '').trim();

  return {
    candidateId: candidateId !== '' ? candidateId : null,
    candidateRank:
      typeof latestCandidateStep?.candidateRank === 'number' &&
      Number.isFinite(latestCandidateStep.candidateRank) &&
      latestCandidateStep.candidateRank > 0
        ? latestCandidateStep.candidateRank
        : null,
    url: url !== '' ? url : null,
  };
};

export const buildAmazonEvaluationStepDetails = (
  evaluation: ProductScanAmazonEvaluation | null | undefined,
  evaluatorConfig: ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  stage: 'probe' | 'extraction'
): Array<{ label: string; value: string | null }> => {
  const sourceAsin = readOptionalString(evaluation?.evidence?.sourceAsin);
  const candidateAsin = readOptionalString(evaluation?.evidence?.candidateAsin);
  const asinRelation =
    sourceAsin !== null && candidateAsin !== null
      ? (sourceAsin === candidateAsin ? 'Match' : 'Conflict')
      : null;

  return [
    {
      label: 'Evaluation stage',
      value: stage === 'probe' ? 'Probe' : 'Extraction',
    },
    { label: 'Model', value: evaluation?.modelId ?? null },
    {
      label: 'Threshold',
      value: formatEvaluationConfidence(evaluatorConfig.threshold),
    },
    {
      label: 'Rejection kind',
      value: resolveAmazonEvaluationRejectionKindLabel(evaluation),
    },
    {
      label: 'Confidence',
      value: formatEvaluationConfidence(evaluation?.confidence),
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
      value: formatEvaluationConfidence(evaluation?.languageConfidence),
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
      label: 'Source ASIN',
      value: sourceAsin,
    },
    {
      label: 'Candidate ASIN',
      value: candidateAsin,
    },
    {
      label: 'ASIN relation',
      value: asinRelation,
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
  ].slice(0, 20);
};

export const buildAmazonCandidateTriageStepDetails = (
  evaluation: ProductScanCandidateTriageEvaluationResult,
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
    value: formatEvaluationConfidence(evaluatorConfig.threshold),
  },
  {
    label: 'Evaluation scope',
    value: evaluatorConfig.onlyForAmbiguousCandidates === true
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

export const buildAmazonScanRequestInput = (input: {
  productId: string;
  productName: string | null;
  existingAsin: string | null | undefined;
  imageCandidates: ProductScanRecord['imageCandidates'];
  runtimeKey?: string | null;
  imageSearchProvider?: ProductScannerAmazonImageSearchProvider | null;
  imageSearchPageUrl?: string | null;
  selectorProfile?: string | null;
  batchIndex?: number;
  allowManualVerification: boolean;
  manualVerificationTimeoutMs: number;
  triageOnlyOnAmazonCandidates?: boolean;
  collectAmazonCandidatePreviews?: boolean;
  probeOnlyOnAmazonMatch?: boolean;
  skipAmazonProbe?: boolean;
  directAmazonCandidateUrl?: string | null;
  directAmazonCandidateUrls?: string[] | null;
  directMatchedImageId?: string | null;
  directAmazonCandidateRank?: number | null;
  stepSequenceKey?: string | null;
  stepSequence?: ProductScanRequestSequenceEntry[] | null;
}): Record<string, unknown> => ({
  productId: input.productId,
  productName: input.productName,
  existingAsin: input.existingAsin ?? null,
  imageCandidates: input.imageCandidates,
  runtimeKey: readOptionalString(input.runtimeKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  imageSearchProvider:
    (input.imageSearchProvider === 'google_images_url' ||
    input.imageSearchProvider === 'google_lens_upload')
      ? input.imageSearchProvider
      : 'google_images_upload',
  imageSearchPageUrl: normalizeAmazonImageSearchPageUrl(input.imageSearchPageUrl),
  selectorProfile: readOptionalString(input.selectorProfile, 120) ?? 'amazon',
  batchIndex:
    typeof input.batchIndex === 'number' && Number.isFinite(input.batchIndex) && input.batchIndex > 0
      ? Math.trunc(input.batchIndex)
      : 0,
  allowManualVerification: input.allowManualVerification,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
  triageOnlyOnAmazonCandidates: input.triageOnlyOnAmazonCandidates === true,
  collectAmazonCandidatePreviews: input.collectAmazonCandidatePreviews === true,
  probeOnlyOnAmazonMatch: input.probeOnlyOnAmazonMatch === true,
  skipAmazonProbe: input.skipAmazonProbe === true,
  directAmazonCandidateUrl: readOptionalString(input.directAmazonCandidateUrl, PRODUCT_SCAN_URL_MAX_LENGTH),
  directAmazonCandidateUrls: normalizeParsedCandidateUrls(input.directAmazonCandidateUrls),
  directMatchedImageId: readOptionalString(input.directMatchedImageId, PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH),
  directAmazonCandidateRank:
    typeof input.directAmazonCandidateRank === 'number' &&
    Number.isFinite(input.directAmazonCandidateRank) &&
    input.directAmazonCandidateRank > 0
      ? Math.trunc(input.directAmazonCandidateRank)
      : null,
  stepSequenceKey: readOptionalString(input.stepSequenceKey, PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH),
  stepSequence: normalizeProductScanRequestSequence(input.stepSequence),
});

export const createAmazonProductScanBaseRecord = (input: {
  productId: string;
  productName: string;
  integrationId?: string | null;
  connectionId?: string | null;
  userId?: string | null;
  imageCandidates: ProductScanRecord['imageCandidates'];
  status: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanRecord =>
  normalizeProductScanRecord({
    id: randomUUID(),
    productId: input.productId,
    integrationId: readOptionalString(input.integrationId, 160),
    connectionId: readOptionalString(input.connectionId, 160),
    provider: 'amazon',
    scanType: 'google_reverse_image',
    status: input.status,
    productName: input.productName,
    engineRunId: null,
    imageCandidates: input.imageCandidates,
    matchedImageId: null,
    asin: null,
    title: null,
    price: null,
    url: null,
    description: null,
    amazonDetails: null,
    amazonProbe: null,
    amazonEvaluation: null,
    steps: buildPreparedProductScanSteps({
      prepareLabel: 'Amazon',
      summaryLabel: 'Amazon candidate search',
      imageCandidateCount: input.imageCandidates.length,
      status: input.status,
      error: input.error ?? null,
    }),
    rawResult: null,
    error: input.error ?? null,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: null,
    createdBy: (input.userId?.trim() ?? '') !== '' ? String(input.userId).trim() : null,
    updatedBy: (input.userId?.trim() ?? '') !== '' ? String(input.userId).trim() : null,
    completedAt: input.status === 'failed' ? new Date().toISOString() : null,
  });

export const shouldWriteAmazonEnglishContent = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): boolean => evaluation?.languageAccepted !== false && evaluation?.scrapeAllowed !== false;
