import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  readPlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
} from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  normalizeErrorMessage,
  parse1688ScanRuntimeResult,
  persistFailedSynchronization,
  persistSynchronizedScan,
  resolveIsoAgeMs,
  resolvePersistedProductScanSteps,
} from './product-scans-service.helpers';
import { syncActive1688ProductScan } from './product-scans-sync-1688-active';
import { syncCompleted1688ProductScan } from './product-scans-sync-1688-completed';
import { readRetained1688ActionRunProductSteps } from './product-scans-sync-1688-steps';
import type { ProductScan1688SyncContext } from './product-scans-sync-1688.types';
import { PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS } from './product-scans-service.helpers';

type PlaywrightEngineRun = Awaited<ReturnType<typeof readPlaywrightEngineRun>>;

export const syncMissing1688EngineRun = async (
  scan: ProductScanRecord
): Promise<ProductScanRecord> => {
  const ageMs =
    resolveIsoAgeMs(scan.updatedAt) ??
    resolveIsoAgeMs(scan.createdAt) ??
    resolveIsoAgeMs(scan.completedAt);
  if (ageMs !== null && ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS) {
    return await persistFailedSynchronization(
      scan,
      '1688 supplier scan is missing its Playwright engine run id.',
      '1688 supplier reverse image scan failed.'
    );
  }

  return scan;
};

const read1688PlaywrightEngineRun = async (
  scan: ProductScanRecord,
  engineRunId: string
): Promise<PlaywrightEngineRun> => {
  try {
    return await readPlaywrightEngineRun(engineRunId);
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronize1688ProductScan.readRun',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
    return null;
  }
};

const syncMissing1688RunRecord = async (
  scan: ProductScanRecord,
  engineRunId: string
): Promise<ProductScanRecord> =>
  await persistFailedSynchronization(
    scan,
    `Playwright engine run ${engineRunId} was not found.`,
    '1688 supplier reverse image scan failed.'
  );

const create1688SyncContext = async (
  scan: ProductScanRecord,
  engineRunId: string,
  run: NonNullable<PlaywrightEngineRun>
): Promise<ProductScan1688SyncContext> => {
  const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
  const parsedResult = parse1688ScanRuntimeResult(resultValue);
  const retainedProductScanSteps = await readRetained1688ActionRunProductSteps(engineRunId, scan);

  return {
    scan,
    engineRunId,
    run,
    resultValue,
    finalUrl,
    parsedResult,
    productScanStepSource: retainedProductScanSteps ?? parsedResult.steps,
  };
};

const syncFailed1688ProductScan = async (
  context: ProductScan1688SyncContext
): Promise<ProductScanRecord> => {
  const failureMessages = collectPlaywrightEngineRunFailureMessages(context.run);
  const failureMessage = normalizeErrorMessage(
    failureMessages[0],
    '1688 supplier reverse image scan failed.'
  );

  return await persistSynchronizedScan(context.scan, {
    engineRunId: context.engineRunId,
    status: 'failed',
    steps: resolvePersistedProductScanSteps(context.scan, context.productScanStepSource),
    error: failureMessage,
    rawResult: buildPlaywrightEngineRunFailureMeta(context.run, { includeRawResult: true }),
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: failureMessage,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};

export const sync1688ProductScanWithRun = async (
  scan: ProductScanRecord,
  engineRunId: string
): Promise<ProductScanRecord> => {
  const run = await read1688PlaywrightEngineRun(scan, engineRunId);
  if (run === null) return await syncMissing1688RunRecord(scan, engineRunId);

  const context = await create1688SyncContext(scan, engineRunId, run);
  if (run.status === 'queued' || run.status === 'running') {
    return await syncActive1688ProductScan(context);
  }
  if (run.status === 'failed') return await syncFailed1688ProductScan(context);
  if (run.status !== 'completed') return scan;
  return await syncCompleted1688ProductScan(context);
};
