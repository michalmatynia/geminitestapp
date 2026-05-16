import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { amazonScanDiagnosticArtifact } from './product-scan-amazon-diagnostics';
import type { createAmazonScanDiagnosticEmitter } from './product-scan-amazon-diagnostics';
import {
  normalizeErrorMessage,
  persistSynchronizedScan,
  PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS,
  readOptionalString,
  resolveIsoAgeMs,
  resolvePersistedProductScanSteps,
  resolveScanManualVerificationTimeoutMs,
  toRecord,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import {
  buildAmazonActiveRunDiagnostics,
  resolveAmazonActiveRunStallMessage,
  resolveAmazonScanRuntimeTimeoutMs,
  shouldKeepAmazonManualVerificationPending,
} from './product-scans-service.helpers.amazon';
import { synchronizeAmazonCaptchaRequired } from './product-scans-sync-amazon-captcha';
import type { AmazonScanRuntimeKey } from './product-scans-sync-amazon.runtime';

type AmazonScanDiagnostics = ReturnType<typeof createAmazonScanDiagnosticEmitter>;
type ActiveRunDiagnostics = ReturnType<typeof buildAmazonActiveRunDiagnostics>;

export type SynchronizeAmazonActiveRunInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
  currentAmazonRuntimeKey: AmazonScanRuntimeKey;
  diagnostics: AmazonScanDiagnostics;
};

type ActiveRunState = {
  existingRawResult: Record<string, unknown>;
  manualVerificationTimeoutMs: number;
  activeRunDiagnostics: ActiveRunDiagnostics;
  nextSteps: ProductScanRecord['steps'];
  manualVerificationPending: boolean;
  allowManualVerification: boolean;
  runtimePosture: Record<string, unknown> | null;
  nextRawResult: Record<string, unknown>;
  activeMessage: string | null;
  allowedRuntimeMs: number;
  activeRunAgeMs: number | null;
  activeRunIdleAgeMs: number | null;
  activeRunStallThresholdMs: number;
};

const normalizeAmazonActiveRunStatus = (
  status: PlaywrightEngineRunRecord['status']
): ProductScanRecord['status'] => {
  if (status === 'pending') return 'queued';
  if (status === 'cancelled' || status === 'canceled') return 'failed';
  return status;
};

const resolveLatestActiveStage = (
  activeRunDiagnostics: ActiveRunDiagnostics,
  resultValue: unknown
): string | null =>
  readOptionalString(activeRunDiagnostics['latestStage']) ??
  readOptionalString(toRecord(resultValue)?.['stage']);

const buildNextActiveRawResult = (input: {
  existingRawResult: Record<string, unknown>;
  activeRunDiagnostics: ActiveRunDiagnostics;
  resultValue: unknown;
  engineRunId: string;
  runStatus: ProductScanRecord['status'];
  manualVerificationPending: boolean;
  activeMessage: string | null;
  manualVerificationTimeoutMs: number;
}): Record<string, unknown> => ({
  ...input.existingRawResult,
  ...input.activeRunDiagnostics,
  ...toRecord(input.resultValue),
  runId: input.engineRunId,
  runStatus: input.runStatus,
  manualVerificationPending: input.manualVerificationPending,
  manualVerificationMessage: input.activeMessage,
  manualVerificationTimeoutMs: input.manualVerificationTimeoutMs,
});

const buildActiveRunState = (input: SynchronizeAmazonActiveRunInput): ActiveRunState => {
  const existingRawResult = toRecord(input.scan.rawResult) ?? {};
  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(existingRawResult);
  const activeRunDiagnostics = buildAmazonActiveRunDiagnostics(input.run);
  const latestActiveStage = resolveLatestActiveStage(activeRunDiagnostics, input.resultValue);
  const manualVerificationPending = shouldKeepAmazonManualVerificationPending({
    parsedStatus: input.parsedResult.status,
    existingPending: existingRawResult['manualVerificationPending'] === true,
    latestStage: latestActiveStage,
  });
  const allowManualVerification =
    manualVerificationPending || existingRawResult['allowManualVerification'] === true;
  const activeMessage = manualVerificationPending
    ? normalizeErrorMessage(input.parsedResult.message, '')
    : null;
  const allowedRuntimeMs = resolveAmazonScanRuntimeTimeoutMs({
    allowManualVerification,
    manualVerificationTimeoutMs,
  });
  return {
    existingRawResult,
    manualVerificationTimeoutMs,
    activeRunDiagnostics,
    nextSteps: resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
    manualVerificationPending,
    allowManualVerification,
    runtimePosture: toRecord(activeRunDiagnostics['runtimePosture']),
    nextRawResult: buildNextActiveRawResult({
      existingRawResult,
      activeRunDiagnostics,
      resultValue: input.resultValue,
      engineRunId: input.engineRunId,
      runStatus: normalizeAmazonActiveRunStatus(input.run.status),
      manualVerificationPending,
      activeMessage,
      manualVerificationTimeoutMs,
    }),
    activeMessage,
    allowedRuntimeMs,
    activeRunAgeMs: resolveIsoAgeMs(input.run.startedAt) ?? resolveIsoAgeMs(input.run.createdAt),
    activeRunIdleAgeMs: resolveIsoAgeMs(input.run.updatedAt),
    activeRunStallThresholdMs: allowedRuntimeMs + PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS,
  };
};

