import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  createCustomPlaywrightInstance,
  readPlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
  startPlaywrightConnectionEngineTask,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import { type PlaywrightConnectionSettingsOverridesInput } from '@/features/playwright/server/connection-runtime';
import {
  get1688DefaultConnectionId,
  getIntegrationRepository,
} from '@/features/integrations/server';
import { CachedProductService } from '@/features/products/performance/cached-service';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import {
  isProductScanActiveStatus,
  isProductScanTerminalStatus,
  normalizeProductScanRecord,
  type ProductAmazonBatchScanItem,
  type ProductAmazonBatchScanResponse,
  type ProductScanAmazonEvaluation,
  type ProductScanBatchResponse,
  type ProductScanProvider,
  type ProductScanRecord,
  type ProductScanStatus,
  type ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  evaluateAmazonScanCandidateMatch,
  triageAmazonScanCandidates,
  type AmazonCandidateTriageEvaluationResult,
} from './product-scan-amazon-evaluator';
import { evaluate1688SupplierCandidateMatch } from './product-scan-1688-evaluator';
import {
  resolveDetectedAmazonAsinOutcome,
} from './product-scan-amazon.helpers';
import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  getProductScanProviderDefinition,
  type ProductScanProviderRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  type ProductScanner1688CandidateEvaluatorResolvedConfig,
  type ProductScannerAmazonCandidateEvaluatorResolvedConfig,
  resolveProductScanner1688CandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorTriageConfig,
  resolveProductScannerAmazonCandidateEvaluatorExtractionConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
  resolveProductScannerHeadless,
} from './product-scanner-settings';
import {
  findLatestActiveProductScan,
  getProductScanById,
  listLatestProductScansByProductIds,
  listProductScans,
  upsertProductScan,
} from './product-scans-repository';

import {
  AMAZON_SCAN_TIMEOUT_MS,
  PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS,
  toRecord,
  readOptionalString,
  normalizeErrorMessage,
  resolveManualVerificationMessage,
  resolvePersistableScanUrl,
  hydrateProductScanImageCandidates,
  sanitizeProductScanImageCandidates,
  resolveIsoAgeMs,
  resolveScanEngineRunId,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  areProductScanStepsEqual,
  resolvePersistedProductScanSteps,
  upsertPersistedProductScanStep,
  resolveAsinUpdateStepStatus,
  parse1688ScanScriptResult,
  parseAmazonScanScriptResult,
  createAmazonScanStartedRawResult,
  createFailedBatchResult,
  persistSynchronizedScan,
  persistFailedSynchronization,
  tryDirectQueuedScanUpdate,
} from './product-scans-service.helpers';

const AMAZON_BATCH_SCAN_START_CONCURRENCY = 1;
const AMAZON_SCAN_DEFAULT_SLOW_MO_MS = 80;
const AMAZON_SCAN_DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const AMAZON_SCAN_STEALTH_LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled'];
const amazonScanRuntime: ProductScanProviderRuntime = AMAZON_PRODUCT_SCAN_PROVIDER.runtime!;
const supplierScanRuntime: ProductScanProviderRuntime = getProductScanProviderDefinition('1688').runtime!;
const SCANNER_1688_MISSING_PROFILE_MESSAGE =
  'No 1688 browser profile is configured. Create or select a 1688 connection before scanning.';
const SCANNER_1688_MANUAL_VERIFICATION_MESSAGE =
  '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';
const SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE =
  'No local product image file available for 1688 supplier reverse image scan.';
const SCANNER_1688_UNUSABLE_IMAGE_INPUT_PATTERN =
  /Product image candidate did not include a usable filepath or URL for 1688 scanning/i;
const SCANNER_1688_DEFAULT_LOCALE = 'zh-CN';
const SCANNER_1688_DEFAULT_TIMEZONE_ID = 'Asia/Shanghai';
const SCANNER_1688_DEFAULT_SLOW_MO_MS = 140;

const resolve1688ManualVerificationMessage = (
  value: unknown,
  fallback?: unknown
): string => {
  const normalized =
    readOptionalString(value) ??
    readOptionalString(fallback) ??
    SCANNER_1688_MANUAL_VERIFICATION_MESSAGE;
  if (/continue automatically/i.test(normalized)) {
    return normalized;
  }
  if (/requested login/i.test(normalized)) {
    return normalized;
  }
  return SCANNER_1688_MANUAL_VERIFICATION_MESSAGE;
};

const normalize1688ScanFailureMessage = (value: unknown, fallback: string): string => {
  const normalized = normalizeErrorMessage(value, fallback);
  return SCANNER_1688_UNUSABLE_IMAGE_INPUT_PATTERN.test(normalized)
    ? SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE
    : normalized;
};

const resolve1688ConnectionEngineSettings = (
  settings: Record<string, unknown>,
  options: { forceVisible: boolean }
): PlaywrightConnectionSettingsOverridesInput => {
  const slowMo = settings['slowMo'];
  const mouseJitter = settings['mouseJitter'];
  return {
    ...settings,
    ...(options.forceVisible ? { headless: false } : {}),
    locale: readOptionalString(settings['locale']) ?? SCANNER_1688_DEFAULT_LOCALE,
    timezoneId:
      readOptionalString(settings['timezoneId']) ?? SCANNER_1688_DEFAULT_TIMEZONE_ID,
    humanizeMouse:
      typeof settings['humanizeMouse'] === 'boolean' ? settings['humanizeMouse'] : true,
    mouseJitter:
      typeof mouseJitter === 'number' && Number.isFinite(mouseJitter) && mouseJitter >= 0
        ? mouseJitter
        : 5,
    slowMo:
      typeof slowMo === 'number' && Number.isFinite(slowMo) && slowMo > 0
        ? slowMo
        : SCANNER_1688_DEFAULT_SLOW_MO_MS,
    clickDelayMin:
      typeof settings['clickDelayMin'] === 'number' ? settings['clickDelayMin'] : 80,
    clickDelayMax:
      typeof settings['clickDelayMax'] === 'number' ? settings['clickDelayMax'] : 220,
    inputDelayMin:
      typeof settings['inputDelayMin'] === 'number' ? settings['inputDelayMin'] : 50,
    inputDelayMax:
      typeof settings['inputDelayMax'] === 'number' ? settings['inputDelayMax'] : 160,
    actionDelayMin:
      typeof settings['actionDelayMin'] === 'number' ? settings['actionDelayMin'] : 250,
    actionDelayMax:
      typeof settings['actionDelayMax'] === 'number' ? settings['actionDelayMax'] : 900,
  } as PlaywrightConnectionSettingsOverridesInput;
};

