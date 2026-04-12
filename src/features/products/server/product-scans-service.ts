import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  createCustomPlaywrightInstance,
  readPlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import { CachedProductService } from '@/features/products/performance/cached-service';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
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

import { evaluateAmazonScanCandidateMatch } from './product-scan-amazon-evaluator';
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

  return evaluation.languageAccepted === false ? 'Language gate' : 'Product mismatch';
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
      const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
      const activeMessage =
        parsedResult.status === 'captcha_required'
          ? resolveManualVerificationMessage(parsedResult.message)
          : null;
      const nextRawResult =
        parsedResult.status === 'captcha_required'
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
        (activeMessage ?? null) !== (scan.asinUpdateMessage ?? null) ||
        (parsedResult.status === 'captcha_required' &&
          existingRawResult['manualVerificationPending'] !== true) ||
        (parsedResult.status !== 'captcha_required' &&
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
        amazonEvaluation: existingAmazonEvaluation,
        error: failureMessage,
        rawResult: buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true }),
        asinUpdateStatus: 'failed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    if (run.status !== 'completed') {
      return scan;
    }

    if (parsedResult.status === 'captcha_required') {
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
        const scannerEngineRequestOptions =
          buildProductScannerEngineRequestOptions(scannerSettings);
        const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
          scannerSettings,
          scannerEngineRequestOptions,
          forceHeadless: false,
        });
        const runRetry = await startPlaywrightEngineTask({
          request: {
            script: amazonScanRuntime.script,
            input: amazonScanRuntime.buildRequestInput({
              productId: product.id,
              productName: claimedScan.productName,
              existingAsin: product.asin,
              imageCandidates: claimedScan.imageCandidates,
              allowManualVerification: true,
              manualVerificationTimeoutMs,
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
      } catch (error) {
        const message = normalizeErrorMessage(
          error instanceof Error ? error.message : error,
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

    if (parsedResult.status === 'probe_ready') {
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
        if (evaluatorConfig.enabled) {
          amazonEvaluation = await evaluateAmazonScanCandidateMatch({
            scan,
            product,
            parsedResult,
            run,
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
              rawResult: resultValue,
              error: message,
              asinUpdateStatus: 'failed',
              asinUpdateMessage: message,
              completedAt: run.completedAt ?? new Date().toISOString(),
            });
          }

          if (amazonEvaluation.status === 'rejected') {
            const message = resolveAmazonEvaluationMessage(amazonEvaluation);
            const nextCandidate = resolveNextAmazonCandidateUrl({
              candidateUrls: parsedResult.candidateUrls,
              currentUrl: resolvedProbeUrl,
            });

            if (nextCandidate.nextUrl && nextCandidate.nextRank) {
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
                  rawResult: {
                    ...createAmazonScanStartedRawResult({
                      runId: continuationRun.runId,
                      status: continuationRun.status,
                      allowManualVerification:
                        shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                      manualVerificationTimeoutMs,
                      previousRunId: engineRunId,
                      previousResult: resultValue,
                    }),
                    candidateRejectedByAi: true,
                    candidateContinuation: true,
                    approvedCandidateExtraction: false,
                    continuationCandidateUrls: nextCandidate.remainingCandidateUrls,
                  },
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
                  rawResult: resultValue,
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
              rawResult: resultValue,
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
        const extractionRun = await startPlaywrightEngineTask({
          request: {
            script: amazonScanRuntime.script,
            input: amazonScanRuntime.buildRequestInput({
              productId: product.id,
              productName: scan.productName,
              existingAsin: product.asin,
              imageCandidates: scan.imageCandidates,
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
          details: [{ label: 'Candidate URL', value: resolvedProbeUrl }],
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
              allowManualVerification:
                shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
              manualVerificationTimeoutMs,
              previousRunId: engineRunId,
              previousResult: resultValue,
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
    try {
      scannerSettings = await getProductScannerSettings();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronizeProductScan.loadScannerSettingsForAmazonEvaluator',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
    }

      try {
        const evaluatorConfig =
          await resolveProductScannerAmazonCandidateEvaluatorExtractionConfig(scannerSettings);
      if (evaluatorConfig.enabled && !isApprovedAmazonCandidateExtractionRun(scan)) {
        amazonEvaluation = await evaluateAmazonScanCandidateMatch({
          scan,
          product,
          parsedResult,
          run,
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
            rawResult: resultValue,
            error: message,
            asinUpdateStatus: 'failed',
            asinUpdateMessage: message,
            completedAt: run.completedAt ?? new Date().toISOString(),
          });
        }

        if (amazonEvaluation.status === 'rejected') {
          const message = resolveAmazonEvaluationMessage(amazonEvaluation);
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
            rawResult: resultValue,
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
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        descriptionMatch: null,
        pageRepresentsSameProduct: null,
        confidence: null,
        proceed: false,
        threshold: null,
        reasons: [],
        mismatches: [],
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
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvedScanUrl,
      description: parsedResult.description,
      amazonDetails: parsedResult.amazonDetails,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation,
      steps: finalizedSteps,
      rawResult: resultValue,
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
      const activeMessage =
        parsedResult.status === 'captcha_required'
          ? resolveManualVerificationMessage(parsedResult.message)
          : null;
      const nextRawResult =
        parsedResult.status === 'captcha_required'
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
        (activeMessage ?? null) !== (scan.asinUpdateMessage ?? null) ||
        (parsedResult.status === 'captcha_required' &&
          existingRawResult['manualVerificationPending'] !== true) ||
        (parsedResult.status !== 'captcha_required' &&
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
        resolveManualVerificationMessage(parsedResult.message),
        '1688 supplier reverse image scan failed.'
      );
    }

    if (parsedResult.status === 'failed') {
      return await persistFailedSynchronization(
        scan,
        parsedResult.message ?? '1688 supplier reverse image scan failed.',
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
  limit?: number | null;
} = {}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listProductScans({
      ids: input.ids,
      productId: input.productId,
      productIds: input.productIds,
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
    batchIndex: number;
    allowManualVerification: boolean;
    manualVerificationTimeoutMs: number;
    amazonCandidateEvaluatorEnabled: boolean;
    scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  }) => Record<string, unknown>;
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
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
    if (input.config.provider === 'amazon') {
      amazonCandidateEvaluatorEnabled = (
        await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings)
      ).enabled;
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.config.actionPrefix}.loadScannerSettings`,
    });
  }

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

        const imageCandidates = await sanitizeProductScanImageCandidates(
          input.config.runtime.resolveImageCandidates(product)
        );
        const productName = input.config.runtime.resolveDisplayName(product);
        const baseRecord = input.config.runtime.createBaseRecord({
          productId,
          productName,
          userId: input.userId,
          imageCandidates,
          status: imageCandidates.length > 0 ? 'queued' : 'failed',
          error: imageCandidates.length > 0 ? null : input.config.noImageMessage,
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
        if (imageCandidates.length === 0) {
          return createFailedBatchResult(
            productId,
            savedBaseRecord.error ?? input.config.noImageMessage,
            savedBaseRecord.id
          );
        }

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
          const allowManualVerification =
            shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless;
          const run = await startPlaywrightEngineTask({
            request: {
              script: input.config.runtime.script,
              input: input.config.buildRequestInput({
                product,
                productName,
                imageCandidates,
                batchIndex,
                allowManualVerification,
                manualVerificationTimeoutMs,
                amazonCandidateEvaluatorEnabled,
                scannerSettings,
              }),
              timeoutMs: allowManualVerification
                ? Math.max(
                    AMAZON_SCAN_TIMEOUT_MS,
                    manualVerificationTimeoutMs + 60_000
                  )
                : AMAZON_SCAN_TIMEOUT_MS,
              browserEngine: 'chromium',
              ...scannerRuntimeOptions,
              capture: {
                screenshot: true,
                html: true,
              },
              preventNewPages: true,
            },
            ownerUserId: input.userId?.trim() || null,
            instance: createCustomPlaywrightInstance({
              family: 'scrape',
              label: input.config.instanceLabel,
              tags: input.config.instanceTags,
            }),
          });

          const queuedRunStatus = run.status === 'running' ? 'running' : 'queued';
          const startedRunRawResult = createAmazonScanStartedRawResult({
            runId: run.runId,
            status: run.status,
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
        amazonCandidateEvaluatorEnabled,
        scannerSettings: _scannerSettings,
      }) =>
        amazonScanRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          existingAsin: product?.asin,
          imageCandidates,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
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
      noImageMessage: 'No product image available for 1688 supplier reverse image scan.',
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
        scannerSettings,
      }) =>
        supplierScanRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          imageCandidates,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
          candidateResultLimit: scannerSettings.scanner1688?.candidateResultLimit,
          minimumCandidateScore: scannerSettings.scanner1688?.minimumCandidateScore,
          maxExtractedImages: scannerSettings.scanner1688?.maxExtractedImages,
          allowUrlImageSearchFallback:
            scannerSettings.scanner1688?.allowUrlImageSearchFallback,
        }),
    },
  });
}
