import 'server-only';

import { collectPlaywrightEngineRunFailureMessages } from '@/features/playwright/server';
import { AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY, resolveAmazonRuntimeOperationLabel } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import { amazonScanDiagnosticArtifact } from './product-scan-amazon-diagnostics';
import {
  normalizeErrorMessage,
  persistSynchronizedScan,
  readOptionalString,
  resolvePersistableScanUrl,
  resolvePersistedProductScanSteps,
} from './product-scans-service.helpers';
import { synchronizeAmazonCaptchaRequired } from './product-scans-sync-amazon-captcha';
import { retryAmazonScanWithNextCandidateAfterAmazonStageFailure } from './product-scans-sync-amazon-continuation';
import { retryAmazonScanWithFallbackProviderAfterNoCandidates } from './product-scans-sync-amazon-fallback';
import { synchronizeAmazonProbeReady } from './product-scans-sync-amazon-probe';
import { isGoogleCandidatesNoCandidatesFailure } from './product-scans-sync-amazon.runtime';
import { synchronizeAmazonTriageReady } from './product-scans-sync-amazon-triage';
import type { AmazonSettledRunInput } from './product-scans-sync-amazon.types';

const emitSettledDiagnostic = async (
  input: AmazonSettledRunInput,
  eventName: 'captcha.detected' | 'triage.evaluated' | 'probe.evaluated' | 'no_match' | 'failed'
): Promise<void> => {
  if (input.diagnostics.enabled !== true) return;
  await input.diagnostics.emit(eventName, {
    'raw-engine-result': amazonScanDiagnosticArtifact.json(input.resultValue),
    'parsed-result': amazonScanDiagnosticArtifact.json(input.parsedResult),
    'persisted-probe': amazonScanDiagnosticArtifact.json(input.persistedAmazonProbe),
    'existing-evaluation': amazonScanDiagnosticArtifact.json(input.existingAmazonEvaluation),
  });
};

const persistAmazonCandidateSelectionRequired = (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> =>
  persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: 'completed',
    asin: null,
    matchedImageId: input.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: resolvePersistableScanUrl(input.parsedResult.url, input.parsedResult.currentUrl, input.finalUrl),
    description: null,
    amazonDetails: null,
    amazonProbe: null,
    amazonEvaluation: null,
    steps: resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
    rawResult: {
      ...(typeof input.resultValue === 'object' && input.resultValue !== null ? input.resultValue : {}),
      candidateSelectionRequired: true,
      runtimeKey: input.currentAmazonRuntimeKey,
      actionId: input.currentAmazonRuntimeAction?.id ?? null,
    },
    error: null,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: input.parsedResult.message ?? 'Candidates ready for extraction.',
    completedAt: input.run.completedAt ?? new Date().toISOString(),
  });

const synchronizeAmazonTriageReadyStatus = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> => {
  if (input.currentAmazonRuntimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY) {
    return await persistAmazonCandidateSelectionRequired(input);
  }
  await emitSettledDiagnostic(input, 'triage.evaluated');
  return await synchronizeAmazonTriageReady(input);
};

const synchronizeAmazonNoMatchStatus = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> => {
  await emitSettledDiagnostic(input, 'no_match');
  return await persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: 'no_match',
    matchedImageId: input.parsedResult.matchedImageId,
    title: input.parsedResult.title,
    price: input.parsedResult.price,
    url: resolvePersistableScanUrl(input.parsedResult.url, input.parsedResult.currentUrl, input.finalUrl),
    description: input.parsedResult.description,
    amazonDetails: input.parsedResult.amazonDetails,
    amazonProbe: input.persistedAmazonProbe,
    amazonEvaluation: input.existingAmazonEvaluation,
    steps: resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
    rawResult: input.resultValue,
    error: input.parsedResult.message,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: input.parsedResult.message,
    completedAt: input.run.completedAt ?? new Date().toISOString(),
  });
};

const synchronizeReadyStatus = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord | null> => {
  if (input.parsedResult.status === 'captcha_required') {
    await emitSettledDiagnostic(input, 'captcha.detected');
    return await synchronizeAmazonCaptchaRequired(input);
  }
  if (input.parsedResult.status === 'triage_ready') {
    return await synchronizeAmazonTriageReadyStatus(input);
  }
  if (input.parsedResult.status === 'probe_ready') {
    await emitSettledDiagnostic(input, 'probe.evaluated');
    return await synchronizeAmazonProbeReady(input);
  }
  return input.parsedResult.status === 'no_match'
    ? await synchronizeAmazonNoMatchStatus(input)
    : null;
};

const retryFailedAmazonStatus = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord | null> => {
  if (isGoogleCandidatesNoCandidatesFailure(input.parsedResult)) {
    const fallbackRetry = await retryAmazonScanWithFallbackProviderAfterNoCandidates(input);
    if (fallbackRetry !== null) return fallbackRetry;
  }
  return await retryAmazonScanWithNextCandidateAfterAmazonStageFailure({
    ...input,
    diagnosticsEnabled: input.diagnostics.enabled,
  });
};

const persistUnexpectedAmazonStatusFailure = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> => {
  const failureMessages = collectPlaywrightEngineRunFailureMessages(input.run);
  const failureMessage = normalizeErrorMessage(
    readOptionalString(input.parsedResult.message) ?? failureMessages[0],
    `${resolveAmazonRuntimeOperationLabel(input.currentAmazonRuntimeKey)} failed.`
  );
  await emitSettledDiagnostic(input, 'failed');
  return await persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: 'failed',
    matchedImageId: input.parsedResult.matchedImageId,
    title: input.parsedResult.title,
    price: input.parsedResult.price,
    url: resolvePersistableScanUrl(input.parsedResult.url, input.parsedResult.currentUrl, input.finalUrl),
    description: input.parsedResult.description,
    amazonDetails: input.parsedResult.amazonDetails,
    amazonProbe: input.persistedAmazonProbe,
    amazonEvaluation: input.existingAmazonEvaluation,
    steps: resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
    rawResult: input.resultValue,
    error: failureMessage,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: failureMessage,
    completedAt: input.run.completedAt ?? new Date().toISOString(),
  });
};

const synchronizeFailedStatus = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord | null> => {
  if (input.parsedResult.status !== 'failed') return null;
  const retry = await retryFailedAmazonStatus(input);
  return retry ?? await persistUnexpectedAmazonStatusFailure(input);
};

export const synchronizeAmazonPreMatchedRun = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord | null> => {
  const readyResult = await synchronizeReadyStatus(input);
  if (readyResult !== null) return readyResult;
  const failedResult = await synchronizeFailedStatus(input);
  if (failedResult !== null) return failedResult;
  return input.parsedResult.status === 'matched'
    ? null
    : await persistUnexpectedAmazonStatusFailure(input);
};
