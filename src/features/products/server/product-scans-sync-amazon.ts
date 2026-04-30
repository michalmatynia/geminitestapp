import 'server-only';

import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  resolveAmazonRuntimeActionName,
  resolveAmazonRuntimeOperationLabel,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  createCustomPlaywrightInstance,
  readPlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
  startPlaywrightEngineTask,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import { CachedProductService } from '@/features/products/performance/cached-service';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  type ProductScanAmazonEvaluation,
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  evaluateProductScanCandidateMatch,
} from './product-scan-ai-evaluator';
import {
  resolveDetectedAmazonAsinOutcome,
} from './product-scan-amazon.helpers';
import {
  synchronizeAmazonActiveRun,
} from './product-scans-sync-amazon-active';
import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  requireProductScanNativeRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';

import {
  PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS,
  toRecord,
  readOptionalString,
  normalizeErrorMessage,
  resolvePersistableScanUrl,
  resolveScanEngineRunId,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  resolvePersistedProductScanSteps,
  upsertPersistedProductScanStep,
  parseAmazonScanRuntimeResult,
  persistSynchronizedScan,
  persistFailedSynchronization,
  resolveAsinUpdateStepStatus,
  resolveIsoAgeMs,
  resolveProductScanRequestSequenceInput,
  createProductScanStartedRawResult,
} from './product-scans-service.helpers';

import {
  appendAmazonAiStageSummary,
  buildAmazonEvaluationStageSummary,
  buildAmazonEvaluationStepDetails,
  resolveAmazonEvaluationStepStatus,
  resolveAmazonEvaluationStepResultCode,
  resolveAmazonEvaluationMessage,
  resolveLatestAmazonCandidateStepMeta,
  resolveNextAmazonCandidateUrl,
  resolveNextAmazonEvaluationStepAttempt,
  resolveNextQueueStepAttempt,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchProviderHistory,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveAmazonExtractionEvaluatorConfig,
  resolveAmazonTriageEvaluatorConfig,
  resolveAmazonProbeEvaluatorConfig,
  shouldWriteAmazonEnglishContent,
  isApprovedAmazonCandidateExtractionRun,
  resolveAmazonRuntimeActionDefinition,
} from './product-scans-service.helpers.amazon';

import {
  amazonScanDiagnosticArtifact,
  collectAmazonScanRunDiagnosticArtifacts,
  createAmazonScanDiagnosticEmitter,
  resolveAmazonScanDiagnosticCapture,
} from './product-scan-amazon-diagnostics';
import {
  resolveAmazonScanRuntimeAction,
  resolveAmazonScanRuntimeKey,
  resolveScanOwnerUserId,
} from './product-scans-sync-amazon.runtime';
import {
  synchronizeAmazonPreMatchedRun,
} from './product-scans-sync-amazon-settled';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

const resolveAsinUpdateResultCode = (
  status: ProductScanRecord['asinUpdateStatus']
): string => {
  switch (status) {
    case 'updated':
      return 'asin_updated';
    case 'unchanged':
      return 'asin_unchanged';
    case 'conflict':
      return 'asin_conflict';
    case 'not_needed':
      return 'asin_not_needed';
    default:
      return 'asin_update_failed';
  }
};

