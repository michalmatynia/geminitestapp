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
  type AmazonScanScriptResult,
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
  parsedResult: AmazonScanScriptResult;
};

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
