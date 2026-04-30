import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  readPlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { resolveAmazonRuntimeOperationLabel } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  amazonScanDiagnosticArtifact,
  collectAmazonScanRunDiagnosticArtifacts,
  createAmazonScanDiagnosticEmitter,
} from './product-scan-amazon-diagnostics';
import {
  normalizeErrorMessage,
  parseAmazonScanRuntimeResult,
  persistFailedSynchronization,
  persistSynchronizedScan,
  resolvePersistedProductScanSteps,
  resolveProductScanRequestSequenceInput,
} from './product-scans-service.helpers';
import { isApprovedAmazonCandidateExtractionRun } from './product-scans-service.helpers.amazon';
import { synchronizeAmazonActiveRun } from './product-scans-sync-amazon-active';
import { synchronizeAmazonMatchedRun } from './product-scans-sync-amazon-matched';
import {
  resolveAmazonScanRuntimeAction,
  resolveAmazonScanRuntimeKey,
} from './product-scans-sync-amazon.runtime';
import { synchronizeAmazonPreMatchedRun } from './product-scans-sync-amazon-settled';
import type { AmazonSettledRunInput } from './product-scans-sync-amazon.types';

type ReadAmazonRunResult =
  | { status: 'found'; run: PlaywrightEngineRunRecord }
  | { status: 'not_found' }
  | { status: 'read_failed' };

const readAmazonEngineRun = async (
  scan: ProductScanRecord,
  engineRunId: string
): Promise<ReadAmazonRunResult> => {
  try {
    const run = await readPlaywrightEngineRun(engineRunId);
    return run === null ? { status: 'not_found' } : { status: 'found', run };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.readRun',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
    return { status: 'read_failed' };
  }
};

const emitAmazonSyncEnterDiagnostic = async (
  input: AmazonSettledRunInput
): Promise<void> => {
  if (input.diagnostics.enabled !== true) return;
  const runArtifacts = await collectAmazonScanRunDiagnosticArtifacts(input.run);
  await input.diagnostics.emit('sync.enter', {
    'run-metadata': amazonScanDiagnosticArtifact.json({
      engineRunId: input.engineRunId,
      status: input.run.status,
      startedAt: input.run.startedAt,
      completedAt: input.run.completedAt,
      finalUrl: input.finalUrl,
    }),
    'parsed-result': amazonScanDiagnosticArtifact.json(input.parsedResult),
    'raw-engine-result': amazonScanDiagnosticArtifact.json(input.resultValue),
    'scan-snapshot': amazonScanDiagnosticArtifact.json({
      id: input.scan.id,
      productId: input.scan.productId,
      status: input.scan.status,
      provider: input.scan.provider,
      rawResult: input.scan.rawResult,
    }),
    ...runArtifacts,
  });
};

const createAmazonSettledRunInput = async (
  scan: ProductScanRecord,
  run: PlaywrightEngineRunRecord,
  engineRunId: string
): Promise<AmazonSettledRunInput> => {
  const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
  const parsedResult = parseAmazonScanRuntimeResult(resultValue);
  const currentAmazonRuntimeKey = resolveAmazonScanRuntimeKey(scan);
  const approvedCandidateProbe =
    isApprovedAmazonCandidateExtractionRun(scan) ? scan.amazonProbe ?? null : null;
  const input = {
    scan,
    run,
    engineRunId,
    resultValue,
    parsedResult,
    finalUrl,
    diagnostics: createAmazonScanDiagnosticEmitter(scan),
    currentAmazonRuntimeKey,
    currentAmazonRuntimeAction: await resolveAmazonScanRuntimeAction(scan),
    requestedStepSequenceInput: resolveProductScanRequestSequenceInput(scan.rawResult),
    persistedAmazonProbe: parsedResult.amazonProbe ?? approvedCandidateProbe,
    existingAmazonEvaluation: scan.amazonEvaluation ?? null,
  };
  await emitAmazonSyncEnterDiagnostic(input);
  return input;
};

const persistFailedAmazonEngineRun = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> => {
  const failureMessages = collectPlaywrightEngineRunFailureMessages(input.run);
  const failureMessage = normalizeErrorMessage(
    failureMessages[0],
    `${resolveAmazonRuntimeOperationLabel(input.currentAmazonRuntimeKey)} failed.`
  );

  return await persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: 'failed',
    steps: resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
    error: failureMessage,
    rawResult: buildPlaywrightEngineRunFailureMeta(input.run, { includeRawResult: true }),
    asinUpdateStatus: 'failed',
    asinUpdateMessage: failureMessage,
    completedAt: input.run.completedAt ?? new Date().toISOString(),
  });
};

const synchronizeResolvedAmazonRun = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> => {
  if (input.run.status === 'queued' || input.run.status === 'running') {
    return await synchronizeAmazonActiveRun(input);
  }
  if (input.run.status === 'failed') {
    return await persistFailedAmazonEngineRun(input);
  }

  const preMatchedResult = await synchronizeAmazonPreMatchedRun(input);
  if (preMatchedResult !== null) return preMatchedResult;
  return await synchronizeAmazonMatchedRun(input);
};

const persistMissingAmazonEngineRun = (
  scan: ProductScanRecord,
  engineRunId: string
): Promise<ProductScanRecord> =>
  persistFailedSynchronization(scan, `Playwright engine run ${engineRunId} was not found.`);

export const synchronizeAmazonProductScanEngineRun = async (
  scan: ProductScanRecord,
  engineRunId: string
): Promise<ProductScanRecord> => {
  const readResult = await readAmazonEngineRun(scan, engineRunId);
  if (readResult.status === 'read_failed') return scan;
  if (readResult.status === 'not_found') {
    return await persistMissingAmazonEngineRun(scan, engineRunId);
  }
  return await synchronizeResolvedAmazonRun(
    await createAmazonSettledRunInput(scan, readResult.run, engineRunId)
  );
};
