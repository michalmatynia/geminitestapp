import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';
import { resolveAmazonRuntimeActionName } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { AMAZON_PRODUCT_SCAN_PROVIDER, requireProductScanNativeRuntime } from './product-scan-providers';
import type {
  buildProductScannerEngineRequestOptions,
} from './product-scanner-settings';
import type { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  resolveAmazonImageSearchProviderHistory,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';
import type {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveAmazonProductScanRuntimeKey,
  resolveAmazonRuntimeActionDefinition,
} from './product-scans-service.helpers.amazon';
import {
  createProductScanStartedRawResult,
  persistSynchronizedScan,
  resolveProductScanRequestSequenceInput,
  toRecord,
  upsertPersistedProductScanStep,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import { buildAmazonCaptchaStealthRetryStep } from './product-scans-sync-amazon-captcha.steps';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type CaptchaRetryRun = Awaited<ReturnType<typeof startPlaywrightEngineTask>>;
type CaptchaRetryStatus = 'queued' | 'running';
type ScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
type AmazonRuntimeAction = Awaited<ReturnType<typeof resolveAmazonRuntimeActionDefinition>>;
type ScannerEngineRequestOptions = ReturnType<typeof buildProductScannerEngineRequestOptions>;
type AmazonScannerRuntimeOptions = ReturnType<typeof buildAmazonScannerRequestRuntimeOptions>;
type AmazonDiagnosticCapture = ReturnType<typeof resolveAmazonScanDiagnosticCapture>;

export type AmazonCaptchaRetryContext = {
  scan: ProductScanRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
  existingRawResult: Record<string, unknown>;
  product: ProductWithImages;
  scannerSettings: ScannerSettings;
  manualVerificationTimeoutMs: number;
  amazonRuntimeKey: ReturnType<typeof resolveAmazonProductScanRuntimeKey>;
  amazonRuntimeAction: AmazonRuntimeAction;
  scannerEngineRequestOptions: ScannerEngineRequestOptions;
  baseScannerRuntimeOptions: AmazonScannerRuntimeOptions;
  amazonImageSearchProvider: ReturnType<typeof resolveAmazonImageSearchProvider>;
  amazonImageSearchPageUrl: ReturnType<typeof resolveAmazonImageSearchPageUrl>;
  amazonSelectorProfile: string;
  diagnosticCapture: AmazonDiagnosticCapture;
};

export const resolveRetryRunStatus = (runRetry: CaptchaRetryRun): CaptchaRetryStatus =>
  runRetry.status === 'running' ? 'running' : 'queued';

const resolveScanOwnerUserId = (scan: ProductScanRecord): string | null => {
  const trimmed = scan.updatedBy?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const resolveAmazonCaptchaEvaluatorFlags = async (
  scannerSettings: ScannerSettings
): Promise<{
  probeEnabled: boolean;
  triageEnabled: boolean;
}> => {
  const [probeConfig, triageConfig] = await Promise.all([
    resolveAmazonProbeEvaluatorConfig(scannerSettings),
    resolveAmazonTriageEvaluatorConfig(scannerSettings),
  ]);
  return {
    probeEnabled: probeConfig.enabled,
    triageEnabled: triageConfig.enabled,
  };
};

const buildAmazonCaptchaRetryInput = (input: {
  context: AmazonCaptchaRetryContext;
  claimedScan: ProductScanRecord;
  allowManualVerification: boolean;
  probeEnabled: boolean;
  triageEnabled: boolean;
  requestedStepSequenceInput: ReturnType<typeof resolveProductScanRequestSequenceInput>;
}): ReturnType<typeof amazonScanRuntime.buildRequestInput> => {
  const { context, claimedScan } = input;
  return amazonScanRuntime.buildRequestInput({
    productId: context.product.id,
    productName: claimedScan.productName,
    existingAsin: context.product.asin,
    imageCandidates: claimedScan.imageCandidates,
    imageSearchProvider: context.amazonImageSearchProvider,
    imageSearchPageUrl: context.amazonImageSearchPageUrl,
    selectorProfile: context.amazonSelectorProfile,
    allowManualVerification: input.allowManualVerification,
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
    triageOnlyOnAmazonCandidates: input.triageEnabled,
    probeOnlyOnAmazonMatch: input.probeEnabled,
    ...input.requestedStepSequenceInput,
  });
};

export const startAmazonCaptchaRetryTask = async (input: {
  context: AmazonCaptchaRetryContext;
  claimedScan: ProductScanRecord;
  allowManualVerification: boolean;
  runtimeOptions: AmazonScannerRuntimeOptions;
  label: string;
  tags: string[];
}): Promise<CaptchaRetryRun> => {
  const { context, claimedScan } = input;
  const flags = await resolveAmazonCaptchaEvaluatorFlags(context.scannerSettings);
  const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(claimedScan.rawResult);

  return await startPlaywrightEngineTask({
    request: {
      runtimeKey: amazonScanRuntime.runtimeKey,
      actionId: context.amazonRuntimeAction?.id ?? null,
      actionName:
        context.amazonRuntimeAction?.name ??
        resolveAmazonRuntimeActionName(amazonScanRuntime.runtimeKey),
      selectorProfile: context.amazonSelectorProfile,
      input: buildAmazonCaptchaRetryInput({
        context,
        claimedScan,
        allowManualVerification: input.allowManualVerification,
        probeEnabled: flags.probeEnabled,
        triageEnabled: flags.triageEnabled,
        requestedStepSequenceInput,
      }),
      timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
        allowManualVerification: input.allowManualVerification,
        manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
      }),
      browserEngine: 'chromium',
      ...input.runtimeOptions,
      capture: context.diagnosticCapture,
      preventNewPages: true,
    },
    ownerUserId: resolveScanOwnerUserId(claimedScan),
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: input.label,
      tags: input.tags,
    }),
  });
};

