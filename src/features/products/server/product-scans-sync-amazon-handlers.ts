import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  type ProductScanAmazonEvaluation,
  type ProductScanAmazonProbe,
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  evaluateAmazonScanCandidateMatch,
  triageAmazonScanCandidates,
  type AmazonCandidateTriageEvaluationResult,
} from './product-scan-amazon-evaluator';
import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScannerHeadless,
} from './product-scanner-settings';

import {
  AMAZON_SCAN_TIMEOUT_MS,
  createAmazonScanStartedRawResult,
  normalizeErrorMessage,
  persistFailedSynchronization,
  persistSynchronizedScan,
  resolveManualVerificationMessage,
  resolvePersistableScanUrl,
  resolvePersistedProductScanSteps,
  resolveProductScanRequestSequenceInput,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';

import {
  appendAmazonAiStageSummary,
  buildAmazonCandidateTriageStageSummary,
  buildAmazonCandidateTriageStepDetails,
  buildAmazonEvaluationStageSummary,
  buildAmazonEvaluationStepDetails,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonCandidateTriageMessage,
  resolveAmazonCandidateTriageStepResultCode,
  resolveAmazonCandidateTriageStepStatus,
  resolveAmazonEvaluationMessage,
  resolveAmazonEvaluationStepResultCode,
  resolveAmazonEvaluationStepStatus,
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchProviderHistory,
  resolveLatestAmazonCandidateStepMeta,
  resolveNextAmazonCandidateTriageStepAttempt,
  resolveNextAmazonCandidateUrl,
  resolveNextAmazonEvaluationStepAttempt,
  resolveNextQueueStepAttempt,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';

const amazonScanRuntime = AMAZON_PRODUCT_SCAN_PROVIDER.runtime!;

type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: any;
};

export async function synchronizeAmazonCaptchaRequired({
  scan,
  engineRunId,
  resultValue,
  parsedResult,
}: SynchronizeAmazonStatusInput): Promise<ProductScanRecord> {
  const manualVerificationMessage = resolveManualVerificationMessage(parsedResult.message);
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
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForCaptchaRetry',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
  }

  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
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
      ...(toRecord(resultValue) ?? {}),
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
  const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(claimedScan.rawResult);

  try {
    const amazonCandidateEvaluatorEnabled = (
      await resolveAmazonProbeEvaluatorConfig(scannerSettings)
    ).enabled;
    const amazonCandidateTriageEnabled = (
      await resolveAmazonTriageEvaluatorConfig(scannerSettings)
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
          ...requestedStepSequenceInput,
        }),
        timeoutMs: Math.max(AMAZON_SCAN_TIMEOUT_MS, manualVerificationTimeoutMs + 60_000),
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
          ...requestedStepSequenceInput,
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
      asinUpdateMessage: retryManualVerificationPending ? manualVerificationMessage : null,
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

export async function synchronizeAmazonTriageReady({
  scan,
  run,
  engineRunId,
  resultValue,
  parsedResult,
  persistedAmazonProbe,
  existingAmazonEvaluation,
}: SynchronizeAmazonStatusInput & {
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
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
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
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
  const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(scan.rawResult);
  const probeEvaluatorConfig = await resolveAmazonProbeEvaluatorConfig(scannerSettings);
  const triageBaselineCandidates =
    parsedResult.candidateResults.length > 0
      ? parsedResult.candidateResults
      : parsedResult.candidateUrls.map((url: string, index: number) => ({
          url,
          score: null,
          asin: null,
          marketplaceDomain: null,
          title: null,
          snippet: null,
          rank: index + 1,
        }));

  try {
    const triageEvaluatorConfig = await resolveAmazonTriageEvaluatorConfig(scannerSettings);
    const triageEvaluation: AmazonCandidateTriageEvaluationResult = triageEvaluatorConfig.enabled
      ? await triageAmazonScanCandidates({
          scan,
          product,
          parsedResult,
          evaluatorConfig: triageEvaluatorConfig,
          provider: currentProvider,
        })
      : {
          status: 'skipped',
          stage: 'candidate_triage',
          confidence: 1,
          threshold: null,
          recommendedAction: 'accept',
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
            recommendedAction: 'accept',
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
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
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
            ...requestedStepSequenceInput,
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
            ...requestedStepSequenceInput,
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
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
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
            ...requestedStepSequenceInput,
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

      const continuationStatus = continuationRun.status === 'running' ? 'running' : 'queued';
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
            ...requestedStepSequenceInput,
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

export async function synchronizeAmazonProbeReady({
  scan,
  run,
  engineRunId,
  resultValue,
  parsedResult,
  persistedAmazonProbe,
  existingAmazonEvaluation,
  finalUrl,
}: SynchronizeAmazonStatusInput & {
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
  finalUrl: string | null;
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
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
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
  const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(scan.rawResult);

  let amazonEvaluation = existingAmazonEvaluation;
  try {
    const evaluatorConfig = await resolveAmazonProbeEvaluatorConfig(scannerSettings);
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
            const manualVerificationTimeoutMs =
              resolveScanManualVerificationTimeoutMs(scannerSettings);
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
                    (await resolveAmazonTriageEvaluatorConfig(scannerSettings)).enabled,
                  probeOnlyOnAmazonMatch: true,
                  ...requestedStepSequenceInput,
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
                    previousResult: probeEvaluationRawResult,
                    ...requestedStepSequenceInput,
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
          let continuationRunId = engineRunId;
          try {
            const scannerEngineRequestOptions =
              buildProductScannerEngineRequestOptions(scannerSettings);
            const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
              scannerSettings,
              scannerEngineRequestOptions,
            });
            const manualVerificationTimeoutMs =
              resolveScanManualVerificationTimeoutMs(scannerSettings);
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
                  ...requestedStepSequenceInput,
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

            continuationRunId = continuationRun.runId;
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
              engineRunId: continuationRunId,
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
                      shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless,
                    manualVerificationTimeoutMs,
                    previousRunId: engineRunId,
                    previousResult: probeEvaluationRawResult,
                    ...requestedStepSequenceInput,
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
              engineRunId: continuationRunId,
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
          message:
            'Skipped product ASIN update because the AI evaluator rejected the Amazon candidate.',
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
    const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
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
          ...requestedStepSequenceInput,
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
          ...requestedStepSequenceInput,
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