const resolveAmazonImageSearchProvider = (
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

const normalizeAmazonImageSearchProvider = (
  value: unknown
): ReturnType<typeof createDefaultProductScannerSettings>['amazonImageSearchProvider'] | null =>
  value === 'google_images_upload' ||
  value === 'google_images_url' ||
  value === 'google_lens_upload'
    ? value
    : null;

const resolveAmazonImageSearchProviderHistory = (
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

const resolveAmazonImageSearchFallbackProvider = (input: {
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

const formatAmazonEvaluationConfidence = (confidence: number | null | undefined): string | null =>
  typeof confidence === 'number' && Number.isFinite(confidence)
    ? `${Math.round(confidence * 100)}%`
    : null;

const resolveAmazonEvaluationStepStatus = (
  evaluation: ProductScanAmazonEvaluation
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

const resolveAmazonCandidateTriageStepStatus = (
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

const resolveAmazonCandidateTriageStepResultCode = (
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

const resolveAmazonCandidateTriageMessage = (
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

const formatAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = readOptionalString(value, 160);
  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .trim();
};

const humanizeAmazonRuntimeStageLabel = (value: unknown): string | null => {
  const normalized = formatAmazonRuntimeStageLabel(value);
  if (!normalized) {
    return null;
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const buildAmazonActiveRunDiagnostics = (
  run: Parameters<typeof buildPlaywrightEngineRunFailureMeta>[0]
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

const resolveAmazonActiveRunStallMessage = ({
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

const shouldKeepAmazonManualVerificationPending = (input: {
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

const resolveAmazonEvaluationStepResultCode = (
  evaluation: ProductScanAmazonEvaluation
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

const resolveAmazonEvaluationMessage = (
  evaluation: ProductScanAmazonEvaluation
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

const formatAmazonEvaluatorAllowedContentLanguage = (
  value: ProductScannerAmazonCandidateEvaluatorResolvedConfig['allowedContentLanguage'] | null | undefined
): string => {
  if (!value || value === 'en') {
    return 'English';
  }

  return String(value).toUpperCase();
};

const formatAmazonEvaluatorLanguageDetectionMode = (
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

const formatAmazonEvaluatorSimilarityMode = (
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

const formatAmazonEvaluatorModelSource = (
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

const resolveAmazonEvaluationRejectionKindLabel = (
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

const resolveNextAmazonCandidateUrl = (input: {
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

const resolveNextQueueStepAttempt = (
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

const resolveNextAmazonEvaluationStepAttempt = (
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

const resolveNextAmazonCandidateTriageStepAttempt = (
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

const resolveNext1688EvaluationStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    0,
    ...steps
      .filter((step) => step.key === 'supplier_ai_evaluate')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;

const resolve1688EvaluationStepStatus = (
  evaluation: ProductScanSupplierEvaluation
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
  if (evaluation.status === 'rejected') {
    return 'failed';
  }
  return 'failed';
};

const resolve1688EvaluationStepResultCode = (
  evaluation: ProductScanSupplierEvaluation
): string => {
  if (!evaluation) {
    return 'evaluation_failed';
  }
  if (evaluation.status === 'approved') {
    return 'candidate_approved';
  }
  if (evaluation.status === 'rejected') {
    return 'candidate_rejected';
  }
  if (evaluation.status === 'skipped') {
    return 'evaluation_skipped';
  }
  return 'evaluation_failed';
};

const resolve1688EvaluatorModelSource = (
  value: ProductScanner1688CandidateEvaluatorResolvedConfig['mode'] | null | undefined
): string | null => {
  if (value === 'brain_default') {
    return 'AI Brain default';
  }

  if (value === 'model_override') {
    return 'Scanner override';
  }

  return null;
};

const resolve1688CandidateRank = (
  probe: ProductScanRecord['supplierProbe']
): number | null => {
  const candidateRank =
    probe && typeof probe === 'object' && 'candidateRank' in probe
      ? (probe as { candidateRank?: unknown }).candidateRank
      : null;
  if (
    typeof candidateRank === 'number' &&
    Number.isFinite(candidateRank) &&
    candidateRank > 0
  ) {
    return candidateRank;
  }

  return null;
};

const resolve1688EvaluationMessage = (
  evaluation: ProductScanSupplierEvaluation
): string => {
  if (!evaluation) {
    return '1688 supplier AI evaluation failed.';
  }
  const confidenceLabel = formatAmazonEvaluationConfidence(evaluation.confidence);
  if (evaluation.status === 'approved') {
    return confidenceLabel
      ? `AI evaluator approved the 1688 supplier candidate (${confidenceLabel}).`
      : 'AI evaluator approved the 1688 supplier candidate.';
  }
  if (evaluation.status === 'rejected') {
    return confidenceLabel
      ? `AI evaluator rejected the 1688 supplier candidate (${confidenceLabel}).`
      : 'AI evaluator rejected the 1688 supplier candidate.';
  }
  if (evaluation.status === 'skipped') {
    return (
      evaluation.reasons[0] ??
      'Skipped 1688 supplier AI evaluation because the heuristic supplier match was already strong.'
    );
  }
  return evaluation.error ?? '1688 supplier AI evaluation failed.';
};

const build1688EvaluationStepDetails = (
  evaluation: ProductScanSupplierEvaluation,
  evaluatorConfig: ProductScanner1688CandidateEvaluatorResolvedConfig
): Array<{ label: string; value: string | null }> => [
  { label: 'Model', value: evaluation?.modelId ?? null },
  {
    label: 'Model source',
    value: resolve1688EvaluatorModelSource(evaluatorConfig.mode),
  },
  {
    label: 'Threshold',
    value: formatAmazonEvaluationConfidence(evaluatorConfig.threshold),
  },
  {
    label: 'Evaluation scope',
    value: evaluatorConfig.onlyForAmbiguousCandidates
      ? 'Ambiguous 1688 candidates only'
      : 'Every 1688 candidate',
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
    label: 'Title match',
    value:
      typeof evaluation?.titleMatch === 'boolean' ? String(evaluation.titleMatch) : null,
  },
  {
    label: 'Proceed',
    value: typeof evaluation?.proceed === 'boolean' ? String(evaluation.proceed) : null,
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

const resolveLatestAmazonCandidateStepMeta = (
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

const buildAmazonEvaluationStepDetails = (
  evaluation: ProductScanAmazonEvaluation,
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

const buildAmazonCandidateTriageStepDetails = (
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

type AmazonAiStageSummary = {
  stage: 'candidate_triage' | 'probe_evaluate' | 'extraction_evaluate';
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

const appendAmazonAiStageSummary = (
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

const buildAmazonEvaluationStageSummary = (
  evaluation: ProductScanAmazonEvaluation,
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

const buildAmazonCandidateTriageStageSummary = (
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

const shouldWriteAmazonEnglishContent = (
  evaluation: ProductScanAmazonEvaluation | null | undefined
): boolean => evaluation?.languageAccepted !== false && evaluation?.scrapeAllowed !== false;

const mergeUniqueStringValues = (
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

const buildAmazonScannerRequestRuntimeOptions = (input: {
  scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  scannerEngineRequestOptions: ReturnType<typeof buildProductScannerEngineRequestOptions>;
  forceHeadless?: boolean;
}): Pick<
  Parameters<typeof startPlaywrightEngineTask>[0]['request'],
  'personaId' | 'settingsOverrides' | 'launchOptions' | 'contextOptions'
> => {
  const existingSettingsOverrides =
    toRecord(input.scannerEngineRequestOptions.settingsOverrides) ?? {};
  const existingLaunchOptions = toRecord(input.scannerEngineRequestOptions.launchOptions) ?? {};
  const existingContextOptions =
    toRecord(
      (input.scannerEngineRequestOptions as { contextOptions?: unknown }).contextOptions
    ) ?? {};

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
    ...(input.scannerEngineRequestOptions.personaId
      ? { personaId: input.scannerEngineRequestOptions.personaId }
      : {}),
    settingsOverrides,
    launchOptions,
    contextOptions,
  };
};

const isApprovedAmazonCandidateExtractionRun = (
  scan: Pick<ProductScanRecord, 'rawResult' | 'amazonEvaluation'>
): boolean =>
  toRecord(scan.rawResult)?.['approvedCandidateExtraction'] === true &&
  (scan.amazonEvaluation?.status === 'approved' || scan.amazonEvaluation?.status === 'skipped');

async function mapWithConcurrencyLimit<TInput, TOutput>(
  values: readonly TInput[],
  concurrency: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  if (values.length === 0) {
    return [];
  }

  const normalizedConcurrency = Math.max(1, Math.trunc(concurrency));
  const workerCount = Math.min(values.length, normalizedConcurrency);
  const results = new Array<TOutput>(values.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(values[index] as TInput, index);
      }
    })
  );

  return results;
}

type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: {
    status: string;
    completedAt?: string | null;
    startedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  engineRunId: string;
  resultValue: unknown;
  parsedResult: ReturnType<typeof parseAmazonScanScriptResult>;
};

async function synchronizeAmazonCaptchaRequired({
  scan,
  engineRunId,
  resultValue,
  parsedResult,
}: SynchronizeAmazonStatusInput): Promise<ProductScanRecord> {
  const manualVerificationMessage = resolveManualVerificationMessage(
    parsedResult.message
  );
  const existingRawResult = toRecord(scan.rawResult) ?? {};
  const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);

  if (existingRawResult['captchaRetryStarted'] === true) {
    return await persistFailedSynchronization(
      scan,
      'Google Lens captcha verification was still required after reopening the browser.'
    );
  }

  const product = await productService.getProductById(scan.productId);
  if (!product) {
    return await persistFailedSynchronization(
      scan,
      'Product not found while reopening the Amazon scan for captcha verification.'
    );
  }

  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForCaptchaRetry',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
  }

  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
    scannerSettings
  );
  if (!shouldAutoShowScannerCaptchaBrowser(scannerSettings)) {
    return await persistFailedSynchronization(
      scan,
      'Google Lens requested captcha verification, and scanner settings are configured to fail instead of reopening a visible browser.'
    );
  }

  const claimedScan = await persistSynchronizedScan(scan, {
    engineRunId: null,
    status: 'running',
    steps: nextSteps,
    rawResult: {
      ...existingRawResult,
      ...resultValue,
      previousRunId: engineRunId,
      captchaRetryStarted: true,
      manualVerificationPending: true,
      manualVerificationMessage,
      manualVerificationTimeoutMs,
    },
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: manualVerificationMessage,
    completedAt: null,
  });

  try {
    const amazonCandidateEvaluatorEnabled = (
      await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings)
    ).enabled;
    const amazonCandidateTriageEnabled = (
      await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(scannerSettings)
    ).enabled;
    const scannerEngineRequestOptions =
      buildProductScannerEngineRequestOptions(scannerSettings);
    const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
      scannerSettings,
      scannerEngineRequestOptions,
      forceHeadless: false,
    });
    const amazonImageSearchProvider = resolveAmazonImageSearchProvider(
      claimedScan.rawResult,
      scannerSettings
    );
    const runRetry = await startPlaywrightEngineTask({
      request: {
        script: amazonScanRuntime.script,
        input: amazonScanRuntime.buildRequestInput({
          productId: product.id,
          productName: claimedScan.productName,
          existingAsin: product.asin,
          imageCandidates: claimedScan.imageCandidates,
          imageSearchProvider: amazonImageSearchProvider,
          allowManualVerification: true,
          manualVerificationTimeoutMs,
          triageOnlyOnAmazonCandidates: amazonCandidateTriageEnabled,
          probeOnlyOnAmazonMatch: amazonCandidateEvaluatorEnabled,
        }),
        timeoutMs: Math.max(
          AMAZON_SCAN_TIMEOUT_MS,
          manualVerificationTimeoutMs + 60_000
        ),
        browserEngine: 'chromium',
        ...scannerRuntimeOptions,
        capture: {
          screenshot: true,
          html: true,
        },
        preventNewPages: true,
      },
      ownerUserId: claimedScan.updatedBy?.trim() || null,
      instance: createCustomPlaywrightInstance({
        family: 'scrape',
        label: 'Amazon reverse image ASIN scan',
        tags: ['product', 'amazon', 'scan', 'google-reverse-image', 'manual-verification'],
      }),
    });

    const retryRunStatus = runRetry.status === 'running' ? 'running' : 'queued';
    const retryManualVerificationPending = retryRunStatus === 'running';

    return await persistSynchronizedScan(claimedScan, {
      engineRunId: runRetry.runId,
      status: retryRunStatus,
      steps: claimedScan.steps,
      rawResult: {
        ...toRecord(claimedScan.rawResult),
        ...createAmazonScanStartedRawResult({
          runId: runRetry.runId,
          status: runRetry.status,
          imageSearchProvider: amazonImageSearchProvider,
          imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
            claimedScan.rawResult,
            amazonImageSearchProvider
          ),
          allowManualVerification: true,
          manualVerificationTimeoutMs,
          previousRunId: engineRunId,
          previousResult: resultValue,
          manualVerificationPending: retryManualVerificationPending,
          manualVerificationMessage: retryManualVerificationPending
            ? manualVerificationMessage
            : null,
        }),
        captchaRetryStarted: true,
        ...(retryManualVerificationPending
          ? {
              manualVerificationPending: true,
              manualVerificationMessage,
            }
          : {
              manualVerificationPending: false,
              manualVerificationMessage: null,
            }),
      },
      error: null,
      asinUpdateStatus: 'pending',
      asinUpdateMessage: retryManualVerificationPending
        ? manualVerificationMessage
        : null,
      completedAt: null,
    });
  } catch (error: unknown) {
    const message = normalizeErrorMessage(
      error,
      'Failed to reopen the Amazon scan in a visible browser for captcha verification.'
    );
    return await persistSynchronizedScan(claimedScan, {
      status: 'failed',
      steps: claimedScan.steps,
      rawResult: {
        ...toRecord(claimedScan.rawResult),
        retryStartError: message,
      },
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: new Date().toISOString(),
    });
  }
}

async function synchronizeAmazonTriageReady({
  scan,
  run,
  engineRunId,
  resultValue,
  parsedResult,
  persistedAmazonProbe,
  existingAmazonEvaluation,
}: SynchronizeAmazonStatusInput & {
  persistedAmazonProbe: unknown;
  existingAmazonEvaluation: unknown;
}): Promise<ProductScanRecord> {
  const product = await productService.getProductById(scan.productId);
  let finalizedAmazonSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
  if (!product) {
    const message = 'Product not found while triaging Amazon candidates.';
    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'failed',
      asin: null,
      matchedImageId: parsedResult.matchedImageId,
      title: null,
      price: null,
      url: null,
      description: null,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation: existingAmazonEvaluation,
      steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'product_asin_update',
        label: 'Update product ASIN',
        group: 'product',
        status: 'failed',
        resultCode: 'product_not_found',
        message,
        details: [{ label: 'Reason', value: 'Product not found' }],
        url: null,
      }),
      rawResult: resultValue,
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  }

  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForCandidateTriage',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
  }

  const currentProvider = resolveAmazonImageSearchProvider(scan.rawResult, scannerSettings);
  const probeEvaluatorConfig =
    await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings);
  const triageBaselineCandidates =
    parsedResult.candidateResults.length > 0
      ? parsedResult.candidateResults
      : parsedResult.candidateUrls.map((url, index) => ({
        url,
        score: null,
        asin: null,
        marketplaceDomain: null,
        title: null,
        snippet: null,
        rank: index + 1,
      }));

  try {
    const triageEvaluatorConfig =
      await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(scannerSettings);
    const triageEvaluation = triageEvaluatorConfig.enabled
      ? await triageAmazonScanCandidates({
        scan,
        product,
        parsedResult,
        evaluatorConfig: triageEvaluatorConfig,
        provider: currentProvider,
      })
      : {
        status: 'skipped' as const,
        stage: 'candidate_triage' as const,
        confidence: 1,
        threshold: null,
        recommendedAction: 'accept' as const,
        rejectionCategory: null,
        reasons: ['Candidate triage was disabled before synchronization.'],
        mismatchLabels: [],
        modelId: null,
        brainApplied: null,
        candidates: triageBaselineCandidates.map((candidate, index) => ({
          url: candidate.url,
          rankBefore:
            typeof candidate.rank === 'number' && Number.isFinite(candidate.rank)
              ? candidate.rank
              : index + 1,
          rankAfter: index + 1,
          confidence: null,
          keep: true,
          asin: candidate.asin,
          marketplaceDomain: candidate.marketplaceDomain,
          title: candidate.title,
          snippet: candidate.snippet,
          pageLanguage: null,
          languageAccepted: null,
          recommendedAction: 'accept' as const,
          rejectionCategory: null,
          reasons: [],
          mismatchLabels: [],
        })),
        keptCandidateUrls:
          parsedResult.candidateUrls.length > 0
            ? parsedResult.candidateUrls
            : triageBaselineCandidates.map((candidate) => candidate.url),
        provider: currentProvider,
        error: null,
        evaluatedAt: new Date().toISOString(),
      };

    finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
      key: 'amazon_ai_triage',
      label: 'Triage Amazon candidates',
      group: 'amazon',
      attempt: resolveNextAmazonCandidateTriageStepAttempt(finalizedAmazonSteps),
      candidateId: parsedResult.matchedImageId,
      candidateRank: triageEvaluation.candidates[0]?.rankBefore ?? null,
      status: resolveAmazonCandidateTriageStepStatus(triageEvaluation),
      resultCode: resolveAmazonCandidateTriageStepResultCode(triageEvaluation),
      message: resolveAmazonCandidateTriageMessage(triageEvaluation),
      details: buildAmazonCandidateTriageStepDetails(
        triageEvaluation,
        triageEvaluatorConfig,
        currentProvider
      ),
      url: triageEvaluation.candidates[0]?.url ?? parsedResult.candidateUrls[0] ?? null,
    });

    const triageRawResult = appendAmazonAiStageSummary(
      resultValue,
      buildAmazonCandidateTriageStageSummary(triageEvaluation, currentProvider)
    );

    if (triageEvaluation.status === 'failed') {
      const message = resolveAmazonCandidateTriageMessage(triageEvaluation);
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        asin: null,
        matchedImageId: parsedResult.matchedImageId,
        title: null,
        price: null,
        url: null,
        description: null,
        amazonDetails: null,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation: existingAmazonEvaluation,
        steps: finalizedAmazonSteps,
        rawResult: triageRawResult,
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const fallbackProvider =
      triageEvaluation.recommendedAction === 'fallback_provider'
        ? resolveAmazonImageSearchFallbackProvider({
          rawResult: scan.rawResult,
          scannerSettings,
          currentProvider,
        })
        : null;

    if (fallbackProvider) {
      const scannerEngineRequestOptions =
        buildProductScannerEngineRequestOptions(scannerSettings);
      const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
        scannerSettings,
        scannerEngineRequestOptions,
      });
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
        scannerSettings
      );
      const providerHistory = resolveAmazonImageSearchProviderHistory(
        scan.rawResult,
        currentProvider
      );
      const fallbackRun = await startPlaywrightEngineTask({
        request: {
          script: amazonScanRuntime.script,
          input: amazonScanRuntime.buildRequestInput({
            productId: product.id,
            productName: scan.productName,
            existingAsin: product.asin,
            imageCandidates: scan.imageCandidates,
            imageSearchProvider: fallbackProvider,
            allowManualVerification:
              shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
            manualVerificationTimeoutMs,
            triageOnlyOnAmazonCandidates: triageEvaluatorConfig.enabled,
            probeOnlyOnAmazonMatch: probeEvaluatorConfig.enabled,
          }),
          timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
          browserEngine: 'chromium',
          ...scannerRuntimeOptions,
          capture: {
            screenshot: true,
            html: true,
          },
          preventNewPages: true,
        },
        ownerUserId: scan.updatedBy?.trim() || null,
        instance: createCustomPlaywrightInstance({
          family: 'scrape',
          label: 'Amazon fallback provider scan',
          tags: ['product', 'amazon', 'scan', 'provider-fallback'],
        }),
      });

      const fallbackStatus = fallbackRun.status === 'running' ? 'running' : 'queued';
      const nextRawResult = appendAmazonAiStageSummary(
        {
          ...createAmazonScanStartedRawResult({
            runId: fallbackRun.runId,
            status: fallbackRun.status,
            imageSearchProvider: fallbackProvider,
            imageSearchProviderHistory: [...providerHistory, fallbackProvider],
            allowManualVerification:
              shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
            manualVerificationTimeoutMs,
            previousRunId: engineRunId,
            previousResult: triageRawResult,
          }),
          providerFallback: true,
          fallbackFromImageSearchProvider: currentProvider,
          fallbackToImageSearchProvider: fallbackProvider,
        },
        buildAmazonCandidateTriageStageSummary(triageEvaluation, currentProvider)
      );

      return await persistSynchronizedScan(scan, {
        engineRunId: fallbackRun.runId,
        status: fallbackStatus,
        asin: null,
        matchedImageId: parsedResult.matchedImageId,
        title: null,
        price: null,
        url: null,
        description: null,
        amazonDetails: null,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation: existingAmazonEvaluation,
        steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
          key: 'queue_scan',
          label: 'Retry with fallback image-search provider',
          group: 'input',
          attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
          status: 'completed',
          resultCode: fallbackStatus === 'running' ? 'run_started' : 'run_queued',
          message:
            fallbackStatus === 'running'
              ? 'Started an Amazon scan with the fallback image-search provider.'
              : 'Queued an Amazon scan with the fallback image-search provider.',
          details: [
            { label: 'Previous provider', value: currentProvider },
            { label: 'Fallback provider', value: fallbackProvider },
            { label: 'Reason', value: triageEvaluation.reasons[0] ?? null },
          ],
          url: null,
        }),
        rawResult: nextRawResult,
        error: null,
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        completedAt: null,
      });
    }

    const selectedCandidateUrls =
      triageEvaluation.keptCandidateUrls.length > 0
        ? triageEvaluation.keptCandidateUrls
        : parsedResult.candidateUrls;
    const selectedCandidateUrl = selectedCandidateUrls[0] ?? null;
    const selectedCandidateRank =
      triageEvaluation.candidates.find((candidate) => candidate.url === selectedCandidateUrl)
        ?.rankAfter ??
      triageEvaluation.candidates.find((candidate) => candidate.url === selectedCandidateUrl)
        ?.rankBefore ??
      1;

    if (selectedCandidateUrl) {
      const scannerEngineRequestOptions =
        buildProductScannerEngineRequestOptions(scannerSettings);
      const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
        scannerSettings,
        scannerEngineRequestOptions,
      });
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
        scannerSettings
      );
      const providerHistory = resolveAmazonImageSearchProviderHistory(
        scan.rawResult,
        currentProvider
      );
      const continuationRun = await startPlaywrightEngineTask({
        request: {
          script: amazonScanRuntime.script,
          input: amazonScanRuntime.buildRequestInput({
            productId: product.id,
            productName: scan.productName,
            existingAsin: product.asin,
            imageCandidates: scan.imageCandidates,
            imageSearchProvider: currentProvider,
            allowManualVerification:
              shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
            manualVerificationTimeoutMs,
            probeOnlyOnAmazonMatch: probeEvaluatorConfig.enabled,
            skipAmazonProbe: false,
            directAmazonCandidateUrl: selectedCandidateUrl,
            directAmazonCandidateUrls: selectedCandidateUrls,
            directMatchedImageId: parsedResult.matchedImageId,
            directAmazonCandidateRank: selectedCandidateRank,
          }),
          timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
          browserEngine: 'chromium',
          ...scannerRuntimeOptions,
          capture: {
            screenshot: true,
            html: true,
          },
          preventNewPages: true,
        },
        ownerUserId: scan.updatedBy?.trim() || null,
        instance: createCustomPlaywrightInstance({
          family: 'scrape',
          label: 'Amazon triaged candidate scan',
          tags: ['product', 'amazon', 'scan', 'candidate-triage'],
        }),
      });

      const continuationStatus =
        continuationRun.status === 'running' ? 'running' : 'queued';
      const nextRawResult = appendAmazonAiStageSummary(
        {
          ...createAmazonScanStartedRawResult({
            runId: continuationRun.runId,
            status: continuationRun.status,
            imageSearchProvider: currentProvider,
            imageSearchProviderHistory: providerHistory,
            allowManualVerification:
              shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
            manualVerificationTimeoutMs,
            previousRunId: engineRunId,
            previousResult: triageRawResult,
          }),
          candidateTriageSelectedUrls: selectedCandidateUrls,
        },
        buildAmazonCandidateTriageStageSummary(triageEvaluation, currentProvider)
      );

      return await persistSynchronizedScan(scan, {
        engineRunId: continuationRun.runId,
        status: continuationStatus,
        asin: null,
        matchedImageId: parsedResult.matchedImageId,
        title: null,
        price: null,
        url: selectedCandidateUrl,
        description: null,
        amazonDetails: null,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation: existingAmazonEvaluation,
        steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
          key: 'queue_scan',
          label: 'Start triaged Amazon candidate',
          group: 'input',
          attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
          status: 'completed',
          resultCode: continuationStatus === 'running' ? 'run_started' : 'run_queued',
          message:
            continuationStatus === 'running'
              ? 'Started the top-ranked Amazon candidate after AI triage.'
              : 'Queued the top-ranked Amazon candidate after AI triage.',
          details: [
            { label: 'Image search provider', value: currentProvider },
            { label: 'Selected candidate URL', value: selectedCandidateUrl },
            { label: 'Selected candidate rank', value: String(selectedCandidateRank) },
            { label: 'Recommended action', value: triageEvaluation.recommendedAction },
          ],
          url: selectedCandidateUrl,
        }),
        rawResult: nextRawResult,
        error: null,
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        completedAt: null,
      });
    }

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'completed',
      asin: null,
      matchedImageId: parsedResult.matchedImageId,
      title: null,
      price: null,
      url: null,
      description: null,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation: existingAmazonEvaluation,
      steps: finalizedAmazonSteps,
      rawResult: triageRawResult,
      error: 'No Kept Amazon candidates after AI triage.',
      asinUpdateStatus: 'failed',
      asinUpdateMessage: 'No candidates after AI triage.',
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    const message = normalizeErrorMessage(
      error instanceof Error ? error.message : error,
      'Failed to triage Amazon candidates.'
    );
    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'failed',
      asin: null,
      matchedImageId: parsedResult.matchedImageId,
      title: null,
      price: null,
      url: null,
      description: null,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation: existingAmazonEvaluation,
      steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'amazon_ai_triage',
        label: 'Triage Amazon candidates',
        group: 'amazon',
        attempt: resolveNextAmazonCandidateTriageStepAttempt(finalizedAmazonSteps),
        candidateId: parsedResult.matchedImageId,
        status: 'failed',
        resultCode: 'triage_failed',
        message,
        details: [{ label: 'Error', value: message }],
        url: parsedResult.candidateUrls[0] ?? null,
      }),
      rawResult: resultValue,
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  }
}

async function synchronizeAmazonProbeReady({
  scan,
  run,
  engineRunId,
  resultValue,
  parsedResult,
  persistedAmazonProbe,
  existingAmazonEvaluation,
  finalUrl,
}: SynchronizeAmazonStatusInput & {
  persistedAmazonProbe: unknown;
  existingAmazonEvaluation: unknown;
  finalUrl: string;
}): Promise<ProductScanRecord> {
  const product = await productService.getProductById(scan.productId);
  const resolvedProbeUrl = resolvePersistableScanUrl(
    parsedResult.amazonProbe?.canonicalUrl,
    parsedResult.amazonProbe?.candidateUrl,
    parsedResult.url,
    parsedResult.currentUrl,
    finalUrl
  );
  let finalizedAmazonSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
  if (!product) {
    const message = 'Product not found while evaluating the Amazon candidate.';
    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'failed',
      asin: parsedResult.asin,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvedProbeUrl,
      description: parsedResult.description,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation: existingAmazonEvaluation,
      steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'product_asin_update',
        label: 'Update product ASIN',
        group: 'product',
        status: 'failed',
        resultCode: 'product_not_found',
        message,
        details: [{ label: 'Reason', value: 'Product not found' }],
        url: resolvedProbeUrl,
      }),
      rawResult: resultValue,
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  }

  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForProbeEvaluation',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
  }

  let amazonEvaluation = existingAmazonEvaluation;
  try {
    const evaluatorConfig =
      await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings);
    let probeEvaluationRawResult: unknown = resultValue;
    if (evaluatorConfig.enabled) {
      amazonEvaluation = await evaluateAmazonScanCandidateMatch({
        scan,
        product,
        parsedResult,
        run,
        stage: 'probe_evaluate',
        evaluatorConfig,
      });
      const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(finalizedAmazonSteps);

      finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: resolveNextAmazonEvaluationStepAttempt(finalizedAmazonSteps),
        candidateId: latestCandidateMeta.candidateId ?? parsedResult.matchedImageId,
        candidateRank: latestCandidateMeta.candidateRank,
        status: resolveAmazonEvaluationStepStatus(amazonEvaluation),
        resultCode: resolveAmazonEvaluationStepResultCode(amazonEvaluation),
        message: resolveAmazonEvaluationMessage(amazonEvaluation),
        details: buildAmazonEvaluationStepDetails(amazonEvaluation, evaluatorConfig, 'probe'),
        url:
          amazonEvaluation.evidence?.candidateUrl ?? resolvedProbeUrl ?? latestCandidateMeta.url,
      });
      probeEvaluationRawResult = appendAmazonAiStageSummary(
        resultValue,
        buildAmazonEvaluationStageSummary(amazonEvaluation, {
          stage: 'probe_evaluate',
          candidateRankBefore: latestCandidateMeta.candidateRank,
          provider: resolveAmazonImageSearchProvider(scan.rawResult, scannerSettings),
        })
      );

      if (amazonEvaluation.status === 'failed') {
        const message = resolveAmazonEvaluationMessage(amazonEvaluation);
        return await persistSynchronizedScan(scan, {
          engineRunId,
          status: 'failed',
          asin: null,
          matchedImageId: parsedResult.matchedImageId,
          title: null,
          price: null,
          url: null,
          description: null,
          amazonDetails: null,
          amazonProbe: persistedAmazonProbe,
          amazonEvaluation,
          steps: finalizedAmazonSteps,
          rawResult: probeEvaluationRawResult,
          error: message,
          asinUpdateStatus: 'failed',
          asinUpdateMessage: message,
          completedAt: run.completedAt ?? new Date().toISOString(),
        });
      }

      if (amazonEvaluation.status === 'rejected') {
        const message = resolveAmazonEvaluationMessage(amazonEvaluation);
        const amazonImageSearchProvider = resolveAmazonImageSearchProvider(
          scan.rawResult,
          scannerSettings
        );
        const fallbackProvider =
          amazonEvaluation.recommendedAction === 'fallback_provider'
            ? resolveAmazonImageSearchFallbackProvider({
              rawResult: scan.rawResult,
              scannerSettings,
              currentProvider: amazonImageSearchProvider,
            })
            : null;
        if (fallbackProvider) {
          try {
            const scannerEngineRequestOptions =
              buildProductScannerEngineRequestOptions(scannerSettings);
            const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
              scannerSettings,
              scannerEngineRequestOptions,
            });
            const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
              scannerSettings
            );
            const providerHistory = resolveAmazonImageSearchProviderHistory(
              scan.rawResult,
              amazonImageSearchProvider
            );
            const fallbackRun = await startPlaywrightEngineTask({
              request: {
                script: amazonScanRuntime.script,
                input: amazonScanRuntime.buildRequestInput({
                  productId: product.id,
                  productName: scan.productName,
                  existingAsin: product.asin,
                  imageCandidates: scan.imageCandidates,
                  imageSearchProvider: fallbackProvider,
                  allowManualVerification:
                    shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                  manualVerificationTimeoutMs,
                  triageOnlyOnAmazonCandidates:
                    (
                      await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(
                        scannerSettings
                      )
                    ).enabled,
                  probeOnlyOnAmazonMatch: true,
                }),
                timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
                browserEngine: 'chromium',
                ...scannerRuntimeOptions,
                capture: {
                  screenshot: true,
                  html: true,
                },
                preventNewPages: true,
              },
              ownerUserId: scan.updatedBy?.trim() || null,
              instance: createCustomPlaywrightInstance({
                family: 'scrape',
                label: 'Amazon fallback provider scan',
                tags: ['product', 'amazon', 'scan', 'provider-fallback'],
              }),
            });

            const fallbackStatus = fallbackRun.status === 'running' ? 'running' : 'queued';
            return await persistSynchronizedScan(scan, {
              engineRunId: fallbackRun.runId,
              status: fallbackStatus,
              asin: null,
              matchedImageId: parsedResult.matchedImageId,
              title: null,
              price: null,
              url: null,
              description: null,
              amazonDetails: null,
              amazonProbe: persistedAmazonProbe,
              amazonEvaluation,
              steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
                key: 'queue_scan',
                label: 'Retry with fallback image-search provider',
                group: 'input',
                attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
                status: 'completed',
                resultCode: fallbackStatus === 'running' ? 'run_started' : 'run_queued',
                message:
                  fallbackStatus === 'running'
                    ? 'Started an Amazon scan with the fallback image-search provider.'
                    : 'Queued an Amazon scan with the fallback image-search provider.',
                details: [
                  { label: 'Previous provider', value: amazonImageSearchProvider },
                  { label: 'Fallback provider', value: fallbackProvider },
                  { label: 'Rejection category', value: amazonEvaluation.rejectionCategory },
                ],
                url: null,
              }),
              rawResult: appendAmazonAiStageSummary(
                {
                  ...createAmazonScanStartedRawResult({
                    runId: fallbackRun.runId,
                    status: fallbackRun.status,
                    imageSearchProvider: fallbackProvider,
                    imageSearchProviderHistory: [...providerHistory, fallbackProvider],
                    allowManualVerification:
                      shouldAutoShowScannerCaptchaBrowser(scannerSettings) &&
                      !scannerHeadless,
                    manualVerificationTimeoutMs,
                    previousRunId: engineRunId,
                    previousResult: probeEvaluationRawResult,
                  }),
                  providerFallback: true,
                  fallbackFromImageSearchProvider: amazonImageSearchProvider,
                  fallbackToImageSearchProvider: fallbackProvider,
                },
                buildAmazonEvaluationStageSummary(amazonEvaluation, {
                  stage: 'probe_evaluate',
                  candidateRankBefore: latestCandidateMeta.candidateRank,
                  provider: amazonImageSearchProvider,
                })
              ),
              error: null,
              asinUpdateStatus: 'pending',
              asinUpdateMessage: null,
              completedAt: null,
            });
          } catch (error) {
            const fallbackMessage = normalizeErrorMessage(
              error instanceof Error ? error.message : error,
              'Failed to retry Amazon scan with the fallback image-search provider.'
            );
            return await persistSynchronizedScan(scan, {
              engineRunId,
              status: 'failed',
              asin: null,
              matchedImageId: parsedResult.matchedImageId,
              title: null,
              price: null,
              url: null,
              description: null,
              amazonDetails: null,
              amazonProbe: persistedAmazonProbe,
              amazonEvaluation,
              steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
                key: 'queue_scan',
                label: 'Retry with fallback image-search provider',
                group: 'input',
                attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
                status: 'failed',
                resultCode: 'run_start_failed',
                message: fallbackMessage,
                details: [
                  { label: 'Previous provider', value: amazonImageSearchProvider },
                  { label: 'Fallback provider', value: fallbackProvider },
                ],
                url: null,
              }),
              rawResult: probeEvaluationRawResult,
              error: fallbackMessage,
              asinUpdateStatus: 'failed',
              asinUpdateMessage: fallbackMessage,
              completedAt: run.completedAt ?? new Date().toISOString(),
            });
          }
        }
        const nextCandidate = resolveNextAmazonCandidateUrl({
          candidateUrls: parsedResult.candidateUrls,
          currentUrl: resolvedProbeUrl,
        });

        if (
          amazonEvaluation.recommendedAction === 'try_next_candidate' &&
          nextCandidate.nextUrl &&
          nextCandidate.nextRank
        ) {
          try {
            const scannerEngineRequestOptions =
              buildProductScannerEngineRequestOptions(scannerSettings);
            const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
              scannerSettings,
              scannerEngineRequestOptions,
            });
            const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
              scannerSettings
            );
            const continuationRun = await startPlaywrightEngineTask({
              request: {
                script: amazonScanRuntime.script,
                input: amazonScanRuntime.buildRequestInput({
                  productId: product.id,
                  productName: scan.productName,
                  existingAsin: product.asin,
                  imageCandidates: scan.imageCandidates,
                  imageSearchProvider: amazonImageSearchProvider,
                  allowManualVerification:
                    shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                  manualVerificationTimeoutMs,
                  probeOnlyOnAmazonMatch: true,
                  skipAmazonProbe: false,
                  directAmazonCandidateUrl: nextCandidate.nextUrl,
                  directAmazonCandidateUrls: nextCandidate.remainingCandidateUrls,
                  directMatchedImageId: parsedResult.matchedImageId,
                  directAmazonCandidateRank: nextCandidate.nextRank,
                }),
                timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
                browserEngine: 'chromium',
                ...scannerRuntimeOptions,
                capture: {
                  screenshot: true,
                  html: true,
                },
                preventNewPages: true,
              },
              ownerUserId: scan.updatedBy?.trim() || null,
              instance: createCustomPlaywrightInstance({
                family: 'scrape',
                label: 'Amazon candidate continuation scan',
                tags: ['product', 'amazon', 'scan', 'candidate-continuation'],
              }),
            });

            const continuationStatus =
              continuationRun.status === 'running' ? 'running' : 'queued';
            const continuationRejectionKind =
              amazonEvaluation.languageAccepted === false ? 'Language gate' : 'Product mismatch';
            const continuationSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
              key: 'queue_scan',
              label: 'Continue with next Amazon candidate',
              group: 'input',
              attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
              status: 'completed',
              resultCode: continuationStatus === 'running' ? 'run_started' : 'run_queued',
              message:
                continuationStatus === 'running'
                  ? amazonEvaluation.languageAccepted === false
                    ? 'Started the next Amazon candidate after language rejection.'
                    : 'Started the next Amazon candidate after AI rejection.'
                  : amazonEvaluation.languageAccepted === false
                    ? 'Queued the next Amazon candidate after language rejection.'
                    : 'Queued the next Amazon candidate after AI rejection.',
              details: [
                { label: 'Rejection kind', value: continuationRejectionKind },
                { label: 'Rejected candidate URL', value: resolvedProbeUrl },
                { label: 'Next candidate URL', value: nextCandidate.nextUrl },
                { label: 'Image search provider', value: amazonImageSearchProvider },
              ],
              url: nextCandidate.nextUrl,
            });

            return await persistSynchronizedScan(scan, {
              engineRunId: continuationRun.runId,
              status: continuationStatus,
              asin: null,
              matchedImageId: parsedResult.matchedImageId,
              title: null,
              price: null,
              url: nextCandidate.nextUrl,
              description: null,
              amazonDetails: null,
              amazonProbe: persistedAmazonProbe,
              amazonEvaluation,
              steps: continuationSteps,
              rawResult: appendAmazonAiStageSummary(
                {
                  ...createAmazonScanStartedRawResult({
                    runId: continuationRun.runId,
                    status: continuationRun.status,
                    imageSearchProvider: amazonImageSearchProvider,
                    imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
                      scan.rawResult,
                      amazonImageSearchProvider
                    ),
                    allowManualVerification:
                      shouldAutoShowScannerCaptchaBrowser(scannerSettings) &&
                      !scannerHeadless,
                    manualVerificationTimeoutMs,
                    previousRunId: engineRunId,
                    previousResult: probeEvaluationRawResult,
                  }),
                  candidateRejectedByAi: true,
                  candidateContinuation: true,
                  approvedCandidateExtraction: false,
                  continuationCandidateUrls: nextCandidate.remainingCandidateUrls,
                },
                buildAmazonEvaluationStageSummary(amazonEvaluation, {
                  stage: 'probe_evaluate',
                  candidateRankBefore: latestCandidateMeta.candidateRank,
                  provider: amazonImageSearchProvider,
                })
              ),
              error: null,
              asinUpdateStatus: 'pending',
              asinUpdateMessage: null,
              completedAt: null,
            });
          } catch (error) {
            const continuationMessage = normalizeErrorMessage(
              error instanceof Error ? error.message : error,
              amazonEvaluation.languageAccepted === false
                ? 'Failed to continue with the next Amazon candidate after language rejection.'
                : 'Failed to continue with the next Amazon candidate after AI rejection.'
            );
            return await persistSynchronizedScan(scan, {
              engineRunId: continuationRun.runId,
              status: 'failed',
              asin: null,
              matchedImageId: parsedResult.matchedImageId,
              title: null,
              price: null,
              url: null,
              description: null,
              amazonDetails: null,
              amazonProbe: persistedAmazonProbe,
              amazonEvaluation,
              steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
                key: 'queue_scan',
                label: 'Continue with next Amazon candidate',
                group: 'input',
                attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
                status: 'failed',
                resultCode: 'run_start_failed',
                message: continuationMessage,
                details: [
                  {
                    label: 'Rejection kind',
                    value:
                      amazonEvaluation.languageAccepted === false
                        ? 'Language gate'
                        : 'Product mismatch',
                  },
                  { label: 'Rejected candidate URL', value: resolvedProbeUrl },
                  { label: 'Next candidate URL', value: nextCandidate.nextUrl },
                ],
                url: nextCandidate.nextUrl,
              }),
              rawResult: probeEvaluationRawResult,
              error: continuationMessage,
              asinUpdateStatus: 'failed',
              asinUpdateMessage: continuationMessage,
              completedAt: run.completedAt ?? new Date().toISOString(),
            });
          }
        }

        const skippedUpdateSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
          key: 'product_asin_update',
          label: 'Update product ASIN',
          group: 'product',
          status: 'skipped',
          resultCode: 'asin_not_needed',
          message: 'Skipped product ASIN update because the AI evaluator rejected the Amazon candidate.',
          details: [{ label: 'Reason', value: message }],
          url: amazonEvaluation.evidence?.candidateUrl ?? resolvedProbeUrl,
        });
        return await persistSynchronizedScan(scan, {
          engineRunId,
          status: 'no_match',
          asin: null,
          matchedImageId: parsedResult.matchedImageId,
          title: null,
          price: null,
          url: null,
          description: null,
          amazonDetails: null,
          amazonProbe: persistedAmazonProbe,
          amazonEvaluation,
          steps: skippedUpdateSteps,
          rawResult: probeEvaluationRawResult,
          error: message,
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: message,
          completedAt: run.completedAt ?? new Date().toISOString(),
        });
      }
    }

    const scannerEngineRequestOptions =
      buildProductScannerEngineRequestOptions(scannerSettings);
    const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
      scannerSettings,
      scannerEngineRequestOptions,
    });
    const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
      scannerSettings
    );
    const amazonImageSearchProvider = resolveAmazonImageSearchProvider(
      scan.rawResult,
      scannerSettings
    );
    const extractionRun = await startPlaywrightEngineTask({
      request: {
        script: amazonScanRuntime.script,
        input: amazonScanRuntime.buildRequestInput({
          productId: product.id,
          productName: scan.productName,
          existingAsin: product.asin,
          imageCandidates: scan.imageCandidates,
          imageSearchProvider: amazonImageSearchProvider,
          allowManualVerification:
            shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
          manualVerificationTimeoutMs,
          probeOnlyOnAmazonMatch: false,
          skipAmazonProbe: true,
          directAmazonCandidateUrl: resolvedProbeUrl,
          directMatchedImageId: parsedResult.matchedImageId,
          directAmazonCandidateRank:
            finalizedAmazonSteps
              .slice()
              .reverse()
              .find((step) => step.key === 'amazon_probe')?.candidateRank ?? 1,
        }),
        timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
        browserEngine: 'chromium',
        ...scannerRuntimeOptions,
        capture: {
          screenshot: true,
          html: true,
        },
        preventNewPages: true,
      },
      ownerUserId: scan.updatedBy?.trim() || null,
      instance: createCustomPlaywrightInstance({
        family: 'scrape',
        label: 'Amazon approved candidate extraction',
        tags: ['product', 'amazon', 'scan', 'approved-candidate-extract'],
      }),
    });

    const extractionRunStatus = extractionRun.status === 'running' ? 'running' : 'queued';
    const nextSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
      key: 'queue_scan',
      label: 'Start approved Amazon extraction',
      group: 'input',
      attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
      status: 'completed',
      resultCode: extractionRunStatus === 'running' ? 'run_started' : 'run_queued',
      message:
        extractionRunStatus === 'running'
          ? 'Started a direct Amazon extraction run after AI approval.'
          : 'Queued a direct Amazon extraction run after AI approval.',
      details: [
        { label: 'Candidate URL', value: resolvedProbeUrl },
        { label: 'Image search provider', value: amazonImageSearchProvider },
      ],
      url: resolvedProbeUrl,
    });

    return await persistSynchronizedScan(scan, {
      engineRunId: extractionRun.runId,
      status: extractionRunStatus,
      asin: parsedResult.asin,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: null,
      url: resolvedProbeUrl,
      description: parsedResult.description,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation,
      steps: nextSteps,
      rawResult: {
        ...createAmazonScanStartedRawResult({
          runId: extractionRun.runId,
          status: extractionRun.status,
          imageSearchProvider: amazonImageSearchProvider,
          imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
            scan.rawResult,
            amazonImageSearchProvider
          ),
          allowManualVerification:
            shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
          manualVerificationTimeoutMs,
          previousRunId: engineRunId,
          previousResult: probeEvaluationRawResult,
        }),
        approvedCandidateExtraction: true,
        approvedCandidateUrl: resolvedProbeUrl,
      },
      error: null,
      asinUpdateStatus: 'pending',
      asinUpdateMessage: null,
      completedAt: null,
    });
  } catch (error) {
    const message = normalizeErrorMessage(
      error instanceof Error ? error.message : error,
      'Failed to continue with direct Amazon extraction after probe evaluation.'
    );
    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'failed',
      asin: null,
      matchedImageId: parsedResult.matchedImageId,
      title: null,
      price: null,
      url: null,
      description: null,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation,
      steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'queue_scan',
        label: 'Start approved Amazon extraction',
        group: 'input',
        attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
        status: 'failed',
        resultCode: 'run_start_failed',
        message,
        details: [{ label: 'Candidate URL', value: resolvedProbeUrl }],
        url: resolvedProbeUrl,
      }),
      rawResult: resultValue,
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  }
}

