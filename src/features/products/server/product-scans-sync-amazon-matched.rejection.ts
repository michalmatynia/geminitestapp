import 'server-only';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  createRejectedRuntimeContext,
  type AmazonRejectedMatchedContext,
} from './product-scans-sync-amazon-matched.rejection-context';
import { persistRejectedAmazonEvaluationNoMatch } from './product-scans-sync-amazon-matched.rejection-no-match';
import { retryRejectedAmazonWithFallbackProvider } from './product-scans-sync-amazon-matched.rejection-fallback';
import { retryRejectedAmazonWithNextCandidate } from './product-scans-sync-amazon-matched.rejection-continuation';

export const handleRejectedAmazonEvaluation = async (
  context: AmazonRejectedMatchedContext
): Promise<ProductScanRecord> => {
  const runtimeContext = createRejectedRuntimeContext(context);
  const fallbackRetry = await retryRejectedAmazonWithFallbackProvider(runtimeContext);
  if (fallbackRetry !== null) return fallbackRetry;
  const candidateRetry = await retryRejectedAmazonWithNextCandidate(runtimeContext);
  return candidateRetry ?? await persistRejectedAmazonEvaluationNoMatch(runtimeContext);
};
