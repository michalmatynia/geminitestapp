import 'server-only';

import type { ProductScanRecord, ProductScanStep } from '@/shared/contracts/product-scans';

import {
  areProductScanStepsEqual,
  persistSynchronizedScan,
  readOptionalString,
  resolvePersistedProductScanSteps,
  resolveScanManualVerificationTimeoutMs,
  toRecord,
} from './product-scans-service.helpers';
import { resolve1688ManualVerificationMessage } from './product-scans-sync-1688-settings';
import type { ProductScan1688SyncContext } from './product-scans-sync-1688.types';

type Active1688RawResultArgs = {
  existingRawResult: Record<string, unknown>;
  resultValue: Record<string, unknown>;
  engineRunId: string;
  runStatus: ProductScanRecord['status'];
  manualVerificationPending: boolean;
  manualVerificationMessage: string | null;
  manualVerificationTimeoutMs: number | null;
};

type Active1688PersistenceArgs = {
  scan: ProductScanRecord;
  engineRunId: string;
  runStatus: ProductScanRecord['status'];
  nextSteps: ProductScanStep[];
  existingRawResult: Record<string, unknown>;
  nextRawResult: Record<string, unknown>;
  activeMessage: string | null;
  manualVerificationPending: boolean;
};

const normalizeActive1688RunStatus = (
  status: ProductScan1688SyncContext['run']['status']
): ProductScanRecord['status'] => {
  if (status === 'pending') return 'queued';
  if (status === 'cancelled' || status === 'canceled') return 'failed';
  return status;
};

const resolveManualVerificationPending = (
  context: ProductScan1688SyncContext,
  existingRawResult: Record<string, unknown>
): boolean => {
  if (context.parsedResult.status === 'captcha_required') return true;
  return (
    existingRawResult['manualVerificationPending'] === true &&
    context.parsedResult.status === 'running'
  );
};

const resolveActiveManualVerificationMessage = (
  context: ProductScan1688SyncContext,
  existingRawResult: Record<string, unknown>,
  manualVerificationPending: boolean
): string | null => {
  if (manualVerificationPending === false) return null;
  return resolve1688ManualVerificationMessage(
    context.parsedResult.message,
    existingRawResult['manualVerificationMessage'] ?? context.scan.asinUpdateMessage
  );
};

const buildActive1688RawResult = (args: Active1688RawResultArgs): Record<string, unknown> => ({
  ...args.existingRawResult,
  ...args.resultValue,
  runId: args.engineRunId,
  runStatus: args.runStatus,
  manualVerificationPending: args.manualVerificationPending,
  manualVerificationMessage: args.manualVerificationMessage,
  manualVerificationTimeoutMs: args.manualVerificationTimeoutMs,
});

const hasActiveScanStateChanged = (args: Active1688PersistenceArgs): boolean => {
  if (args.scan.status !== args.runStatus) return true;
  if (args.scan.engineRunId !== args.engineRunId) return true;
  if (!areProductScanStepsEqual(args.scan.steps, args.nextSteps)) return true;
  if (JSON.stringify(args.existingRawResult) !== JSON.stringify(args.nextRawResult)) return true;
  return (args.activeMessage ?? null) !== (args.scan.asinUpdateMessage ?? null);
};

const hasManualVerificationStateChanged = (args: Active1688PersistenceArgs): boolean => {
  const existingPending = args.existingRawResult['manualVerificationPending'] === true;
  const existingMessage = readOptionalString(args.existingRawResult['manualVerificationMessage']);
  if (args.manualVerificationPending) return existingPending === false;
  return existingPending || existingMessage !== null;
};

const shouldPersistActive1688State = (args: Active1688PersistenceArgs): boolean =>
  hasActiveScanStateChanged(args) || hasManualVerificationStateChanged(args);

export const syncActive1688ProductScan = async (
  context: ProductScan1688SyncContext
): Promise<ProductScanRecord> => {
  const existingRawResult = toRecord(context.scan.rawResult) ?? {};
  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(existingRawResult);
  const runStatus = normalizeActive1688RunStatus(context.run.status);
  const nextSteps = resolvePersistedProductScanSteps(
    context.scan,
    context.productScanStepSource
  );
  const manualVerificationPending = resolveManualVerificationPending(context, existingRawResult);
  const activeMessage = resolveActiveManualVerificationMessage(
    context,
    existingRawResult,
    manualVerificationPending
  );
  const nextRawResult = buildActive1688RawResult({
    existingRawResult,
    resultValue: context.resultValue,
    engineRunId: context.engineRunId,
    runStatus,
    manualVerificationPending,
    manualVerificationMessage: activeMessage,
    manualVerificationTimeoutMs,
  });
  const persistenceArgs = {
    scan: context.scan,
    engineRunId: context.engineRunId,
    runStatus,
    nextSteps,
    existingRawResult,
    nextRawResult,
    activeMessage,
    manualVerificationPending,
  };

  if (shouldPersistActive1688State(persistenceArgs) === false) return context.scan;

  return await persistSynchronizedScan(context.scan, {
    engineRunId: context.engineRunId,
    status: runStatus,
    steps: nextSteps,
    rawResult: nextRawResult,
    error: null,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: activeMessage,
    completedAt: null,
  });
};
