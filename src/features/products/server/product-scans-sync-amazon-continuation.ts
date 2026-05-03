import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { resolveAmazonRuntimeActionName } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { AMAZON_PRODUCT_SCAN_PROVIDER, requireProductScanNativeRuntime } from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  createProductScanStartedRawResult,
  persistSynchronizedScan,
  readOptionalString,
  resolvePersistableScanUrl,
  resolvePersistedProductScanSteps,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
  upsertPersistedProductScanStep,
  type AmazonScanRuntimeResult,
  type resolveProductScanRequestSequenceInput,
} from './product-scans-service.helpers';
import {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchProviderHistory,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveNextAmazonCandidateUrl,
  resolveNextQueueStepAttempt,
} from './product-scans-service.helpers.amazon';
import type { AmazonScanRuntimeKey } from './product-scans-sync-amazon.runtime';
import { resolveScanOwnerUserId } from './product-scans-sync-amazon.runtime';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type ScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
type ScannerRuntimeOptions = ReturnType<typeof buildAmazonScannerRequestRuntimeOptions>;
type ContinuationRun = Awaited<ReturnType<typeof startPlaywrightEngineTask>>;
type NextAmazonCandidate = ReturnType<typeof resolveNextAmazonCandidateUrl> & {
  nextUrl: string;
  nextRank: number;
};

export type AmazonCandidateContinuationInput = {
  scan: ProductScanRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
  currentAmazonRuntimeKey: AmazonScanRuntimeKey;
  currentAmazonRuntimeAction: PlaywrightAction | null;
  requestedStepSequenceInput: ReturnType<typeof resolveProductScanRequestSequenceInput>;
  persistedAmazonProbe: ProductScanRecord['amazonProbe'];
  existingAmazonEvaluation: ProductScanRecord['amazonEvaluation'];
  finalUrl: string | null;
  diagnosticsEnabled: boolean;
};

type CandidateContinuationContext = AmazonCandidateContinuationInput & {
  product: ProductWithImages;
  failedStage: string;
  nextCandidate: NextAmazonCandidate;
  scannerSettings: ScannerSettings;
  scannerRuntimeOptions: ScannerRuntimeOptions;
  amazonImageSearchProvider: ReturnType<typeof resolveAmazonImageSearchProvider>;
  amazonImageSearchPageUrl: ReturnType<typeof resolveAmazonImageSearchPageUrl>;
  amazonSelectorProfile: string;
  manualVerificationTimeoutMs: number;
};

type CandidateContinuationTarget = {
  product: ProductWithImages;
  failedStage: string;
  nextCandidate: NextAmazonCandidate;
};

const resolveFailedAmazonStage = (parsedResult: AmazonScanRuntimeResult): string | null => {
  const failedStage = readOptionalString(parsedResult.stage, 120);
  return failedStage?.startsWith('amazon_') === true ? failedStage : null;
};

const resolveNextCandidate = (
  input: AmazonCandidateContinuationInput
): NextAmazonCandidate | null => {
  const currentCandidateUrl = resolvePersistableScanUrl(
    input.parsedResult.url,
    input.parsedResult.currentUrl,
    input.finalUrl
  );
  const nextCandidate = resolveNextAmazonCandidateUrl({
    candidateUrls: input.parsedResult.candidateUrls,
    currentUrl: currentCandidateUrl,
  });
  if (nextCandidate.nextUrl === null || nextCandidate.nextRank === null) return null;
  return nextCandidate as NextAmazonCandidate;
};

const resolveCandidateContinuationTarget = async (
  input: AmazonCandidateContinuationInput
): Promise<CandidateContinuationTarget | null> => {
  const failedStage = resolveFailedAmazonStage(input.parsedResult);
  if (failedStage === null) return null;
  const nextCandidate = resolveNextCandidate(input);
  if (nextCandidate === null) return null;
  const product = await productService.getProductById(input.scan.productId);
  return product === null ? null : { failedStage, nextCandidate, product };
};

const loadScannerSettingsForAmazonStageContinuation = async (
  input: AmazonCandidateContinuationInput
): Promise<ScannerSettings> => {
  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForAmazonStageContinuation',
      scanId: input.scan.id,
      productId: input.scan.productId,
      engineRunId: input.engineRunId,
    });
  }
  return scannerSettings;
};

