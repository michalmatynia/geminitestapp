import type {
  AmazonMatchedEvaluationResult,
} from '../product-scans-sync-amazon-matched.types';
import { runAmazonExtractionEvaluation } from '../product-scans-sync-amazon-matched.evaluation';

import type { AmazonSyncMatchedContext } from './types';

export const evaluateAmazonScan = async (
  context: AmazonSyncMatchedContext
): Promise<AmazonMatchedEvaluationResult> =>
  await runAmazonExtractionEvaluation(context);