export async function synchronizeProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  if (isProductScanTerminalStatus(scan.status)) {
    return scan;
  }

  if (scan.provider === '1688') {
    return await synchronize1688ProductScan(scan);
  }

  const engineRunId = resolveScanEngineRunId(scan);

  if (!engineRunId) {
    const ageMs =
      resolveIsoAgeMs(scan.updatedAt) ??
      resolveIsoAgeMs(scan.createdAt) ??
      resolveIsoAgeMs(scan.completedAt);
    if (
      ageMs != null &&
      ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS
    ) {
      return await persistFailedSynchronization(
        scan,
        'Amazon scan is missing its Playwright engine run id.'
      );
    }

    return scan;
  }

  try {
    let run;
    try {
      run = await readPlaywrightEngineRun(engineRunId);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronizeProductScan.readRun',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
      return scan;
    }

    if (!run) {
      const message = `Playwright engine run ${engineRunId} was not found.`;
      return await persistFailedSynchronization(scan, message);
    }

    const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
    const parsedResult = parseAmazonScanScriptResult(resultValue);
    const existingAmazonEvaluation = scan.amazonEvaluation ?? null;
    const approvedCandidateProbe =
      isApprovedAmazonCandidateExtractionRun(scan) ? scan.amazonProbe ?? null : null;
    const persistedAmazonProbe = parsedResult.amazonProbe ?? approvedCandidateProbe;

    if (run.status === 'queued' || run.status === 'running') {
      const existingRawResult = toRecord(scan.rawResult) ?? {};
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
        existingRawResult
      );
      const activeRunDiagnostics = buildAmazonActiveRunDiagnostics(run);
      const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
      const latestActiveStage =
        readOptionalString(activeRunDiagnostics['latestStage']) ??
        readOptionalString(toRecord(resultValue)?.['stage']);
      const manualVerificationPending =
        shouldKeepAmazonManualVerificationPending({
          parsedStatus: parsedResult.status ?? null,
          existingPending: existingRawResult['manualVerificationPending'] === true,
          latestStage: latestActiveStage,
        });
      const activeMessage =
        manualVerificationPending
          ? resolveManualVerificationMessage(parsedResult.message)
          : null;
      const allowedRuntimeMs = manualVerificationPending
        ? Math.max(AMAZON_SCAN_TIMEOUT_MS, manualVerificationTimeoutMs + 60_000)
        : AMAZON_SCAN_TIMEOUT_MS;
      const activeRunAgeMs =
        resolveIsoAgeMs(run.startedAt) ?? resolveIsoAgeMs(run.createdAt);
      const activeRunIdleAgeMs = resolveIsoAgeMs(run.updatedAt);
      const nextRawResult =
        manualVerificationPending
          ? {
              ...existingRawResult,
              ...activeRunDiagnostics,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: true,
              manualVerificationMessage: activeMessage,
              manualVerificationTimeoutMs,
            }
          : {
              ...existingRawResult,
              ...activeRunDiagnostics,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: false,
              manualVerificationMessage: null,
              manualVerificationTimeoutMs,
            };
      const staleActiveReason =
        manualVerificationPending &&
        activeRunAgeMs != null &&
        activeRunAgeMs >= allowedRuntimeMs
          ? 'manual_verification_expired'
          : activeRunIdleAgeMs != null && activeRunIdleAgeMs >= allowedRuntimeMs
              ? 'no_progress'
            : activeRunAgeMs != null && activeRunAgeMs >= allowedRuntimeMs
              ? 'runtime_exceeded'
              : null;
      if (staleActiveReason) {
        const staleMessage = resolveAmazonActiveRunStallMessage({
          reason: staleActiveReason,
          latestStage:
            readOptionalString((nextRawResult as { latestStage?: unknown })['latestStage']) ??
            readOptionalString((nextRawResult as { stage?: unknown })['stage']),
        });
        return await persistSynchronizedScan(scan, {
          engineRunId,
          status: 'failed',
          steps: nextSteps,
          rawResult: {
            ...nextRawResult,
            manualVerificationPending: false,
            manualVerificationMessage: null,
            ...(manualVerificationPending
              ? {
                  manualVerificationExpired: true,
                }
              : {}),
            stalledReason: staleActiveReason,
            stalledAt: new Date().toISOString(),
          },
          error: staleMessage,
          asinUpdateStatus: 'failed',
          asinUpdateMessage: staleMessage,
          completedAt: new Date().toISOString(),
        });
      }
      const rawResultChanged =
        JSON.stringify(existingRawResult) !== JSON.stringify(nextRawResult);
      const shouldPersistActiveState =
        scan.status !== run.status ||
        scan.engineRunId !== engineRunId ||
        !areProductScanStepsEqual(scan.steps, nextSteps) ||
        rawResultChanged ||
        (activeMessage ?? null) !== (scan.asinUpdateMessage ?? null) ||
        (manualVerificationPending &&
          existingRawResult['manualVerificationPending'] !== true) ||
        (!manualVerificationPending &&
          (existingRawResult['manualVerificationPending'] === true ||
            readOptionalString(existingRawResult['manualVerificationMessage']) != null));

      if (shouldPersistActiveState) {
        return await persistSynchronizedScan(scan, {
          engineRunId,
          status: run.status,
          steps: nextSteps,
          rawResult: nextRawResult,
          error: null,
          asinUpdateStatus: 'pending',
          asinUpdateMessage: activeMessage,
          completedAt: null,
        });
      }


            return scan;
          }

          if (run.status === 'failed') {
            const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
            const failureMessage = normalizeErrorMessage(
              failureMessages[0],
              'Amazon reverse image scan failed.'
            );

            return await persistSynchronizedScan(scan, {
              engineRunId,
              status: 'failed',
              steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
              error: failureMessage,
              rawResult: buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true }),
              asinUpdateStatus: 'not_needed',
              asinUpdateMessage: failureMessage,
              completedAt: run.completedAt ?? new Date().toISOString(),
            });
          }

          if (parsedResult.status === 'triage_ready') {
            return await synchronizeAmazonTriageReady({
              scan,
              run,
              engineRunId,
              resultValue,
              parsedResult,
              persistedAmazonProbe,
              existingAmazonEvaluation,
            });
          }

          if (parsedResult.status === 'probe_ready') {
            return await synchronizeAmazonProbeReady({
              scan,
              run,
              engineRunId,
              resultValue,
              parsedResult,
              persistedAmazonProbe,
              existingAmazonEvaluation,
              finalUrl,
            });
          }

          if (parsedResult.status === 'no_match') {
            return await persistSynchronizedScan(scan, {
              engineRunId,
              status: 'no_match',
              matchedImageId: parsedResult.matchedImageId,
              title: parsedResult.title,
              price: parsedResult.price,
              url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
              description: parsedResult.description,
              amazonDetails: parsedResult.amazonDetails,
              amazonProbe: persistedAmazonProbe,
              amazonEvaluation: existingAmazonEvaluation,
              steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
              rawResult: resultValue,
              error: parsedResult.message,
              asinUpdateStatus: 'not_needed',
              asinUpdateMessage: parsedResult.message,
              completedAt: run.completedAt ?? new Date().toISOString(),
            });
          }

    if (parsedResult.status !== 'matched') {
      const failureMessage = normalizeErrorMessage(
        parsedResult.message || collectPlaywrightEngineRunFailureMessages(run)[0],
        'Amazon reverse image scan failed.'
      );
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        amazonDetails: parsedResult.amazonDetails,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation: existingAmazonEvaluation,
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
        rawResult: resultValue,
        error: failureMessage,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const product = await productService.getProductById(scan.productId);
    if (!product) {
      const message = 'Product not found while finalizing the Amazon scan.';
      const finalizedSteps = upsertPersistedProductScanStep(
        resolvePersistedProductScanSteps(scan, parsedResult.steps),
        {
          key: 'product_asin_update',
          label: 'Update product ASIN',
          group: 'product',
          status: 'failed',
          resultCode: 'product_not_found',
          message,
          details: [{ label: 'Reason', value: 'Product not found' }],
          url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        }
      );
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        asin: parsedResult.asin,
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        amazonDetails: parsedResult.amazonDetails,
        amazonProbe: persistedAmazonProbe,
        steps: finalizedSteps,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const resolvedScanUrl = resolvePersistableScanUrl(
      parsedResult.url,
      parsedResult.currentUrl,
      finalUrl
    );
    let finalizedAmazonSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
    let amazonEvaluation: ProductScanAmazonEvaluation =
      isApprovedAmazonCandidateExtractionRun(scan) ? existingAmazonEvaluation : null;

    let scannerSettings = createDefaultProductScannerSettings();
    let scannerHeadless = true;
    try {
      scannerSettings = await getProductScannerSettings();
      scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronizeProductScan.loadScannerSettingsForAmazonEvaluator',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
    }

    let extractionEvaluationRawResult: unknown = resultValue;
    try {
      const evaluatorConfig =
        await resolveProductScannerAmazonCandidateEvaluatorExtractionConfig(scannerSettings);
      if (evaluatorConfig.enabled && !isApprovedAmazonCandidateExtractionRun(scan)) {
        amazonEvaluation = await evaluateAmazonScanCandidateMatch({
          scan,
          product,
          parsedResult,
          run,
          stage: 'extraction_evaluate',
          evaluatorConfig,
        });
        const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(finalizedAmazonSteps);

        finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
          key: 'amazon_ai_evaluate',
          label: 'Evaluate Amazon candidate match',
          group: 'amazon',
          attempt: resolveNextAmazonEvaluationStepAttempt(finalizedAmazonSteps),
          candidateId: latestCandidateMeta.candidateId ?? parsedResult.matchedImageId,
          candidateRank: latestCandidateMeta.candidateRank,
          status: resolveAmazonEvaluationStepStatus(amazonEvaluation),
          resultCode: resolveAmazonEvaluationStepResultCode(amazonEvaluation),
          message: resolveAmazonEvaluationMessage(amazonEvaluation),
          details: buildAmazonEvaluationStepDetails(amazonEvaluation, evaluatorConfig, 'extraction'),
          url:
            amazonEvaluation.evidence?.candidateUrl ?? resolvedScanUrl ?? latestCandidateMeta.url,
        });
        extractionEvaluationRawResult = appendAmazonAiStageSummary(
          resultValue,
          buildAmazonEvaluationStageSummary(amazonEvaluation, {
            stage: 'extraction_evaluate',
            candidateRankBefore: latestCandidateMeta.candidateRank,
            provider: resolveAmazonImageSearchProvider(scan.rawResult, scannerSettings),
          })
        );

        if (amazonEvaluation.status === 'failed') {
          const message = resolveAmazonEvaluationMessage(amazonEvaluation);
          return await persistSynchronizedScan(scan, {
            engineRunId,
            status: 'failed',
            asin: null,
            matchedImageId: parsedResult.matchedImageId,
            title: null,
            price: null,
            url: null,
            description: null,
            amazonDetails: null,
            amazonProbe: persistedAmazonProbe,
            amazonEvaluation,
            steps: finalizedAmazonSteps,
            rawResult: extractionEvaluationRawResult,
            error: message,
            asinUpdateStatus: 'failed',
            asinUpdateMessage: message,
            completedAt: run.completedAt ?? new Date().toISOString(),
          });
        }

        if (amazonEvaluation.status === 'rejected') {
          const message = resolveAmazonEvaluationMessage(amazonEvaluation);
          const amazonImageSearchProvider = resolveAmazonImageSearchProvider(
            scan.rawResult,
            scannerSettings
          );
          const fallbackProvider =
            amazonEvaluation.recommendedAction === 'fallback_provider'
              ? resolveAmazonImageSearchFallbackProvider({
                  rawResult: scan.rawResult,
                  scannerSettings,
                  currentProvider: amazonImageSearchProvider,
                })
              : null;
          if (fallbackProvider) {
            const scannerEngineRequestOptions =
              buildProductScannerEngineRequestOptions(scannerSettings);
            const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
              scannerSettings,
              scannerEngineRequestOptions,
            });
            const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
              scannerSettings
            );
            const providerHistory = resolveAmazonImageSearchProviderHistory(
              scan.rawResult,
              amazonImageSearchProvider
            );
            const fallbackRun = await startPlaywrightEngineTask({
              request: {
                script: amazonScanRuntime.script,
                input: amazonScanRuntime.buildRequestInput({
                  productId: product.id,
                  productName: scan.productName,
                  existingAsin: product.asin,
                  imageCandidates: scan.imageCandidates,
                  imageSearchProvider: fallbackProvider,
                  allowManualVerification:
                    shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                  manualVerificationTimeoutMs,
                  triageOnlyOnAmazonCandidates:
                    (
                      await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(
                        scannerSettings
                      )
                    ).enabled,
                  probeOnlyOnAmazonMatch:
                    (
                      await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(
                        scannerSettings
                      )
                    ).enabled,
                }),
                timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
                browserEngine: 'chromium',
                ...scannerRuntimeOptions,
                capture: {
                  screenshot: true,
                  html: true,
                },
                preventNewPages: true,
              },
              ownerUserId: scan.updatedBy?.trim() || null,
              instance: createCustomPlaywrightInstance({
                family: 'scrape',
                label: 'Amazon fallback provider scan',
                tags: ['product', 'amazon', 'scan', 'provider-fallback'],
              }),
            });

            const fallbackStatus = fallbackRun.status === 'running' ? 'running' : 'queued';
            return await persistSynchronizedScan(scan, {
              engineRunId: fallbackRun.runId,
              status: fallbackStatus,
              asin: null,
              matchedImageId: parsedResult.matchedImageId,
              title: null,
              price: null,
              url: null,
              description: null,
              amazonDetails: null,
              amazonProbe: persistedAmazonProbe,
              amazonEvaluation,
              steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
                key: 'queue_scan',
                label: 'Retry with fallback image-search provider',
                group: 'input',
                attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
                status: 'completed',
                resultCode: fallbackStatus === 'running' ? 'run_started' : 'run_queued',
                message:
                  fallbackStatus === 'running'
                    ? 'Started an Amazon scan with the fallback image-search provider.'
                    : 'Queued an Amazon scan with the fallback image-search provider.',
                details: [
                  { label: 'Previous provider', value: amazonImageSearchProvider },
                  { label: 'Fallback provider', value: fallbackProvider },
                  { label: 'Rejection category', value: amazonEvaluation.rejectionCategory },
                ],
                url: null,
              }),
              rawResult: appendAmazonAiStageSummary(
                {
                  ...createAmazonScanStartedRawResult({
                    runId: fallbackRun.runId,
                    status: fallbackRun.status,
                    imageSearchProvider: fallbackProvider,
                    imageSearchProviderHistory: [...providerHistory, fallbackProvider],
                    allowManualVerification:
                      shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                    manualVerificationTimeoutMs,
                    previousRunId: engineRunId,
                    previousResult: extractionEvaluationRawResult,
                  }),
                  providerFallback: true,
                  fallbackFromImageSearchProvider: amazonImageSearchProvider,
                  fallbackToImageSearchProvider: fallbackProvider,
                },
                buildAmazonEvaluationStageSummary(amazonEvaluation, {
                  stage: 'extraction_evaluate',
                  candidateRankBefore: latestCandidateMeta.candidateRank,
                  provider: amazonImageSearchProvider,
                })
              ),
              error: null,
              asinUpdateStatus: 'pending',
              asinUpdateMessage: null,
              completedAt: null,
            });
          }
          const nextCandidate = resolveNextAmazonCandidateUrl({
            candidateUrls: parsedResult.candidateUrls,
            currentUrl: resolvedScanUrl,
          });
          if (
            amazonEvaluation.recommendedAction === 'try_next_candidate' &&
            nextCandidate.nextUrl &&
            nextCandidate.nextRank
          ) {
            const scannerEngineRequestOptions =
              buildProductScannerEngineRequestOptions(scannerSettings);
            const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
              scannerSettings,
              scannerEngineRequestOptions,
            });
            const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
              scannerSettings
            );
            const continuationRun = await startPlaywrightEngineTask({
              request: {
                script: amazonScanRuntime.script,
                input: amazonScanRuntime.buildRequestInput({
                  productId: product.id,
                  productName: scan.productName,
                  existingAsin: product.asin,
                  imageCandidates: scan.imageCandidates,
                  imageSearchProvider: amazonImageSearchProvider,
                  allowManualVerification:
                    shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                  manualVerificationTimeoutMs,
                  probeOnlyOnAmazonMatch: true,
                  skipAmazonProbe: false,
                  directAmazonCandidateUrl: nextCandidate.nextUrl,
                  directAmazonCandidateUrls: nextCandidate.remainingCandidateUrls,
                  directMatchedImageId: parsedResult.matchedImageId,
                  directAmazonCandidateRank: nextCandidate.nextRank,
                }),
                timeoutMs: AMAZON_SCAN_TIMEOUT_MS,
                browserEngine: 'chromium',
                ...scannerRuntimeOptions,
                capture: {
                  screenshot: true,
                  html: true,
                },
                preventNewPages: true,
              },
              ownerUserId: scan.updatedBy?.trim() || null,
              instance: createCustomPlaywrightInstance({
                family: 'scrape',
                label: 'Amazon candidate continuation scan',
                tags: ['product', 'amazon', 'scan', 'candidate-continuation'],
              }),
            });

            const continuationStatus =
              continuationRun.status === 'running' ? 'running' : 'queued';
            return await persistSynchronizedScan(scan, {
              engineRunId: continuationRun.runId,
              status: continuationStatus,
              asin: null,
              matchedImageId: parsedResult.matchedImageId,
              title: null,
              price: null,
              url: nextCandidate.nextUrl,
              description: null,
              amazonDetails: null,
              amazonProbe: persistedAmazonProbe,
              amazonEvaluation,
              steps: upsertPersistedProductScanStep(finalizedAmazonSteps, {
                key: 'queue_scan',
                label: 'Continue with next Amazon candidate',
                group: 'input',
                attempt: resolveNextQueueStepAttempt(finalizedAmazonSteps),
                status: 'completed',
                resultCode: continuationStatus === 'running' ? 'run_started' : 'run_queued',
                message:
                  continuationStatus === 'running'
                    ? 'Started the next Amazon candidate after extraction-stage AI rejection.'
                    : 'Queued the next Amazon candidate after extraction-stage AI rejection.',
                details: [
                  { label: 'Rejection category', value: amazonEvaluation.rejectionCategory },
                  { label: 'Rejected candidate URL', value: resolvedScanUrl },
                  { label: 'Next candidate URL', value: nextCandidate.nextUrl },
                ],
                url: nextCandidate.nextUrl,
              }),
              rawResult: appendAmazonAiStageSummary(
                {
                  ...createAmazonScanStartedRawResult({
                    runId: continuationRun.runId,
                    status: continuationRun.status,
                    imageSearchProvider: amazonImageSearchProvider,
                    imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
                      scan.rawResult,
                      amazonImageSearchProvider
                    ),
                    allowManualVerification:
                      shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                    manualVerificationTimeoutMs,
                    previousRunId: engineRunId,
                    previousResult: extractionEvaluationRawResult,
                  }),
                  candidateRejectedByAi: true,
                  candidateContinuation: true,
                  approvedCandidateExtraction: false,
                  continuationCandidateUrls: nextCandidate.remainingCandidateUrls,
                },
                buildAmazonEvaluationStageSummary(amazonEvaluation, {
                  stage: 'extraction_evaluate',
                  candidateRankBefore: latestCandidateMeta.candidateRank,
                  provider: amazonImageSearchProvider,
                })
              ),
              error: null,
              asinUpdateStatus: 'pending',
              asinUpdateMessage: null,
              completedAt: null,
            });
          }
          const skippedUpdateSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
            key: 'product_asin_update',
            label: 'Update product ASIN',
            group: 'product',
            status: 'skipped',
            resultCode: 'asin_not_needed',
            message: 'Skipped product ASIN update because the AI evaluator rejected the Amazon candidate.',
            details: [{ label: 'Reason', value: message }],
            url: amazonEvaluation.evidence?.candidateUrl ?? resolvedScanUrl,
          });
          return await persistSynchronizedScan(scan, {
            engineRunId,
            status: 'no_match',
            asin:
              amazonEvaluation.rejectionCategory === 'language' &&
              amazonEvaluation.sameProduct === true
                ? parsedResult.asin
                : null,
            matchedImageId: parsedResult.matchedImageId,
            title: null,
            price: null,
            url:
              amazonEvaluation.rejectionCategory === 'language' &&
              amazonEvaluation.sameProduct === true
                ? resolvedScanUrl
                : null,
            description: null,
            amazonDetails:
              amazonEvaluation.rejectionCategory === 'language' &&
              amazonEvaluation.sameProduct === true
                ? parsedResult.amazonDetails
                : null,
            amazonProbe: persistedAmazonProbe,
            amazonEvaluation,
            steps: skippedUpdateSteps,
            rawResult: extractionEvaluationRawResult,
            error: message,
            asinUpdateStatus: 'not_needed',
            asinUpdateMessage: message,
            completedAt: run.completedAt ?? new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      const message = normalizeErrorMessage(
        error instanceof Error ? error.message : error,
        'Amazon candidate AI evaluation failed.'
      );
      const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(finalizedAmazonSteps);
	      amazonEvaluation = {
        stage: 'extraction_evaluate',
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        descriptionMatch: null,
        pageRepresentsSameProduct: null,
        confidence: null,
        proceed: false,
        scrapeAllowed: false,
        recommendedAction: null,
        rejectionCategory: null,
        threshold: null,
        reasons: [],
        mismatches: [],
        mismatchLabels: [],
        variantAssessment: null,
        modelId: null,
        brainApplied: null,
        evidence: {
          candidateUrl: resolvedScanUrl,
          pageTitle: parsedResult.title,
          heroImageSource: null,
          heroImageArtifactName: null,
          screenshotArtifactName: null,
          htmlArtifactName: null,
          productImageSource: scan.imageCandidates[0]?.url ?? scan.imageCandidates[0]?.filepath ?? null,
        },
	        error: message,
	        evaluatedAt: new Date().toISOString(),
	      };
	      const evaluationCandidateUrl =
	        amazonEvaluation.evidence?.candidateUrl ?? resolvedScanUrl ?? latestCandidateMeta.url;
	      finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: resolveNextAmazonEvaluationStepAttempt(finalizedAmazonSteps),
        candidateId: latestCandidateMeta.candidateId ?? parsedResult.matchedImageId,
        candidateRank: latestCandidateMeta.candidateRank,
        status: 'failed',
	        resultCode: 'evaluation_failed',
	        message,
	        details: [
	          { label: 'Candidate URL', value: evaluationCandidateUrl },
	          { label: 'Error', value: message },
	        ],
	        url: evaluationCandidateUrl,
	      });
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        asin: null,
        matchedImageId: parsedResult.matchedImageId,
        title: null,
        price: null,
        url: null,
        description: null,
        amazonDetails: null,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation,
        steps: finalizedAmazonSteps,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const asinOutcome = resolveDetectedAmazonAsinOutcome({
      existingAsin: product.asin,
      detectedAsin: parsedResult.asin,
    });

    let updateFailureMessage: string | null = null;
    if (asinOutcome.asinUpdateStatus === 'updated' && asinOutcome.normalizedDetectedAsin) {
      try {
        await productService.updateProduct(
          product.id,
          { asin: asinOutcome.normalizedDetectedAsin },
          scan.updatedBy ? { userId: scan.updatedBy } : undefined
        );
        CachedProductService.invalidateProduct(product.id);
      } catch (error) {
        updateFailureMessage = normalizeErrorMessage(error instanceof Error ? error.message : error, 'Failed to update product ASIN.');
      }
    }

    const nextStatus = updateFailureMessage ? 'failed' : asinOutcome.scanStatus;
    const nextAsinUpdateStatus = updateFailureMessage ? 'failed' : asinOutcome.asinUpdateStatus;
    const nextMessage = updateFailureMessage ?? asinOutcome.message;
    const writeEnglishFields = shouldWriteAmazonEnglishContent(amazonEvaluation);
    const finalizedSteps = upsertPersistedProductScanStep(
      finalizedAmazonSteps,
      {
        key: 'product_asin_update',
        label: 'Update product ASIN',
        group: 'product',
        status: resolveAsinUpdateStepStatus(nextAsinUpdateStatus),
        resultCode:
          nextAsinUpdateStatus === 'updated'
            ? 'asin_updated'
            : nextAsinUpdateStatus === 'unchanged'
              ? 'asin_unchanged'
              : nextAsinUpdateStatus === 'conflict'
                ? 'asin_conflict'
                : nextAsinUpdateStatus === 'not_needed'
                  ? 'asin_not_needed'
                  : 'asin_update_failed',
        message: nextMessage,
        details: [
          { label: 'Detected ASIN', value: asinOutcome.normalizedDetectedAsin },
          { label: 'Existing ASIN', value: product.asin ?? null },
        ],
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
      }
    );

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: nextStatus,
      asin: asinOutcome.normalizedDetectedAsin,
      matchedImageId: parsedResult.matchedImageId,
      title: writeEnglishFields ? parsedResult.title : null,
      price: parsedResult.price,
      url: resolvedScanUrl,
      description: writeEnglishFields ? parsedResult.description : null,
      amazonDetails: parsedResult.amazonDetails,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation,
      steps: finalizedSteps,
      rawResult: extractionEvaluationRawResult,
      error: nextStatus === 'failed' || nextStatus === 'conflict' ? nextMessage : null,
      asinUpdateStatus: nextAsinUpdateStatus,
      asinUpdateMessage: nextMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to synchronize Amazon reverse image scan.';
    return await persistFailedSynchronization(scan, message);
  }
}

