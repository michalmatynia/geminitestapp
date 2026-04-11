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
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { evaluateAmazonScanCandidateMatch } from './product-scan-amazon-evaluator';
import { AMAZON_REVERSE_IMAGE_SCAN_SCRIPT } from './product-scan-amazon-script';
import {
  resolveDetectedAmazonAsinOutcome,
  resolveProductScanDisplayName,
  resolveProductScanImageCandidates,
} from './product-scan-amazon.helpers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScannerAmazonCandidateEvaluatorConfig,
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
  parseAmazonScanScriptResult,
  buildAmazonScanRequestInput,
  createAmazonScanStartedRawResult,
  createAmazonProductScanBaseRecord,
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
    return 'candidate_rejected';
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
        results[index] = await mapper(values[index], index);
      }
    })
  );

  return results;
}

export async function synchronizeProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  if (isProductScanTerminalStatus(scan.status)) {
    return scan;
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
        const scannerEngineRequestOptions =
          buildProductScannerEngineRequestOptions(scannerSettings);
        const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
          scannerSettings,
          scannerEngineRequestOptions,
          forceHeadless: false,
        });
        const runRetry = await startPlaywrightEngineTask({
          request: {
            script: AMAZON_REVERSE_IMAGE_SCAN_SCRIPT,
            input: buildAmazonScanRequestInput({
              productId: product.id,
              productName: claimedScan.productName,
              existingAsin: product.asin,
              imageCandidates: claimedScan.imageCandidates,
              allowManualVerification: true,
              manualVerificationTimeoutMs,
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
        amazonProbe: parsedResult.amazonProbe,
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
        amazonProbe: parsedResult.amazonProbe,
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
        amazonProbe: parsedResult.amazonProbe,
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
    let amazonEvaluation: ProductScanAmazonEvaluation = null;

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
        await resolveProductScannerAmazonCandidateEvaluatorConfig(scannerSettings);
      if (evaluatorConfig.enabled) {
        amazonEvaluation = await evaluateAmazonScanCandidateMatch({
          scan,
          product,
          parsedResult,
          run,
          evaluatorConfig,
        });

        finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
          key: 'amazon_ai_evaluate',
          label: 'Evaluate Amazon candidate match',
          group: 'amazon',
          status: resolveAmazonEvaluationStepStatus(amazonEvaluation),
          resultCode: resolveAmazonEvaluationStepResultCode(amazonEvaluation),
          message: resolveAmazonEvaluationMessage(amazonEvaluation),
          details: [
            { label: 'Model', value: amazonEvaluation.modelId },
            {
              label: 'Confidence',
              value: formatAmazonEvaluationConfidence(amazonEvaluation.confidence),
            },
            {
              label: 'Same product',
              value:
                typeof amazonEvaluation.sameProduct === 'boolean'
                  ? String(amazonEvaluation.sameProduct)
                  : null,
            },
            {
              label: 'Image match',
              value:
                typeof amazonEvaluation.imageMatch === 'boolean'
                  ? String(amazonEvaluation.imageMatch)
                  : null,
            },
            {
              label: 'Description match',
              value:
                typeof amazonEvaluation.descriptionMatch === 'boolean'
                  ? String(amazonEvaluation.descriptionMatch)
                  : null,
            },
            {
              label: 'Reason',
              value: amazonEvaluation.reasons[0] ?? amazonEvaluation.mismatches[0] ?? null,
            },
          ],
          url: amazonEvaluation.evidence?.candidateUrl ?? resolvedScanUrl,
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
            amazonProbe: parsedResult.amazonProbe,
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
            amazonProbe: parsedResult.amazonProbe,
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
          screenshotArtifactName: null,
          htmlArtifactName: null,
          productImageSource: scan.imageCandidates[0]?.url ?? scan.imageCandidates[0]?.filepath ?? null,
        },
        error: message,
        evaluatedAt: new Date().toISOString(),
      };
      finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        status: 'failed',
        resultCode: 'evaluation_failed',
        message,
        details: [{ label: 'Error', value: message }],
        url: resolvedScanUrl,
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
        amazonProbe: parsedResult.amazonProbe,
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
      amazonProbe: parsedResult.amazonProbe,
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

const resolveAlreadyRunningBatchResult = async (
  productId: string
): Promise<ProductAmazonBatchScanItem | null> => {
  const existingActiveScan = await findLatestActiveProductScan({
    productId,
    provider: 'amazon',
  });
  if (!existingActiveScan) {
    return null;
  }

  const synchronized = await synchronizeProductScan(existingActiveScan);
  if (!isProductScanActiveStatus(synchronized.status)) {
    return null;
  }

  return {
    productId,
    scanId: synchronized.id,
    runId: resolveScanEngineRunId(synchronized),
    status: 'already_running',
    currentStatus: synchronized.status,
    message: 'Amazon scan already in progress for this product.',
  };
};

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

export async function queueAmazonBatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
}): Promise<ProductAmazonBatchScanResponse> {
  const productIds = Array.from(
    new Set(
      input.productIds
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'queueAmazonBatchProductScans.loadScannerSettings',
    });
  }

  const results = await mapWithConcurrencyLimit(
    productIds,
    AMAZON_BATCH_SCAN_START_CONCURRENCY,
    async (productId, batchIndex): Promise<ProductAmazonBatchScanItem> => {
      try {
        const alreadyRunningResult = await resolveAlreadyRunningBatchResult(productId);
        if (alreadyRunningResult) {
          return alreadyRunningResult;
        }

        const product = await productService.getProductById(productId);
        if (!product) {
          return createFailedBatchResult(productId, 'Product not found.');
        }

        const imageCandidates = await sanitizeProductScanImageCandidates(
          resolveProductScanImageCandidates(product)
        );
        const productName = resolveProductScanDisplayName(product);
        const baseRecord = createAmazonProductScanBaseRecord({
          productId,
          productName,
          userId: input.userId,
          imageCandidates,
          status: imageCandidates.length > 0 ? 'queued' : 'failed',
          error:
            imageCandidates.length > 0
              ? null
              : 'No product image available for Amazon reverse image scan.',
        });

        let savedBaseRecord: ProductScanRecord;
        try {
          savedBaseRecord = await upsertProductScan(baseRecord);
        } catch (error) {
          const recoveredAlreadyRunningResult =
            await resolveAlreadyRunningBatchResult(productId);
          if (recoveredAlreadyRunningResult) {
            return recoveredAlreadyRunningResult;
          }

          throw error;
        }
        if (imageCandidates.length === 0) {
          return createFailedBatchResult(
            productId,
            savedBaseRecord.error ?? 'No product image available for Amazon reverse image scan.',
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
              script: AMAZON_REVERSE_IMAGE_SCAN_SCRIPT,
              input: buildAmazonScanRequestInput({
                productId: product.id,
                productName,
                existingAsin: product.asin,
                imageCandidates,
                batchIndex,
                allowManualVerification,
                manualVerificationTimeoutMs,
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
              label: 'Amazon reverse image ASIN scan',
              tags: ['product', 'amazon', 'scan', 'google-reverse-image'],
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
                      ? 'Playwright Amazon scan started immediately.'
                      : 'Playwright Amazon scan queued.',
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
              action: 'queueAmazonBatchProductScans.persistRunLink',
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
                        ? 'Playwright Amazon scan started immediately.'
                        : 'Playwright Amazon scan queued.',
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
                      'Failed to persist Amazon scan run link.'
                    ),
                  },
                })
              );
          } catch (fallbackError) {
            void ErrorSystem.captureException(fallbackError, {
              service: 'product-scans.service',
              action: 'queueAmazonBatchProductScans.persistRunFallback',
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
                      ? 'Playwright Amazon scan started immediately.'
                      : 'Playwright Amazon scan queued.',
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
                    'Failed to persist Amazon scan run link.'
                  ),
                  fallbackError: normalizeErrorMessage(
                    fallbackError instanceof Error ? fallbackError.message : fallbackError,
                    'Failed to persist Amazon scan run link fallback.'
                  ),
                },
              },
              {
                action: 'queueAmazonBatchProductScans.persistRunFallbackUpdate',
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
                message:
                  queuedRunStatus === 'running'
                    ? 'Amazon reverse image scan running.'
                    : 'Amazon reverse image scan queued.',
              };
            }

            const failureMessage =
              'Amazon scan started, but the scan record could not be updated with its run link.';
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
                    'Failed to persist Amazon scan run link.'
                  ),
                  fallbackError: normalizeErrorMessage(
                    fallbackError instanceof Error ? fallbackError.message : fallbackError,
                    'Failed to persist Amazon scan run link fallback.'
                  ),
                },
                error: failureMessage,
                asinUpdateStatus: 'failed',
                asinUpdateMessage: failureMessage,
                completedAt: new Date().toISOString(),
              },
              {
                action: 'queueAmazonBatchProductScans.persistRunFallbackFailed',
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
            message:
              queuedRunStatus === 'running'
                ? 'Amazon reverse image scan running.'
                : 'Amazon reverse image scan queued.',
          };
        } catch (error) {
          const message = normalizeErrorMessage(
            error instanceof Error ? error.message : error,
            'Failed to enqueue Amazon reverse image scan.'
          );
          void ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: 'queueAmazonBatchProductScans.startRun',
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
              action: 'queueAmazonBatchProductScans.persistStartRunFailure',
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
                action: 'queueAmazonBatchProductScans.persistStartRunFailureUpdate',
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
          'Failed to queue Amazon reverse image scan.'
        );
        void ErrorSystem.captureException(error, {
          service: 'product-scans.service',
          action: 'queueAmazonBatchProductScans.product',
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
}
