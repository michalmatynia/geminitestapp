import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { buildAmazonScannerRequestRuntimeOptions } from './product-scans-service.helpers.amazon';
import {
  normalizeErrorMessage,
  persistSynchronizedScan,
  toRecord,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import { buildAmazonCaptchaManualRetryStep } from './product-scans-sync-amazon-captcha.steps';
import {
  buildAmazonCaptchaStartedRawResult,
  claimAmazonCaptchaRetryScan,
  resolveRetryRunStatus,
  startAmazonCaptchaRetryTask,
  type AmazonCaptchaRetryContext,
} from './product-scans-sync-amazon-captcha.retry';

const persistAmazonCaptchaManualRetryFailure = (
  claimedScan: ProductScanRecord,
  error: unknown
): Promise<ProductScanRecord> => {
  const message = normalizeErrorMessage(
    error,
    'Failed to reopen the Amazon scan in a visible browser for captcha verification.'
  );
  return persistSynchronizedScan(claimedScan, {
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
};

const buildManualRetryRuntimeOptions = (
  context: AmazonCaptchaRetryContext
): ReturnType<typeof buildAmazonScannerRequestRuntimeOptions> =>
  buildAmazonScannerRequestRuntimeOptions({
    scannerSettings: context.scannerSettings,
    scannerEngineRequestOptions: context.scannerEngineRequestOptions,
    actionExecutionSettings: context.amazonRuntimeAction?.executionSettings ?? null,
    actionPersonaId: context.amazonRuntimeAction?.personaId ?? null,
    runtimeKey: context.amazonRuntimeKey,
    forceHeadless: false,
  });

const persistAmazonCaptchaManualRetry = async (
  context: AmazonCaptchaRetryContext,
  claimedScan: ProductScanRecord,
  manualVerificationMessage: string
): Promise<ProductScanRecord> => {
  const runRetry = await startAmazonCaptchaRetryTask({
    context,
    claimedScan,
    allowManualVerification: true,
    runtimeOptions: buildManualRetryRuntimeOptions(context),
    label: 'Amazon candidate search manual verification',
    tags: ['product', 'amazon', 'scan', 'google-lens-candidate-search', 'manual-verification'],
  });
  const retryRunStatus = resolveRetryRunStatus(runRetry);
  const retryManualVerificationPending = retryRunStatus === 'running';
  const manualRetryStep = buildAmazonCaptchaManualRetryStep({
    scan: claimedScan,
    previousRunId: context.engineRunId,
    retryRunId: runRetry.runId,
    retryRunStatus,
    parsedResult: context.parsedResult,
    recoveryPath:
      context.existingRawResult['captchaStealthRetryStarted'] === true
        ? 'After automatic retry'
        : 'After captcha block',
  });

  return persistSynchronizedScan(claimedScan, {
    engineRunId: runRetry.runId,
    status: retryRunStatus,
    steps: upsertPersistedProductScanStep(claimedScan.steps, manualRetryStep),
    rawResult: {
      ...toRecord(claimedScan.rawResult),
      ...buildAmazonCaptchaStartedRawResult({
        context,
        claimedScan,
        runRetry,
        allowManualVerification: true,
        manualVerificationPending: retryManualVerificationPending,
        manualVerificationMessage: retryManualVerificationPending ? manualVerificationMessage : null,
      }),
      captchaRetryStarted: true,
      captchaManualRetryStarted: true,
      manualVerificationPending: retryManualVerificationPending,
      manualVerificationMessage: retryManualVerificationPending ? manualVerificationMessage : null,
    },
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: retryManualVerificationPending ? manualVerificationMessage : null,
    completedAt: null,
  });
};

export const startAmazonCaptchaManualRetry = async (
  context: AmazonCaptchaRetryContext,
  nextSteps: ProductScanRecord['steps'],
  manualVerificationMessage: string
): Promise<ProductScanRecord> => {
  const claimedScan = await claimAmazonCaptchaRetryScan(context, nextSteps, {
    ...context.existingRawResult,
    ...(toRecord(context.resultValue) ?? {}),
    previousRunId: context.engineRunId,
    captchaRetryStarted: true,
    manualVerificationPending: true,
    manualVerificationMessage,
    manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
  });

  try {
    return await persistAmazonCaptchaManualRetry(context, claimedScan, manualVerificationMessage);
  } catch (error: unknown) {
    return await persistAmazonCaptchaManualRetryFailure(claimedScan, error);
  }
};