async function synchronize1688ProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  const engineRunId = resolveScanEngineRunId(scan);

  if (!engineRunId) {
    const ageMs =
      resolveIsoAgeMs(scan.updatedAt) ??
      resolveIsoAgeMs(scan.createdAt) ??
      resolveIsoAgeMs(scan.completedAt);
    if (ageMs != null && ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS) {
      return await persistFailedSynchronization(
        scan,
        '1688 supplier scan is missing its Playwright engine run id.',
        '1688 supplier reverse image scan failed.'
      );
    }

    return scan;
  }

  try {
    let run;
    try {
      run = await readPlaywrightEngineRun(engineRunId);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronize1688ProductScan.readRun',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
      return scan;
    }

    if (!run) {
      return await persistFailedSynchronization(
        scan,
        `Playwright engine run ${engineRunId} was not found.`,
        '1688 supplier reverse image scan failed.'
      );
    }

    const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
    const parsedResult = parse1688ScanScriptResult(resultValue);

    if (run.status === 'queued' || run.status === 'running') {
      const existingRawResult = toRecord(scan.rawResult) ?? {};
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(existingRawResult);
      const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
      const manualVerificationPending =
        parsedResult.status === 'captcha_required' ||
        (existingRawResult['manualVerificationPending'] === true &&
          (parsedResult.status === 'running' || parsedResult.status == null));
      const activeMessage =
        manualVerificationPending
          ? resolve1688ManualVerificationMessage(
              parsedResult.message,
              existingRawResult['manualVerificationMessage'] ?? scan.asinUpdateMessage
            )
          : null;
      const nextRawResult =
        manualVerificationPending
          ? {
              ...existingRawResult,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: true,
              manualVerificationMessage: activeMessage,
              manualVerificationTimeoutMs,
            }
          : {
              ...existingRawResult,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: false,
              manualVerificationMessage: null,
              manualVerificationTimeoutMs,
            };

      const shouldPersistActiveState =
        scan.status !== run.status ||
        scan.engineRunId !== engineRunId ||
        !areProductScanStepsEqual(scan.steps, nextSteps) ||
        JSON.stringify(existingRawResult) !== JSON.stringify(nextRawResult) ||
        (activeMessage ?? null) !== (scan.asinUpdateMessage ?? null) ||
        (manualVerificationPending &&
          existingRawResult['manualVerificationPending'] !== true) ||
        (!manualVerificationPending &&
          (existingRawResult['manualVerificationPending'] === true ||
            readOptionalString(existingRawResult['manualVerificationMessage']) != null));

      if (!shouldPersistActiveState) {
        return scan;
      }

      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: run.status,
        steps: nextSteps,
        rawResult: nextRawResult,
        error: null,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: activeMessage,
        completedAt: null,
      });
    }

    if (run.status === 'failed') {
      const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
      const failureMessage = normalizeErrorMessage(
        failureMessages[0],
        '1688 supplier reverse image scan failed.'
      );

      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
        error: failureMessage,
        rawResult: buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true }),
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    if (run.status !== 'completed') {
      return scan;
    }

    if (parsedResult.status === 'captcha_required') {
      return await persistFailedSynchronization(
        scan,
        resolve1688ManualVerificationMessage(
          parsedResult.message,
          toRecord(scan.rawResult)?.['manualVerificationMessage'] ?? scan.asinUpdateMessage
        ),
        '1688 supplier reverse image scan failed.'
      );
    }

    if (parsedResult.status === 'failed') {
      return await persistFailedSynchronization(
        scan,
        normalize1688ScanFailureMessage(
          parsedResult.message,
          '1688 supplier reverse image scan failed.'
        ),
        '1688 supplier reverse image scan failed.'
      );
    }

    const resolvedScanUrl = resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl);
    let finalizedSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
    let nextStatus: ProductScanStatus = parsedResult.status === 'no_match' ? 'no_match' : 'completed';
    let nextMessage =
      parsedResult.message ??
      (nextStatus === 'no_match'
        ? 'No 1688 supplier page matched the scanned product image.'
        : '1688 supplier reverse image scan completed.');
    let supplierEvaluation = parsedResult.supplierEvaluation;

    let scannerSettings = createDefaultProductScannerSettings();
    try {
      scannerSettings = await getProductScannerSettings();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronize1688ProductScan.loadScannerSettingsForSupplierEvaluator',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
    }

    try {
      const evaluatorConfig =
        await resolveProductScanner1688CandidateEvaluatorConfig(scannerSettings);
      const hasSupplierCandidate =
        parsedResult.supplierProbe != null ||
        parsedResult.supplierDetails != null ||
        resolvedScanUrl != null ||
        parsedResult.title != null;
      if (evaluatorConfig.enabled && hasSupplierCandidate) {
        const product = await productService.getProductById(scan.productId);
        if (!product) {
          return await persistFailedSynchronization(
            scan,
            'Product not found while running the 1688 supplier evaluator.',
            '1688 supplier reverse image scan failed.'
          );
        }

        supplierEvaluation = await evaluate1688SupplierCandidateMatch({
          scan,
          product,
          parsedResult,
          run,
          evaluatorConfig,
        });

        finalizedSteps = upsertPersistedProductScanStep(finalizedSteps, {
          key: 'supplier_ai_evaluate',
          label: 'Evaluate supplier candidate match',
          group: 'supplier',
          attempt: resolveNext1688EvaluationStepAttempt(finalizedSteps),
          candidateId: parsedResult.matchedImageId,
          candidateRank: resolve1688CandidateRank(parsedResult.supplierProbe),
          status: resolve1688EvaluationStepStatus(supplierEvaluation),
          resultCode: resolve1688EvaluationStepResultCode(supplierEvaluation),
          message: resolve1688EvaluationMessage(supplierEvaluation),
          details: build1688EvaluationStepDetails(supplierEvaluation, evaluatorConfig),
          url:
            parsedResult.supplierProbe?.canonicalUrl ??
            parsedResult.supplierProbe?.candidateUrl ??
            resolvedScanUrl,
        });

        if (supplierEvaluation?.status === 'approved') {
          nextStatus = 'completed';
          nextMessage = resolve1688EvaluationMessage(supplierEvaluation);
        } else if (supplierEvaluation?.status === 'rejected') {
          nextStatus = 'no_match';
          nextMessage = resolve1688EvaluationMessage(supplierEvaluation);
        } else if (supplierEvaluation?.status === 'failed') {
          const failureMessage = resolve1688EvaluationMessage(supplierEvaluation);
          return await persistSynchronizedScan(scan, {
            engineRunId,
            status: 'failed',
            matchedImageId: parsedResult.matchedImageId,
            title: parsedResult.title,
            price: parsedResult.price,
            url: resolvedScanUrl,
            description: parsedResult.description,
            supplierDetails: parsedResult.supplierDetails,
            supplierProbe: parsedResult.supplierProbe,
            supplierEvaluation,
            steps: finalizedSteps,
            rawResult: resultValue,
            error: failureMessage,
            asinUpdateStatus: 'not_needed',
            asinUpdateMessage: failureMessage,
            completedAt: run.completedAt ?? new Date().toISOString(),
          });
        } else {
          nextStatus = parsedResult.status === 'no_match' ? 'no_match' : 'completed';
          nextMessage = resolve1688EvaluationMessage(supplierEvaluation);
        }
      }
    } catch (error) {
      const message = normalizeErrorMessage(
        error instanceof Error ? error.message : error,
        '1688 supplier AI evaluation failed.'
      );
      const evaluationError: ProductScanSupplierEvaluation = {
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        titleMatch: null,
        confidence: null,
        proceed: false,
        reasons: [],
        mismatches: [],
        modelId: null,
        error: message,
        evaluatedAt: new Date().toISOString(),
      };
      finalizedSteps = upsertPersistedProductScanStep(finalizedSteps, {
        key: 'supplier_ai_evaluate',
        label: 'Evaluate supplier candidate match',
        group: 'supplier',
        attempt: resolveNext1688EvaluationStepAttempt(finalizedSteps),
        candidateId: parsedResult.matchedImageId,
        candidateRank: resolve1688CandidateRank(parsedResult.supplierProbe),
        status: 'failed',
        resultCode: 'evaluation_failed',
        message,
        details: [{ label: 'Error', value: message }],
        url:
          parsedResult.supplierProbe?.canonicalUrl ??
          parsedResult.supplierProbe?.candidateUrl ??
          resolvedScanUrl,
      });
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvedScanUrl,
        description: parsedResult.description,
        supplierDetails: parsedResult.supplierDetails,
        supplierProbe: parsedResult.supplierProbe,
        supplierEvaluation: evaluationError,
        steps: finalizedSteps,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: nextStatus,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvedScanUrl,
      description: parsedResult.description,
      supplierDetails: parsedResult.supplierDetails,
      supplierProbe: parsedResult.supplierProbe,
      supplierEvaluation,
      steps: finalizedSteps,
      rawResult: resultValue,
      error: null,
      asinUpdateStatus: 'not_needed',
      asinUpdateMessage: nextMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to synchronize 1688 supplier reverse image scan.';
    return await persistFailedSynchronization(
      scan,
      message,
      '1688 supplier reverse image scan failed.'
    );
  }
}