export const buildAmazonCaptchaStartedRawResult = (input: {
  context: AmazonCaptchaRetryContext;
  claimedScan: ProductScanRecord;
  runRetry: CaptchaRetryRun;
  allowManualVerification: boolean;
  manualVerificationPending: boolean;
  manualVerificationMessage: string | null;
}): Record<string, unknown> => {
  const { context, claimedScan, runRetry } = input;
  return createProductScanStartedRawResult({
    runId: runRetry.runId,
    status: runRetry.status,
    runtimeKey: amazonScanRuntime.runtimeKey,
    actionId: context.amazonRuntimeAction?.id ?? null,
    selectorProfile: context.amazonSelectorProfile,
    imageSearchProvider: context.amazonImageSearchProvider,
    imageSearchPageUrl: context.amazonImageSearchPageUrl,
    imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
      claimedScan.rawResult,
      context.amazonImageSearchProvider
    ),
    allowManualVerification: input.allowManualVerification,
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
    previousRunId: context.engineRunId,
    previousResult: context.resultValue,
    manualVerificationPending: input.manualVerificationPending,
    manualVerificationMessage: input.manualVerificationMessage,
    recordDiagnostics: context.diagnosticCapture.trace === true,
    ...resolveProductScanRequestSequenceInput(claimedScan.rawResult),
  });
};

export const claimAmazonCaptchaRetryScan = (
  context: AmazonCaptchaRetryContext,
  nextSteps: ProductScanRecord['steps'],
  rawResult: Record<string, unknown>
): Promise<ProductScanRecord> =>
  persistSynchronizedScan(context.scan, {
    engineRunId: null,
    status: 'running',
    steps: nextSteps,
    rawResult,
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });

export const attemptAmazonCaptchaStealthRetry = async (
  context: AmazonCaptchaRetryContext,
  nextSteps: ProductScanRecord['steps']
): Promise<ProductScanRecord | null> => {
  const claimedScan = await claimAmazonCaptchaRetryScan(context, nextSteps, {
    ...context.existingRawResult,
    ...(toRecord(context.resultValue) ?? {}),
    previousRunId: context.engineRunId,
    captchaStealthRetryStarted: true,
    captchaStealthRetryMode: 'rotate',
    manualVerificationPending: false,
    manualVerificationMessage: null,
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
  });

  try {
    return await persistAmazonCaptchaStealthRetry(context, claimedScan);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.startCaptchaStealthRetry',
      scanId: claimedScan.id,
      productId: claimedScan.productId,
      engineRunId: context.engineRunId,
    });
    return null;
  }
};

const persistAmazonCaptchaStealthRetry = async (
  context: AmazonCaptchaRetryContext,
  claimedScan: ProductScanRecord
): Promise<ProductScanRecord> => {
  const stealthSettingsOverrides = {
    ...(toRecord(context.baseScannerRuntimeOptions.settingsOverrides) ?? {}),
    headless: true,
    proxySessionAffinity: true,
    proxySessionMode: 'rotate',
  };
  const runRetry = await startAmazonCaptchaRetryTask({
    context,
    claimedScan,
    allowManualVerification: false,
    runtimeOptions: {
      ...context.baseScannerRuntimeOptions,
      settingsOverrides: stealthSettingsOverrides,
    },
    label: 'Amazon captcha stealth retry',
    tags: ['product', 'amazon', 'scan', 'google-lens-candidate-search', 'captcha-stealth-retry'],
  });
  const retryRunStatus = resolveRetryRunStatus(runRetry);
  const retryStep = buildAmazonCaptchaStealthRetryStep({
    scan: claimedScan,
    previousRunId: context.engineRunId,
    retryRunId: runRetry.runId,
    retryRunStatus,
    parsedResult: context.parsedResult,
  });

  return await persistSynchronizedScan(claimedScan, {
    engineRunId: runRetry.runId,
    status: retryRunStatus,
    steps: upsertPersistedProductScanStep(claimedScan.steps, retryStep),
    rawResult: {
      ...toRecord(claimedScan.rawResult),
      ...buildAmazonCaptchaStartedRawResult({
        context,
        claimedScan,
        runRetry,
        allowManualVerification: false,
        manualVerificationPending: false,
        manualVerificationMessage: null,
      }),
      captchaStealthRetryStarted: true,
      captchaStealthRetryMode: 'rotate',
      captchaStealthRetryRunId: runRetry.runId,
      manualVerificationPending: false,
      manualVerificationMessage: null,
    },
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: null,
    completedAt: null,
  });
};
