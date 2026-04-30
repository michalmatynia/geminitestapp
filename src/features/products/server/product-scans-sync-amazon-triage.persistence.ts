import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import type {
  ProductScanAmazonEvaluation,
  ProductScanAmazonProbe,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';

import {
  normalizeErrorMessage,
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import {
  resolveAmazonCandidateTriageMessage,
  resolveNextAmazonCandidateTriageStepAttempt,
} from './product-scans-service.helpers.amazon';
import type { ProductScanCandidateTriageEvaluationResult } from './product-scan-ai-evaluator';

type AmazonTriagePersistInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  parsedResult: AmazonScanRuntimeResult;
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
  steps: ProductScanRecord['steps'];
  rawResult: unknown;
};

const resolveCompletedAt = (run: PlaywrightEngineRunRecord): string =>
  run.completedAt ?? new Date().toISOString();

const persistAmazonTriageTerminalScan = (input: AmazonTriagePersistInput & {
  status: ProductScanRecord['status'];
  error: string;
  asinUpdateStatus: ProductScanRecord['asinUpdateStatus'];
  asinUpdateMessage: string;
  url?: string | null;
}): Promise<ProductScanRecord> =>
  persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: input.status,
    asin: null,
    matchedImageId: input.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: input.url ?? null,
    description: null,
    amazonDetails: null,
    amazonProbe: input.persistedAmazonProbe,
    amazonEvaluation: input.existingAmazonEvaluation,
    steps: input.steps,
    rawResult: input.rawResult,
    error: input.error,
    asinUpdateStatus: input.asinUpdateStatus,
    asinUpdateMessage: input.asinUpdateMessage,
    completedAt: resolveCompletedAt(input.run),
  });

export const persistAmazonTriageProductNotFound = (
  input: Omit<AmazonTriagePersistInput, 'rawResult'> & { resultValue: unknown }
): Promise<ProductScanRecord> => {
  const message = 'Product not found while triaging Amazon candidates.';
  const steps = upsertPersistedProductScanStep(input.steps, {
    key: 'product_asin_update',
    label: 'Update product ASIN',
    group: 'product',
    status: 'failed',
    resultCode: 'product_not_found',
    message,
    details: [{ label: 'Reason', value: 'Product not found' }],
    url: null,
  });
  return persistAmazonTriageTerminalScan({
    ...input,
    steps,
    rawResult: input.resultValue,
    status: 'failed',
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
  });
};

export const persistAmazonTriageEvaluationFailed = (
  input: AmazonTriagePersistInput & {
    triageEvaluation: ProductScanCandidateTriageEvaluationResult;
  }
): Promise<ProductScanRecord> => {
  const message = resolveAmazonCandidateTriageMessage(input.triageEvaluation);
  return persistAmazonTriageTerminalScan({
    ...input,
    status: 'failed',
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
  });
};

export const persistAmazonTriageNoCandidates = (
  input: AmazonTriagePersistInput
): Promise<ProductScanRecord> =>
  persistAmazonTriageTerminalScan({
    ...input,
    status: 'completed',
    error: 'No Kept Amazon candidates after AI triage.',
    asinUpdateStatus: 'failed',
    asinUpdateMessage: 'No candidates after AI triage.',
  });

export const persistAmazonTriageUnexpectedFailure = (
  input: Omit<AmazonTriagePersistInput, 'rawResult' | 'steps'> & {
    finalizedAmazonSteps: ProductScanRecord['steps'];
    resultValue: unknown;
    error: unknown;
  }
): Promise<ProductScanRecord> => {
  const message = normalizeErrorMessage(
    input.error instanceof Error ? input.error.message : input.error,
    'Failed to triage Amazon candidates.'
  );
  const steps = upsertPersistedProductScanStep(input.finalizedAmazonSteps, {
    key: 'amazon_ai_triage',
    label: 'Triage Amazon candidates',
    group: 'amazon',
    attempt: resolveNextAmazonCandidateTriageStepAttempt(input.finalizedAmazonSteps),
    candidateId: input.parsedResult.matchedImageId,
    status: 'failed',
    resultCode: 'triage_failed',
    message,
    details: [{ label: 'Error', value: message }],
    url: input.parsedResult.candidateUrls[0] ?? null,
  });
  return persistAmazonTriageTerminalScan({
    ...input,
    steps,
    rawResult: input.resultValue,
    status: 'failed',
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
  });
};