export async function synchronizeProductScans(
  scans: ProductScanRecord[]
): Promise<ProductScanRecord[]> {
  if (scans.length === 0) {
    return scans;
  }

  return await Promise.all(
    scans.map(async (scan) =>
      isProductScanActiveStatus(scan.status) ? await synchronizeProductScan(scan) : scan
    )
  );
}

export async function listProductScansWithSync(input: {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  provider?: ProductScanProvider | null;
  limit?: number | null;
} = {}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listProductScans({
      ids: input.ids,
      productId: input.productId,
      productIds: input.productIds,
      provider: input.provider,
      limit: input.limit,
    })
  );
}

export async function listLatestProductScansByProductIdsWithSync(input: {
  productIds: string[];
}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listLatestProductScansByProductIds({
      productIds: input.productIds,
    })
  );
}

export async function getProductScanByIdWithSync(
  id: string
): Promise<ProductScanRecord | null> {
  const scan = await getProductScanById(id);
  if (!scan) {
    return null;
  }
  return await synchronizeProductScan(scan);
}

const resolveAlreadyRunningBatchResult = async (input: {
  productId: string;
  provider: ProductScanProvider;
  alreadyRunningMessage: string;
  resultStatusLabel: string;
}): Promise<ProductAmazonBatchScanItem | null> => {
  const existingActiveScan = await findLatestActiveProductScan({
    productId: input.productId,
    provider: input.provider,
  });
  if (!existingActiveScan) {
    return null;
  }

  const synchronized = await synchronizeProductScan(existingActiveScan);
  if (!isProductScanActiveStatus(synchronized.status)) {
    return null;
  }

  return {
    productId: input.productId,
    scanId: synchronized.id,
    runId: resolveScanEngineRunId(synchronized),
    status: 'already_running',
    currentStatus: synchronized.status,
    message:
      synchronized.status === 'running'
        ? `${input.resultStatusLabel} running.`
        : input.alreadyRunningMessage,
  };
};