const shouldRelaunchCaptchaRun = (
  input: SynchronizeAmazonActiveRunInput,
  state: ActiveRunState
): boolean => {
  const runtimeBrowser = toRecord(state.runtimePosture?.['browser']);
  return (
    input.parsedResult.status === 'captcha_required' &&
    state.allowManualVerification &&
    state.existingRawResult['captchaRetryStarted'] !== true &&
    runtimeBrowser?.['headless'] === true
  );
};

const emitCaptchaDetected = async (
  input: SynchronizeAmazonActiveRunInput,
  state: ActiveRunState
): Promise<void> => {
  if (input.diagnostics.enabled !== true) return;
  await input.diagnostics.emit('captcha.detected', {
    'raw-engine-result': amazonScanDiagnosticArtifact.json(input.resultValue),
    'active-run-diagnostics': amazonScanDiagnosticArtifact.json(state.activeRunDiagnostics),
    'runtime-posture': amazonScanDiagnosticArtifact.json(state.runtimePosture),
  });
};

const resolveStaleActiveReason = (
  state: ActiveRunState
): 'manual_verification_expired' | 'no_progress' | 'runtime_exceeded' | null => {
  if (
    state.manualVerificationPending &&
    state.activeRunAgeMs !== null &&
    state.activeRunAgeMs >= state.allowedRuntimeMs
  ) {
    return 'manual_verification_expired';
  }
  if (
    state.activeRunIdleAgeMs !== null &&
    state.activeRunIdleAgeMs >= state.activeRunStallThresholdMs
  ) {
    return 'no_progress';
  }
  if (state.activeRunAgeMs !== null && state.activeRunAgeMs >= state.activeRunStallThresholdMs) {
    return 'runtime_exceeded';
  }
  return null;
};

const persistStaleActiveRun = async (
  input: SynchronizeAmazonActiveRunInput,
  state: ActiveRunState,
  staleReason: NonNullable<ReturnType<typeof resolveStaleActiveReason>>
): Promise<ProductScanRecord> => {
  const staleMessage = resolveAmazonActiveRunStallMessage({
    reason: staleReason,
    latestStage:
      readOptionalString(state.nextRawResult['latestStage']) ??
      readOptionalString(state.nextRawResult['stage']),
    runtimeKey: input.currentAmazonRuntimeKey,
  });
  return await persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: 'failed',
    steps: state.nextSteps,
    rawResult: {
      ...state.nextRawResult,
      manualVerificationPending: false,
      manualVerificationMessage: null,
      ...(state.manualVerificationPending ? { manualVerificationExpired: true } : {}),
      stalledReason: staleReason,
      stalledAt: new Date().toISOString(),
    },
    error: staleMessage,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: staleMessage,
    completedAt: new Date().toISOString(),
  });
};

const hasActiveRunStateChanged = (
  input: SynchronizeAmazonActiveRunInput,
  state: ActiveRunState
): boolean =>
  input.scan.status !== input.run.status ||
  input.scan.engineRunId !== input.engineRunId ||
  JSON.stringify(state.existingRawResult) !== JSON.stringify(state.nextRawResult) ||
  (state.activeMessage ?? null) !== (input.scan.asinUpdateMessage ?? null);

const hasManualVerificationStateChanged = (state: ActiveRunState): boolean => {
  if (state.manualVerificationPending) {
    return state.existingRawResult['manualVerificationPending'] !== true;
  }

  return (
    state.existingRawResult['manualVerificationPending'] === true ||
    readOptionalString(state.existingRawResult['manualVerificationMessage']) !== null
  );
};

const shouldPersistActiveState = (
  input: SynchronizeAmazonActiveRunInput,
  state: ActiveRunState
): boolean => hasActiveRunStateChanged(input, state) || hasManualVerificationStateChanged(state);

const persistActiveRunState = (
  input: SynchronizeAmazonActiveRunInput,
  state: ActiveRunState
): Promise<ProductScanRecord> =>
  persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: normalizeAmazonActiveRunStatus(input.run.status),
    steps: state.nextSteps,
    rawResult: state.nextRawResult,
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: state.activeMessage,
    completedAt: null,
  });

export const synchronizeAmazonActiveRun = async (
  input: SynchronizeAmazonActiveRunInput
): Promise<ProductScanRecord> => {
  const state = buildActiveRunState(input);
  if (shouldRelaunchCaptchaRun(input, state)) {
    await emitCaptchaDetected(input, state);
    return await synchronizeAmazonCaptchaRequired(input);
  }

  const staleReason = resolveStaleActiveReason(state);
  if (staleReason !== null) {
    return await persistStaleActiveRun(input, state, staleReason);
  }

  return shouldPersistActiveState(input, state)
    ? await persistActiveRunState(input, state)
    : input.scan;
};
