import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  createCustomPlaywrightInstance,
  resolvePlaywrightEngineRunOutputs,
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
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  evaluateAmazonScanCandidateMatch,
} from './product-scan-amazon-evaluator';
import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  type ProductScanProviderRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScannerHeadless,
} from './product-scanner-settings';

import {
  AMAZON_SCAN_TIMEOUT_MS,
  toRecord,
  readOptionalString,
  normalizeErrorMessage,
  resolveManualVerificationMessage,
  resolvePersistableScanUrl,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  areProductScanStepsEqual,
  resolvePersistedProductScanSteps,
  upsertPersistedProductScanStep,
  parseAmazonScanScriptResult,
  persistSynchronizedScan,
  resolveAsinUpdateStepStatus,
  resolveIsoAgeMs,
} from './product-scans-service.helpers';

import {
  isApprovedAmazonCandidateExtractionRun,
  appendAmazonAiStageSummary,
  buildAmazonEvaluationStageSummary,
  resolveAmazonEvaluationStepStatus,
  resolveAmazonEvaluationStepResultCode,
  resolveAmazonEvaluationMessage,
  buildAmazonEvaluationStepDetails,
  resolveNextAmazonEvaluationStepAttempt,
  resolveLatestAmazonCandidateStepMeta,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchProviderHistory,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonActiveRunStallMessage,
  buildAmazonActiveRunDiagnostics,
  shouldKeepAmazonManualVerificationPending,
  resolveAmazonExtractionEvaluatorConfig,
  resolveAmazonTriageEvaluatorConfig,
  resolveAmazonProbeEvaluatorConfig,
} from './product-scans-service.helpers.amazon';

import {
  synchronizeAmazonCaptchaRequired,
  synchronizeAmazonProbeReady,
  synchronizeAmazonTriageReady,
} from './product-scans-sync-amazon-handlers';

const amazonScanRuntime: ProductScanProviderRuntime = AMAZON_PRODUCT_SCAN_PROVIDER.runtime!;

export async function synchronizeAmazonProductScan(
  scan: ProductScanRecord,
  run: PlaywrightEngineRunRecord,
  engineRunId: string,
  product: any, // Should be ProductWithImages ideally
  requestedStepSequenceInput: any
): Promise<ProductScanRecord> {
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

  if (parsedResult.status === 'captcha_required') {
    return await synchronizeAmazonCaptchaRequired({
      scan,
      run,
      engineRunId,
      resultValue,
      parsedResult,
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
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
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
    const evaluatorConfig = await resolveAmazonExtractionEvaluatorConfig(scannerSettings);
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
          amazonEvaluation?.evidence?.candidateUrl ?? resolvedScanUrl ?? latestCandidateMeta.url,
      });
      extractionEvaluationRawResult = appendAmazonAiStageSummary(
        resultValue,
        buildAmazonEvaluationStageSummary(amazonEvaluation, {
          stage: 'extraction_evaluate',
          candidateRankBefore: latestCandidateMeta.candidateRank,
          provider: resolveAmazonImageSearchProvider(scan.rawResult, scannerSettings),
        })
      );

      if (amazonEvaluation?.status === 'failed') {
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

      if (amazonEvaluation?.status === 'rejected') {
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
                  (await resolveAmazonTriageEvaluatorConfig(scannerSettings)).enabled,
                probeOnlyOnAmazonMatch:
                  (await resolveAmazonProbeEvaluatorConfig(scannerSettings)).enabled,
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
              label: 'Queue follow-up scan',
              group: 'input',
              status: fallbackStatus === 'running' ? 'running' : 'pending',
              message: `Queued fallback scan using provider ${fallbackProvider}.`,
            }),
            rawResult: {
              ...(toRecord(extractionEvaluationRawResult) ?? {}),
              imageSearchProvider: fallbackProvider,
              imageSearchProviderHistory: providerHistory,
              manualVerificationPending: false,
              manualVerificationMessage: null,
            },
            error: null,
            asinUpdateStatus: 'pending',
            asinUpdateMessage: message,
            completedAt: null,
          });
        }

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
          steps: finalizedAmazonSteps,
          rawResult: extractionEvaluationRawResult,
          error: message,
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: message,
          completedAt: run.completedAt ?? new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.evaluateAmazonCandidate',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
  }

  if (parsedResult.status !== 'matched') {
    const failureMessage = normalizeErrorMessage(
      parsedResult.message,
      'Amazon reverse image scan failed to match product.'
    );

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'failed',
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvedScanUrl,
      description: parsedResult.description,
      amazonDetails: parsedResult.amazonDetails,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation,
      steps: finalizedAmazonSteps,
      rawResult: extractionEvaluationRawResult,
      error: failureMessage,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: failureMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  }

  return await persistSynchronizedScan(scan, {
    engineRunId,
    status: 'completed',
    matchedImageId: parsedResult.matchedImageId,
    title: parsedResult.title,
    price: parsedResult.price,
    url: resolvedScanUrl,
    description: parsedResult.description,
    amazonDetails: parsedResult.amazonDetails,
    amazonProbe: persistedAmazonProbe,
    amazonEvaluation,
    steps: finalizedAmazonSteps,
    rawResult: extractionEvaluationRawResult,
    error: null,
    asinUpdateStatus: resolveAsinUpdateStepStatus(parsedResult.asin),
    asinUpdateMessage: parsedResult.message,
    completedAt: run.completedAt ?? new Date().toISOString(),
  });
}