type BatchQueueProviderConfig = {
  provider: ProductScanProvider;
  runtime: ProductScanProviderRuntime;
  actionPrefix: string;
  instanceLabel: string;
  instanceTags: string[];
  resultStatusLabel: string;
  noImageMessage: string;
  alreadyRunningMessage: string;
  queueFailureMessage: string;
  enqueueFailureMessage: string;
  buildRequestInput: (input: {
    product: Awaited<ReturnType<typeof productService.getProductById>>;
    productName: string;
    imageCandidates: ProductScanRecord['imageCandidates'];
    integrationId?: string | null;
    connectionId?: string | null;
    connection?: IntegrationConnectionRecord | null;
    batchIndex: number;
    allowManualVerification: boolean;
    manualVerificationTimeoutMs: number;
    amazonCandidateEvaluatorEnabled: boolean;
    amazonCandidateTriageEnabled: boolean;
    scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  }) => Record<string, unknown>;
};

type Resolved1688QueueContext = {
  integrationId: string | null;
  connection: IntegrationConnectionRecord | null;
  errorMessage: string | null;
};

const resolve1688MissingSessionMessage = (
  connection: Pick<IntegrationConnectionRecord, 'name'> | null
): string =>
  connection?.name?.trim()
    ? `1688 login required for profile ${connection.name}. Refresh the saved browser session before scanning.`
    : '1688 login required. Refresh the saved browser session before scanning.';

