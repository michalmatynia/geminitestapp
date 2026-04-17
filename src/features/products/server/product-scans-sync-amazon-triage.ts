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
  triageAmazonScanCandidates,
  type AmazonCandidateTriageEvaluationResult,
} from './product-scan-amazon-evaluator';
import {
  resolveAmazonRuntimeActionName,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  requireProductScanNativeRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
  resolveProductScannerHeadless,
} from './product-scanner-settings';

import {
  AMAZON_SCAN_TIMEOUT_MS,
  createProductScanStartedRawResult,
  normalizeErrorMessage,
  persistSynchronizedScan,
  resolvePersistedProductScanSteps,
  resolveProductScanRequestSequenceInput,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  readOptionalString,
  toRecord,
  upsertPersistedProductScanStep,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';

import {
  appendAmazonAiStageSummary,
  buildAmazonCandidateTriageStageSummary,
  buildAmazonCandidateTriageStepDetails,
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonCandidateTriageMessage,
  resolveAmazonCandidateTriageStepResultCode,
  resolveAmazonCandidateTriageStepStatus,
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchProviderHistory,
  resolveNextAmazonCandidateTriageStepAttempt,
  resolveNextQueueStepAttempt,
  resolveAmazonProductScanRuntimeKey,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonTriageEvaluatorConfig,
  resolveAmazonRuntimeActionDefinition,
} from './product-scans-service.helpers.amazon';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
};

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
  const amazonRuntimeAction = await resolveAmazonRuntimeActionDefinition(
    resolveAmazonProductScanRuntimeKey(toRecord(scan.rawResult)?.['runtimeKey'])
  );
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
      const amazonSelectorProfile =
        readOptionalString(toRecord(scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon';
      const scannerEngineRequestOptions =
        buildProductScannerEngineRequestOptions(scannerSettings);
      const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
        scannerSettings,
        scannerEngineRequestOptions,
        actionExecutionSettings: amazonRuntimeAction?.executionSettings ?? null,
        actionPersonaId: amazonRuntimeAction?.personaId ?? null,
      });
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
      const providerHistory = resolveAmazonImageSearchProviderHistory(
        scan.rawResult,
        currentProvider
      );
      const fallbackRun = await startPlaywrightEngineTask({
        request: {
          runtimeKey: amazonScanRuntime.runtimeKey,
          actionId: amazonRuntimeAction?.id ?? null,
          actionName:
            amazonRuntimeAction?.name ??
            resolveAmazonRuntimeActionName(amazonScanRuntime.runtimeKey),
          selectorProfile: amazonSelectorProfile,
          input: amazonScanRuntime.buildRequestInput({
            productId: product.id,
            productName: scan.productName,
            existingAsin: product.asin,
            imageCandidates: scan.imageCandidates,
            imageSearchProvider: fallbackProvider,
            selectorProfile: amazonSelectorProfile,
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
          ...createProductScanStartedRawResult({
            runId: fallbackRun.runId,
            status: fallbackRun.status,
            runtimeKey: amazonScanRuntime.runtimeKey,
            actionId: amazonRuntimeAction?.id ?? null,
            selectorProfile: amazonSelectorProfile,
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
      const amazonSelectorProfile =
        readOptionalString(toRecord(scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon';
      const scannerEngineRequestOptions =
        buildProductScannerEngineRequestOptions(scannerSettings);
      const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
        scannerSettings,
        scannerEngineRequestOptions,
        actionExecutionSettings: amazonRuntimeAction?.executionSettings ?? null,
        actionPersonaId: amazonRuntimeAction?.personaId ?? null,
      });
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
      const providerHistory = resolveAmazonImageSearchProviderHistory(
        scan.rawResult,
        currentProvider
      );
      const continuationRun = await startPlaywrightEngineTask({
        request: {
          runtimeKey: amazonScanRuntime.runtimeKey,
          actionId: amazonRuntimeAction?.id ?? null,
          actionName:
            amazonRuntimeAction?.name ??
            resolveAmazonRuntimeActionName(amazonScanRuntime.runtimeKey),
          selectorProfile: amazonSelectorProfile,
          input: amazonScanRuntime.buildRequestInput({
            productId: product.id,
            productName: scan.productName,
            existingAsin: product.asin,
            imageCandidates: scan.imageCandidates,
            imageSearchProvider: currentProvider,
            selectorProfile: amazonSelectorProfile,
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
          ...createProductScanStartedRawResult({
            runId: continuationRun.runId,
            status: continuationRun.status,
            runtimeKey: amazonScanRuntime.runtimeKey,
            actionId: amazonRuntimeAction?.id ?? null,
            selectorProfile: amazonSelectorProfile,
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