export async function synchronizeAmazonProductScan(
  scan: ProductScanRecord
): Promise<ProductScanRecord> {
  const engineRunId = resolveScanEngineRunId(scan);

  if (engineRunId === null) {
    const ageMs =
      resolveIsoAgeMs(scan.updatedAt) ??
      resolveIsoAgeMs(scan.createdAt) ??
      resolveIsoAgeMs(scan.completedAt);
    if (ageMs !== null && ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS) {
      return await persistFailedSynchronization(
        scan,
        'Amazon scan is missing its Playwright engine run id.'
      );
    }

    return scan;
  }

  try {
    let run: PlaywrightEngineRunRecord | null;
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
    const parsedResult = parseAmazonScanRuntimeResult(resultValue);
    const diagnostics = createAmazonScanDiagnosticEmitter(scan);
    if (diagnostics.enabled) {
      const runArtifacts = await collectAmazonScanRunDiagnosticArtifacts(run);
      await diagnostics.emit('sync.enter', {
        'run-metadata': amazonScanDiagnosticArtifact.json({
          engineRunId,
          status: run.status,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          finalUrl,
        }),
        'parsed-result': amazonScanDiagnosticArtifact.json(parsedResult),
        'raw-engine-result': amazonScanDiagnosticArtifact.json(resultValue),
        'scan-snapshot': amazonScanDiagnosticArtifact.json({
          id: scan.id,
          productId: scan.productId,
          status: scan.status,
          provider: scan.provider,
          rawResult: scan.rawResult,
        }),
        ...runArtifacts,
      });
    }
    const currentAmazonRuntimeKey = resolveAmazonScanRuntimeKey(scan);
    const currentAmazonRuntimeAction = await resolveAmazonScanRuntimeAction(scan);
    const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(scan.rawResult);
    const existingAmazonEvaluation = scan.amazonEvaluation ?? null;
    const approvedCandidateProbe =
      isApprovedAmazonCandidateExtractionRun(scan) ? scan.amazonProbe ?? null : null;
    const persistedAmazonProbe = parsedResult.amazonProbe ?? approvedCandidateProbe;

    if (run.status === 'queued' || run.status === 'running') {
      return await synchronizeAmazonActiveRun({
        scan,
        run,
        engineRunId,
        resultValue,
        parsedResult,
        currentAmazonRuntimeKey,
        diagnostics,
      });
    }

    if (run.status === 'failed') {
      const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
      const failureMessage = normalizeErrorMessage(
        failureMessages[0],
        `${resolveAmazonRuntimeOperationLabel(currentAmazonRuntimeKey)} failed.`
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

    const preMatchedResult = await synchronizeAmazonPreMatchedRun({
      scan,
      run,
      engineRunId,
      resultValue,
      parsedResult,
      finalUrl,
      diagnostics,
      currentAmazonRuntimeKey,
      currentAmazonRuntimeAction,
      requestedStepSequenceInput,
      persistedAmazonProbe,
      existingAmazonEvaluation,
    });
    if (preMatchedResult !== null) {
      return preMatchedResult;
    }

    if (diagnostics.enabled) {
      await diagnostics.emit('matched', {
        'raw-engine-result': amazonScanDiagnosticArtifact.json(resultValue),
        'parsed-result': amazonScanDiagnosticArtifact.json(parsedResult),
        'persisted-probe': amazonScanDiagnosticArtifact.json(persistedAmazonProbe),
        'existing-evaluation': amazonScanDiagnosticArtifact.json(existingAmazonEvaluation),
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

    let extractionEvaluationRawResult: unknown = resultValue;
    try {
      const evaluatorConfig = await resolveAmazonExtractionEvaluatorConfig(scannerSettings);
      if (evaluatorConfig.enabled && !isApprovedAmazonCandidateExtractionRun(scan)) {
      amazonEvaluation = await evaluateProductScanCandidateMatch({
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
          details: buildAmazonEvaluationStepDetails(
            amazonEvaluation,
            evaluatorConfig,
            'extraction'
          ),
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
          const amazonImageSearchPageUrl = resolveAmazonImageSearchPageUrl(
            scan.rawResult,
            scannerSettings
          );
          const fallbackProvider =
            amazonEvaluation.recommendedAction === 'fallback_provider'
              ? resolveAmazonImageSearchFallbackProvider({
                  rawResult: scan.rawResult,
                  scannerSettings,
                  currentProvider: amazonImageSearchProvider,
                  imageCandidates: scan.imageCandidates,
                })
              : null;
          if (fallbackProvider !== null) {
            const scannerEngineRequestOptions =
              buildProductScannerEngineRequestOptions(scannerSettings);
            const manualVerificationTimeoutMs =
              resolveScanManualVerificationTimeoutMs(scannerSettings);
            const amazonSelectorProfile =
              readOptionalString(toRecord(scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon';
            const providerHistory = resolveAmazonImageSearchProviderHistory(
              scan.rawResult,
              amazonImageSearchProvider
            );
            const fallbackRuntimeKey =
              currentAmazonRuntimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY
                ? AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
                : currentAmazonRuntimeKey;
            const fallbackRuntimeAction = await resolveAmazonRuntimeActionDefinition(
              fallbackRuntimeKey
            );
            const fallbackScannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
              scannerSettings,
              scannerEngineRequestOptions,
              actionExecutionSettings: fallbackRuntimeAction?.executionSettings ?? null,
              actionPersonaId: fallbackRuntimeAction?.personaId ?? null,
              runtimeKey: fallbackRuntimeKey,
            });
            const fallbackRun = await startPlaywrightEngineTask({
              request: {
                runtimeKey: fallbackRuntimeKey,
                actionId: fallbackRuntimeAction?.id ?? null,
                actionName:
                  fallbackRuntimeAction?.name ??
                  resolveAmazonRuntimeActionName(fallbackRuntimeKey),
                selectorProfile: amazonSelectorProfile,
                input: amazonScanRuntime.buildRequestInput({
                  productId: product.id,
                  productName: scan.productName,
                  existingAsin: product.asin,
                  imageCandidates: scan.imageCandidates,
                  runtimeKey: fallbackRuntimeKey,
                  imageSearchProvider: fallbackProvider,
                  imageSearchPageUrl: amazonImageSearchPageUrl,
                  selectorProfile: amazonSelectorProfile,
                  allowManualVerification:
                    shouldAutoShowScannerCaptchaBrowser(scannerSettings),
                  manualVerificationTimeoutMs,
                  triageOnlyOnAmazonCandidates:
                    (await resolveAmazonTriageEvaluatorConfig(scannerSettings)).enabled,
                  probeOnlyOnAmazonMatch:
                    (await resolveAmazonProbeEvaluatorConfig(scannerSettings)).enabled,
                  ...requestedStepSequenceInput,
                }),
                timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
                  allowManualVerification: shouldAutoShowScannerCaptchaBrowser(scannerSettings),
                  manualVerificationTimeoutMs,
                }),
                browserEngine: 'chromium',
                ...fallbackScannerRuntimeOptions,
                capture: resolveAmazonScanDiagnosticCapture(scan.rawResult),
                preventNewPages: true,
              },
              ownerUserId: resolveScanOwnerUserId(scan),
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
                  ...createProductScanStartedRawResult({
                    runId: fallbackRun.runId,
                    status: fallbackRun.status,
                    runtimeKey: fallbackRuntimeKey,
                    actionId: fallbackRuntimeAction?.id ?? null,
                    selectorProfile: amazonSelectorProfile,
                    imageSearchProvider: fallbackProvider,
                    imageSearchPageUrl: amazonImageSearchPageUrl,
                    imageSearchProviderHistory: [...providerHistory, fallbackProvider],
                    allowManualVerification:
                      shouldAutoShowScannerCaptchaBrowser(scannerSettings),
                    manualVerificationTimeoutMs,
                    previousRunId: engineRunId,
                    previousResult: extractionEvaluationRawResult,
                    recordDiagnostics: diagnostics.enabled,
                    ...requestedStepSequenceInput,
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
            nextCandidate.nextUrl !== null &&
            nextCandidate.nextRank !== null
          ) {
            const scannerEngineRequestOptions =
              buildProductScannerEngineRequestOptions(scannerSettings);
            const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
              scannerSettings,
              scannerEngineRequestOptions,
              actionExecutionSettings: currentAmazonRuntimeAction?.executionSettings ?? null,
              actionPersonaId: currentAmazonRuntimeAction?.personaId ?? null,
              runtimeKey: currentAmazonRuntimeKey,
            });
            const manualVerificationTimeoutMs =
              resolveScanManualVerificationTimeoutMs(scannerSettings);
            const amazonSelectorProfile =
              readOptionalString(toRecord(scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon';
            const continuationRun = await startPlaywrightEngineTask({
              request: {
                runtimeKey: currentAmazonRuntimeKey,
                actionId: currentAmazonRuntimeAction?.id ?? null,
                actionName:
                  currentAmazonRuntimeAction?.name ??
                  resolveAmazonRuntimeActionName(currentAmazonRuntimeKey),
                selectorProfile: amazonSelectorProfile,
                input: amazonScanRuntime.buildRequestInput({
                  productId: product.id,
                  productName: scan.productName,
                  existingAsin: product.asin,
                  imageCandidates: scan.imageCandidates,
                  runtimeKey: currentAmazonRuntimeKey,
                  imageSearchProvider: amazonImageSearchProvider,
                  imageSearchPageUrl: amazonImageSearchPageUrl,
                  selectorProfile: amazonSelectorProfile,
                  allowManualVerification:
                    shouldAutoShowScannerCaptchaBrowser(scannerSettings),
                  manualVerificationTimeoutMs,
                  probeOnlyOnAmazonMatch: true,
                  skipAmazonProbe: false,
                  directAmazonCandidateUrl: nextCandidate.nextUrl,
                  directAmazonCandidateUrls: nextCandidate.remainingCandidateUrls,
                  directMatchedImageId: parsedResult.matchedImageId,
                  directAmazonCandidateRank: nextCandidate.nextRank,
                  ...requestedStepSequenceInput,
                }),
                timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
                  allowManualVerification: shouldAutoShowScannerCaptchaBrowser(scannerSettings),
                  manualVerificationTimeoutMs,
                }),
                browserEngine: 'chromium',
                ...scannerRuntimeOptions,
                capture: resolveAmazonScanDiagnosticCapture(scan.rawResult),
                preventNewPages: true,
              },
              ownerUserId: resolveScanOwnerUserId(scan),
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
                  ...createProductScanStartedRawResult({
                    runId: continuationRun.runId,
                    status: continuationRun.status,
                    runtimeKey: currentAmazonRuntimeKey,
                    actionId: currentAmazonRuntimeAction?.id ?? null,
                    selectorProfile: amazonSelectorProfile,
                    imageSearchProvider: amazonImageSearchProvider,
                    imageSearchPageUrl: amazonImageSearchPageUrl,
                    imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
                      scan.rawResult,
                      amazonImageSearchProvider
                    ),
                    allowManualVerification:
                      shouldAutoShowScannerCaptchaBrowser(scannerSettings),
                    manualVerificationTimeoutMs,
                    previousRunId: engineRunId,
                    previousResult: extractionEvaluationRawResult,
                    recordDiagnostics: diagnostics.enabled,
                    ...requestedStepSequenceInput,
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
            message:
              'Skipped product ASIN update because the AI evaluator rejected the Amazon candidate.',
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
          productImageSource:
            scan.imageCandidates[0]?.url ?? scan.imageCandidates[0]?.filepath ?? null,
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
    const scanUpdatedBy = readOptionalString(scan.updatedBy);
    if (
      asinOutcome.asinUpdateStatus === 'updated' &&
      asinOutcome.normalizedDetectedAsin !== null
    ) {
      try {
        await productService.updateProduct(
          product.id,
          { asin: asinOutcome.normalizedDetectedAsin },
          scanUpdatedBy !== null ? { userId: scanUpdatedBy } : undefined
        );
        CachedProductService.invalidateProduct(product.id);
      } catch (error) {
        updateFailureMessage = normalizeErrorMessage(
          error instanceof Error ? error.message : error,
          'Failed to update product ASIN.'
        );
      }
    }

    const nextStatus = updateFailureMessage !== null ? 'failed' : asinOutcome.scanStatus;
    const nextAsinUpdateStatus =
      updateFailureMessage !== null ? 'failed' : asinOutcome.asinUpdateStatus;
    const nextMessage = updateFailureMessage ?? asinOutcome.message;
    const writeEnglishFields = shouldWriteAmazonEnglishContent(amazonEvaluation);
    const finalizedSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
      key: 'product_asin_update',
      label: 'Update product ASIN',
      group: 'product',
      status: resolveAsinUpdateStepStatus(nextAsinUpdateStatus),
      resultCode: resolveAsinUpdateResultCode(nextAsinUpdateStatus),
      message: nextMessage,
      details: [
        { label: 'Detected ASIN', value: asinOutcome.normalizedDetectedAsin },
        { label: 'Existing ASIN', value: product.asin ?? null },
      ],
      url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
    });

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
      error instanceof Error
        ? error.message
        : `Failed to synchronize ${resolveAmazonRuntimeOperationLabel(resolveAmazonScanRuntimeKey(scan))}.`;
    return await persistFailedSynchronization(scan, message);
  }
}