const resolve1688QueueContext = async (
  requestedConnectionId?: string | null
): Promise<Resolved1688QueueContext> => {
  const integrationRepository = await getIntegrationRepository();
  const integrations = await integrationRepository.listIntegrations();
  const integration1688 = integrations.find(
    (integration) => integration.slug?.trim().toLowerCase() === '1688'
  );
  if (!integration1688) {
    return {
      integrationId: null,
      connection: null,
      errorMessage: '1688 integration is not configured.',
    };
  }

  const connections = await integrationRepository.listConnections(integration1688.id);
  const normalizedRequestedConnectionId = requestedConnectionId?.trim() || null;
  const defaultConnectionId = (await get1688DefaultConnectionId().catch(() => null))?.trim() || null;
  const fallbackConnection =
    connections.length === 1 ? connections[0] ?? null : null;
  const resolvedConnectionId =
    normalizedRequestedConnectionId || defaultConnectionId || fallbackConnection?.id || null;

  if (!resolvedConnectionId) {
    return {
      integrationId: integration1688.id,
      connection: null,
      errorMessage:
        connections.length === 0
          ? SCANNER_1688_MISSING_PROFILE_MESSAGE
          : 'Choose a 1688 browser profile before scanning.',
    };
  }

  const resolvedConnection =
    connections.find((connection) => connection.id === resolvedConnectionId) ?? null;
  if (!resolvedConnection) {
    return {
      integrationId: integration1688.id,
      connection: null,
      errorMessage:
        normalizedRequestedConnectionId != null
          ? 'The selected 1688 browser profile was not found.'
          : SCANNER_1688_MISSING_PROFILE_MESSAGE,
    };
  }

  if (!resolvedConnection.playwrightStorageState?.trim()) {
    return {
      integrationId: integration1688.id,
      connection: resolvedConnection,
      errorMessage: resolve1688MissingSessionMessage(resolvedConnection),
    };
  }

  return {
    integrationId: integration1688.id,
    connection: resolvedConnection,
    errorMessage: null,
  };
};

const queueStatusMessage = (
  queuedRunStatus: ProductScanRecord['status'],
  resultStatusLabel: string
): string =>
  queuedRunStatus === 'running'
    ? `${resultStatusLabel} running.`
    : `${resultStatusLabel} queued.`;

