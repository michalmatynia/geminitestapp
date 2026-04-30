import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import type {
  RejectedAmazonEvaluation,
  RejectedRuntimeContext,
} from './product-scans-sync-amazon-matched.rejection-context';

const shouldPreserveRejectedAmazonLanguageData = (
  evaluation: RejectedAmazonEvaluation
): boolean => evaluation.rejectionCategory === 'language' && evaluation.sameProduct === true;

export const persistRejectedAmazonEvaluationNoMatch = async (
  context: RejectedRuntimeContext
): Promise<ProductScanRecord> => {
  const message = context.amazonEvaluation.error ?? 'Amazon candidate AI evaluation rejected.';
  const preserveLanguageData = shouldPreserveRejectedAmazonLanguageData(context.amazonEvaluation);
  const skippedUpdateSteps = upsertPersistedProductScanStep(context.finalizedAmazonSteps, {
    key: 'product_asin_update',
    label: 'Update product ASIN',
    group: 'product',
    status: 'skipped',
    resultCode: 'asin_not_needed',
    message: 'Skipped product ASIN update because the AI evaluator rejected the Amazon candidate.',
    details: [{ label: 'Reason', value: message }],
    url: context.amazonEvaluation.evidence?.candidateUrl ?? context.resolvedScanUrl,
  });
  return await persistSynchronizedScan(context.scan, {
    engineRunId: context.engineRunId,
    status: 'no_match',
    asin: preserveLanguageData ? context.parsedResult.asin : null,
    matchedImageId: context.parsedResult.matchedImageId,
    title: null,
    price: null,
    url: preserveLanguageData ? context.resolvedScanUrl : null,
    description: null,
    amazonDetails: preserveLanguageData ? context.parsedResult.amazonDetails : null,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: context.amazonEvaluation,
    steps: skippedUpdateSteps,
    rawResult: context.extractionEvaluationRawResult,
    error: message,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: message,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};