const createCandidateContinuationContext = async (
  input: AmazonCandidateContinuationInput
): Promise<CandidateContinuationContext | null> => {
  const target = await resolveCandidateContinuationTarget(input);
  if (target === null) return null;
  const scannerSettings = await loadScannerSettingsForAmazonStageContinuation(input);
  const scannerEngineRequestOptions = buildProductScannerEngineRequestOptions(scannerSettings);
  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
  return {
    ...input,
    product: target.product,
    failedStage: target.failedStage,
    nextCandidate: target.nextCandidate,
    scannerSettings,
    scannerRuntimeOptions: buildAmazonScannerRequestRuntimeOptions({
      scannerSettings,
      scannerEngineRequestOptions,
      actionExecutionSettings: input.currentAmazonRuntimeAction?.executionSettings ?? null,
      actionPersonaId: input.currentAmazonRuntimeAction?.personaId ?? null,
      runtimeKey: input.currentAmazonRuntimeKey,
    }),
    amazonImageSearchProvider: resolveAmazonImageSearchProvider(input.scan.rawResult, scannerSettings),
    amazonImageSearchPageUrl: resolveAmazonImageSearchPageUrl(input.scan.rawResult, scannerSettings),
    amazonSelectorProfile:
      readOptionalString(toRecord(input.scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon',
    manualVerificationTimeoutMs,
  };
};

const startAmazonCandidateContinuationRun = async (
  context: CandidateContinuationContext
): Promise<ContinuationRun> => {
  const allowManualVerification = shouldAutoShowScannerCaptchaBrowser(context.scannerSettings);
  return await startPlaywrightEngineTask({
    request: {
      runtimeKey: context.currentAmazonRuntimeKey,
      actionId: context.currentAmazonRuntimeAction?.id ?? null,
      actionName:
        context.currentAmazonRuntimeAction?.name ??
        resolveAmazonRuntimeActionName(context.currentAmazonRuntimeKey),
      selectorProfile: context.amazonSelectorProfile,
      input: amazonScanRuntime.buildRequestInput({
        productId: context.product.id,
        productName: context.scan.productName,
        existingAsin: context.product.asin,
        imageCandidates: context.scan.imageCandidates,
        runtimeKey: context.currentAmazonRuntimeKey,
        imageSearchProvider: context.amazonImageSearchProvider,
        imageSearchPageUrl: context.amazonImageSearchPageUrl,
        selectorProfile: context.amazonSelectorProfile,
        allowManualVerification,
        manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
        probeOnlyOnAmazonMatch: false,
        skipAmazonProbe: false,
        directAmazonCandidateUrl: context.nextCandidate.nextUrl,
        directAmazonCandidateUrls: context.nextCandidate.remainingCandidateUrls,
        directMatchedImageId: context.parsedResult.matchedImageId,
        directAmazonCandidateRank: context.nextCandidate.nextRank,
        ...context.requestedStepSequenceInput,
      }),
      timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
        allowManualVerification,
        manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
      }),
      browserEngine: 'chromium',
      ...context.scannerRuntimeOptions,
      capture: resolveAmazonScanDiagnosticCapture(context.scan.rawResult),
      preventNewPages: true,
    },
    ownerUserId: resolveScanOwnerUserId(context.scan),
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: 'Amazon failed-candidate continuation scan',
      tags: ['product', 'amazon', 'scan', 'candidate-continuation'],
    }),
  });
};

const resolveContinuationStatus = (run: ContinuationRun): 'queued' | 'running' =>
  run.status === 'running' ? 'running' : 'queued';

const buildContinuationRawResult = (
  context: CandidateContinuationContext,
  continuationRun: ContinuationRun
): unknown => ({
  ...createProductScanStartedRawResult({
    runId: continuationRun.runId,
    status: continuationRun.status,
    runtimeKey: context.currentAmazonRuntimeKey,
    actionId: context.currentAmazonRuntimeAction?.id ?? null,
    selectorProfile: context.amazonSelectorProfile,
    imageSearchProvider: context.amazonImageSearchProvider,
    imageSearchPageUrl: context.amazonImageSearchPageUrl,
    imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
      context.scan.rawResult,
      context.amazonImageSearchProvider
    ),
    allowManualVerification: shouldAutoShowScannerCaptchaBrowser(context.scannerSettings),
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
    previousRunId: context.engineRunId,
    previousResult: context.resultValue,
    recordDiagnostics: context.diagnosticsEnabled,
    ...context.requestedStepSequenceInput,
  }),
  candidateContinuation: true,
  continuationCandidateUrls: context.nextCandidate.remainingCandidateUrls,
  continuationReason: 'candidate_page_failure',
  failedCandidateStage: context.failedStage,
});

const buildContinuationQueueStep = (
  context: CandidateContinuationContext,
  status: 'queued' | 'running',
  nextSteps: ProductScanRecord['steps']
): ProductScanRecord['steps'][number] => ({
  key: 'queue_scan',
  label: 'Continue with next Amazon candidate',
  group: 'input',
  attempt: resolveNextQueueStepAttempt(nextSteps),
  status: 'completed',
  resultCode: status === 'running' ? 'run_started' : 'run_queued',
  message:
    status === 'running'
      ? 'Started the next Amazon candidate after candidate-page failure.'
      : 'Queued the next Amazon candidate after candidate-page failure.',
  details: [
    { label: 'Failure stage', value: context.failedStage },
    { label: 'Rejected candidate URL', value: resolvePersistableScanUrl(context.parsedResult.url, context.parsedResult.currentUrl, context.finalUrl) },
    { label: 'Next candidate URL', value: context.nextCandidate.nextUrl },
  ],
  url: context.nextCandidate.nextUrl,
});

const persistAmazonCandidateContinuationRun = async (
  context: CandidateContinuationContext,
  continuationRun: ContinuationRun
): Promise<ProductScanRecord> => {
  const status = resolveContinuationStatus(continuationRun);
  const nextSteps = resolvePersistedProductScanSteps(context.scan, context.parsedResult.steps);
  return await persistSynchronizedScan(context.scan, {
    engineRunId: continuationRun.runId,
    status,
    asin: null,
    matchedImageId: context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: context.nextCandidate.nextUrl,
    description: null,
    amazonDetails: null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: context.existingAmazonEvaluation,
    steps: upsertPersistedProductScanStep(nextSteps, buildContinuationQueueStep(context, status, nextSteps)),
    rawResult: buildContinuationRawResult(context, continuationRun),
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};

export const retryAmazonScanWithNextCandidateAfterAmazonStageFailure = async (
  input: AmazonCandidateContinuationInput
): Promise<ProductScanRecord | null> => {
  const context = await createCandidateContinuationContext(input);
  if (context === null) return null;
  return await persistAmazonCandidateContinuationRun(
    context,
    await startAmazonCandidateContinuationRun(context)
  );
};