const queueProviderBatchProductScans = async (input: {
  productIds: string[];
  userId?: string | null;
  connectionId?: string | null;
  config: BatchQueueProviderConfig;
}): Promise<ProductScanBatchResponse> => {
  const productIds = Array.from(
    new Set(
      input.productIds
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  let amazonCandidateEvaluatorEnabled = false;
  let amazonCandidateTriageEnabled = false;
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
    if (input.config.provider === 'amazon') {
      amazonCandidateEvaluatorEnabled = (
        await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings)
      ).enabled;
      amazonCandidateTriageEnabled = (
        await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(scannerSettings)
      ).enabled;
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.config.actionPrefix}.loadScannerSettings`,
    });
  }

  const supplierConnectionContext =
    input.config.provider === '1688'
      ? await resolve1688QueueContext(input.connectionId).catch((error) => {
          void ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: `${input.config.actionPrefix}.resolve1688Connection`,
          });
          return {
            integrationId: null,
            connection: null,
            errorMessage: 'Failed to resolve the 1688 browser profile.',
          } satisfies Resolved1688QueueContext;
        })
      : null;

  const results = await mapWithConcurrencyLimit(
    productIds,
    AMAZON_BATCH_SCAN_START_CONCURRENCY,
    async (productId, batchIndex): Promise<ProductAmazonBatchScanItem> => {
      try {
        const alreadyRunningResult = await resolveAlreadyRunningBatchResult({
          productId,
          provider: input.config.provider,
          alreadyRunningMessage: input.config.alreadyRunningMessage,
          resultStatusLabel: input.config.resultStatusLabel,
        });
        if (alreadyRunningResult) {
          return alreadyRunningResult;
        }

        const product = await productService.getProductById(productId);
        if (!product) {
          return createFailedBatchResult(productId, 'Product not found.');
        }

        const hydratedImageCandidates = await hydrateProductScanImageCandidates({
          product,
          imageCandidates: input.config.runtime.resolveImageCandidates(product),
        });
        const allow1688UrlImageSearchFallback =
          input.config.provider === '1688'
            ? (
                supplierConnectionContext?.connection?.scanner1688AllowUrlImageSearchFallback ??
                scannerSettings.scanner1688?.allowUrlImageSearchFallback
              ) !== false
            : true;
        let imageCandidates = await sanitizeProductScanImageCandidates(
          hydratedImageCandidates,
          {
            materializeUrlCandidates: input.config.provider === '1688',
            requireLocalFile:
              input.config.provider === '1688' && !allow1688UrlImageSearchFallback,
          }
        );
        if (
          input.config.provider === '1688' &&
          imageCandidates.length === 0 &&
          hydratedImageCandidates.length > 0
        ) {
          const base64FallbackCandidates = await hydrateProductScanImageCandidates({
            product,
            imageCandidates: [],
          });
          imageCandidates = await sanitizeProductScanImageCandidates(
            base64FallbackCandidates,
            {
              materializeUrlCandidates: true,
              requireLocalFile: !allow1688UrlImageSearchFallback,
            }
          );
        }
        const productName = input.config.runtime.resolveDisplayName(product);
        const providerPreflightError =
          input.config.provider === '1688'
            ? supplierConnectionContext?.errorMessage ?? null
            : null;
        const baseRecord = input.config.runtime.createBaseRecord({
          productId,
          productName,
          integrationId:
            input.config.provider === '1688'
              ? supplierConnectionContext?.integrationId ?? null
              : null,
          connectionId:
            input.config.provider === '1688'
              ? supplierConnectionContext?.connection?.id ?? input.connectionId ?? null
              : null,
          userId: input.userId,
          imageCandidates,
          status:
            imageCandidates.length > 0 && providerPreflightError == null ? 'queued' : 'failed',
          error:
            imageCandidates.length > 0
              ? providerPreflightError
              : input.config.noImageMessage,
        });

        let savedBaseRecord: ProductScanRecord;
        try {
          savedBaseRecord = await upsertProductScan(baseRecord);
        } catch (error) {
          const recoveredAlreadyRunningResult = await resolveAlreadyRunningBatchResult({
            productId,
            provider: input.config.provider,
            alreadyRunningMessage: input.config.alreadyRunningMessage,
            resultStatusLabel: input.config.resultStatusLabel,
          });
          if (recoveredAlreadyRunningResult) {
            return recoveredAlreadyRunningResult;
          }

          throw error;
        }
        if (imageCandidates.length === 0 || providerPreflightError) {
          return createFailedBatchResult(
            productId,
            savedBaseRecord.error ??
              providerPreflightError ??
              input.config.noImageMessage,
            savedBaseRecord.id
          );
        }

        try {
          const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
            scannerSettings
          );
          const forceVisibleLaunchForManualVerification =
            input.config.provider === 'amazon' &&
            scannerSettings.captchaBehavior === 'auto_show_browser';
          const allowManualVerification =
            input.config.provider === '1688'
              ? shouldAutoShowScannerCaptchaBrowser(scannerSettings)
              : forceVisibleLaunchForManualVerification ||
                (shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless);
          const requestInput = input.config.buildRequestInput({
            product,
            productName,
            imageCandidates,
            integrationId:
              input.config.provider === '1688'
                ? supplierConnectionContext?.integrationId ?? null
                : null,
            connectionId:
              input.config.provider === '1688'
                ? supplierConnectionContext?.connection?.id ?? input.connectionId ?? null
                : null,
            connection:
              input.config.provider === '1688'
                ? supplierConnectionContext?.connection ?? null
                : null,
            batchIndex,
            allowManualVerification,
            manualVerificationTimeoutMs,
            amazonCandidateEvaluatorEnabled,
            amazonCandidateTriageEnabled,
            scannerSettings,
          });
          const timeoutMs = allowManualVerification
            ? Math.max(
                AMAZON_SCAN_TIMEOUT_MS,
                manualVerificationTimeoutMs + 60_000
              )
            : AMAZON_SCAN_TIMEOUT_MS;
          const instance = createCustomPlaywrightInstance({
            family: 'scrape',
            label: input.config.instanceLabel,
            connectionId:
              input.config.provider === '1688'
                ? supplierConnectionContext?.connection?.id ?? input.connectionId ?? null
                : null,
            integrationId:
              input.config.provider === '1688'
                ? supplierConnectionContext?.integrationId ?? null
                : null,
            tags: input.config.instanceTags,
          });
          const run =
            input.config.provider === '1688' && supplierConnectionContext?.connection
              ? (
                  await startPlaywrightConnectionEngineTask({
                    connection: supplierConnectionContext.connection,
                    request: {
                      script: input.config.runtime.script,
                      input: requestInput,
                      timeoutMs,
                      capture: {
                        screenshot: true,
                        html: true,
                      },
                      preventNewPages: !allowManualVerification,
                    },
                    ownerUserId: input.userId?.trim() || null,
                    instance,
                    resolveEngineRequestConfig: (runtime) => ({
                      settings: resolve1688ConnectionEngineSettings(
                        runtime.settings as Record<string, unknown>,
                        { forceVisible: allowManualVerification }
                      ),
                      browserPreference: runtime.browserPreference,
                    }),
                  })
                ).run
              : await startPlaywrightEngineTask({
                  request: {
                    script: input.config.runtime.script,
                    input: requestInput,
                    timeoutMs,
                    browserEngine: 'chromium',
                    ...buildAmazonScannerRequestRuntimeOptions({
                      scannerSettings,
                      scannerEngineRequestOptions:
                        buildProductScannerEngineRequestOptions(scannerSettings),
                      forceHeadless: forceVisibleLaunchForManualVerification ? false : undefined,
                    }),
                    capture: {
                      screenshot: true,
                      html: true,
                    },
                    preventNewPages: true,
                  },
                  ownerUserId: input.userId?.trim() || null,
                  instance,
                });

          const queuedRunStatus = run.status === 'running' ? 'running' : 'queued';
          const startedRunRawResult = createAmazonScanStartedRawResult({
            runId: run.runId,
            status: run.status,
            imageSearchProvider: resolveAmazonImageSearchProvider(
              requestInput,
              scannerSettings
            ),
            allowManualVerification,
            manualVerificationTimeoutMs,
          });

          let saved: ProductScanRecord;
          try {
            saved = await upsertProductScan(
              normalizeProductScanRecord({
                ...savedBaseRecord,
                engineRunId: run.runId,
                status: queuedRunStatus,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'completed',
                  resultCode:
                    queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                  message:
                    queuedRunStatus === 'running'
                      ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                      : `Playwright ${input.config.resultStatusLabel} queued.`,
                  details: [
                    { label: 'Run status', value: queuedRunStatus },
                    { label: 'Run id', value: run.runId },
                    {
                      label: 'Image search provider',
                      value: resolveAmazonImageSearchProvider(requestInput, scannerSettings),
                    },
                  ],
                  url: null,
                }),
                rawResult: startedRunRawResult,
              })
            );
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.persistRunLink`,
              productId,
              scanId: savedBaseRecord.id,
              runId: run.runId,
            });

            try {
              saved = await upsertProductScan(
                normalizeProductScanRecord({
                  ...savedBaseRecord,
                  status: queuedRunStatus,
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'completed',
                    resultCode:
                      queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                    message:
                      queuedRunStatus === 'running'
                        ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                        : `Playwright ${input.config.resultStatusLabel} queued.`,
                    details: [
                      { label: 'Run status', value: queuedRunStatus },
                      { label: 'Run id', value: run.runId },
                    ],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                  },
                })
              );
            } catch (fallbackError) {
              void ErrorSystem.captureException(fallbackError, {
                service: 'product-scans.service',
                action: `${input.config.actionPrefix}.persistRunFallback`,
                productId,
                scanId: savedBaseRecord.id,
                runId: run.runId,
              });

              const recovered = await tryDirectQueuedScanUpdate(
                savedBaseRecord,
                {
                  engineRunId: run.runId,
                  status: queuedRunStatus,
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'completed',
                    resultCode:
                      queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                    message:
                      queuedRunStatus === 'running'
                        ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                        : `Playwright ${input.config.resultStatusLabel} queued.`,
                    details: [
                      { label: 'Run status', value: queuedRunStatus },
                      { label: 'Run id', value: run.runId },
                    ],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                    fallbackError: normalizeErrorMessage(
                      fallbackError instanceof Error ? fallbackError.message : fallbackError,
                      `Failed to persist ${input.config.resultStatusLabel} run link fallback.`
                    ),
                  },
                },
                {
                  action: `${input.config.actionPrefix}.persistRunFallbackUpdate`,
                  productId,
                  runId: run.runId,
                }
              );
              if (recovered) {
                return {
                  productId,
                  scanId: recovered.id,
                  runId: run.runId,
                  status: queuedRunStatus,
                  currentStatus: queuedRunStatus,
                  message: queueStatusMessage(
                    queuedRunStatus,
                    input.config.resultStatusLabel
                  ),
                };
              }

              const failureMessage =
                `${input.config.resultStatusLabel} started, but the scan record could not be updated with its run link.`;
              const failedRecord = await tryDirectQueuedScanUpdate(
                savedBaseRecord,
                {
                  status: 'failed',
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'failed',
                    resultCode: 'run_link_failed',
                    message: failureMessage,
                    details: [{ label: 'Run id', value: run.runId }],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                    fallbackError: normalizeErrorMessage(
                      fallbackError instanceof Error ? fallbackError.message : fallbackError,
                      `Failed to persist ${input.config.resultStatusLabel} run link fallback.`
                    ),
                  },
                  error: failureMessage,
                  asinUpdateStatus: 'failed',
                  asinUpdateMessage: failureMessage,
                  completedAt: new Date().toISOString(),
                },
                {
                  action: `${input.config.actionPrefix}.persistRunFallbackFailed`,
                  productId,
                  runId: run.runId,
                }
              );

              return createFailedBatchResult(
                productId,
                failureMessage,
                failedRecord?.id ?? savedBaseRecord.id
              );
            }
          }

          return {
            productId,
            scanId: saved.id,
            runId: run.runId,
            status: queuedRunStatus,
            currentStatus: queuedRunStatus,
            message: queueStatusMessage(queuedRunStatus, input.config.resultStatusLabel),
          };
        } catch (error) {
          const message = normalizeErrorMessage(
            error instanceof Error ? error.message : error,
            input.config.enqueueFailureMessage
          );
          void ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: `${input.config.actionPrefix}.startRun`,
            productId,
          });
          let failed: ProductScanRecord;
          try {
            failed = await upsertProductScan(
              normalizeProductScanRecord({
                ...savedBaseRecord,
                status: 'failed',
                error: message,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'failed',
                  resultCode: 'run_start_failed',
                  message,
                  url: null,
                }),
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              })
            );
          } catch (persistFailureError) {
            void ErrorSystem.captureException(persistFailureError, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.persistStartRunFailure`,
              productId,
              scanId: savedBaseRecord.id,
            });

            const failedRecord = await tryDirectQueuedScanUpdate(
              savedBaseRecord,
              {
                status: 'failed',
                error: message,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'failed',
                  resultCode: 'run_start_failed',
                  message,
                  url: null,
                }),
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              },
              {
                action: `${input.config.actionPrefix}.persistStartRunFailureUpdate`,
                productId,
              }
            );

            return createFailedBatchResult(
              productId,
              message,
              failedRecord?.id ?? savedBaseRecord.id
            );
          }

          return createFailedBatchResult(productId, message, failed.id);
        }
      } catch (error) {
        const message = normalizeErrorMessage(
          error instanceof Error ? error.message : error,
          input.config.queueFailureMessage
        );
        void ErrorSystem.captureException(error, {
          service: 'product-scans.service',
          action: `${input.config.actionPrefix}.product`,
          productId,
        });
        return createFailedBatchResult(productId, message);
      }
    }
  );

  return {
    queued: results.filter((result) => result.status === 'queued').length,
    running: results.filter((result) => result.status === 'running').length,
    alreadyRunning: results.filter((result) => result.status === 'already_running').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
};

export async function queueAmazonBatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
}): Promise<ProductAmazonBatchScanResponse> {
  return await queueProviderBatchProductScans({
    productIds: input.productIds,
    userId: input.userId,
    config: {
      provider: 'amazon',
      runtime: amazonScanRuntime,
      actionPrefix: 'queueAmazonBatchProductScans',
      instanceLabel: 'Amazon reverse image ASIN scan',
      instanceTags: ['product', 'amazon', 'scan', 'google-reverse-image'],
      resultStatusLabel: 'Amazon reverse image scan',
      noImageMessage: 'No product image available for Amazon reverse image scan.',
      alreadyRunningMessage: 'Amazon scan already in progress for this product.',
      queueFailureMessage: 'Failed to queue Amazon reverse image scan.',
      enqueueFailureMessage: 'Failed to enqueue Amazon reverse image scan.',
      buildRequestInput: ({
        product,
        productName,
        imageCandidates,
        batchIndex,
        allowManualVerification,
        manualVerificationTimeoutMs,
        integrationId: _integrationId,
        connectionId: _connectionId,
        connection: _connection,
        amazonCandidateEvaluatorEnabled,
        amazonCandidateTriageEnabled,
        scannerSettings: _scannerSettings,
      }) =>
        amazonScanRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          existingAsin: product?.asin,
          imageCandidates,
          imageSearchProvider: _scannerSettings.amazonImageSearchProvider,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
          triageOnlyOnAmazonCandidates: amazonCandidateTriageEnabled,
          probeOnlyOnAmazonMatch: amazonCandidateEvaluatorEnabled,
        }),
    },
  });
}

export async function queue1688BatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
  connectionId?: string | null;
}): Promise<ProductScanBatchResponse> {
  return await queueProviderBatchProductScans({
    productIds: input.productIds,
    userId: input.userId,
    connectionId: input.connectionId,
    config: {
      provider: '1688',
      runtime: supplierScanRuntime,
      actionPrefix: 'queue1688BatchProductScans',
      instanceLabel: '1688 supplier reverse image scan',
      instanceTags: ['product', '1688', 'scan', 'supplier-reverse-image'],
      resultStatusLabel: '1688 supplier reverse image scan',
      noImageMessage: SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE,
      alreadyRunningMessage: '1688 supplier scan already in progress for this product.',
      queueFailureMessage: 'Failed to queue 1688 supplier reverse image scan.',
      enqueueFailureMessage: 'Failed to enqueue 1688 supplier reverse image scan.',
      buildRequestInput: ({
        product,
        productName,
        imageCandidates,
        batchIndex,
        allowManualVerification,
        manualVerificationTimeoutMs,
        integrationId,
        connectionId,
        connection,
        scannerSettings,
      }) =>
        supplierScanRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          imageCandidates,
          integrationId,
          connectionId,
          scanner1688StartUrl: connection?.scanner1688StartUrl ?? null,
          scanner1688LoginMode: connection?.scanner1688LoginMode ?? null,
          scanner1688DefaultSearchMode: connection?.scanner1688DefaultSearchMode ?? null,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
          candidateResultLimit:
            connection?.scanner1688CandidateResultLimit ??
            scannerSettings.scanner1688?.candidateResultLimit,
          minimumCandidateScore:
            connection?.scanner1688MinimumCandidateScore ??
            scannerSettings.scanner1688?.minimumCandidateScore,
          maxExtractedImages:
            connection?.scanner1688MaxExtractedImages ??
            scannerSettings.scanner1688?.maxExtractedImages,
          allowUrlImageSearchFallback:
            connection?.scanner1688AllowUrlImageSearchFallback ??
            scannerSettings.scanner1688?.allowUrlImageSearchFallback,
        }),
    },
  });
}
