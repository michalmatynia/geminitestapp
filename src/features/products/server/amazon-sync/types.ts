import type {
  ProductScanAmazonEvaluation,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';

import type { AmazonMatchedContext } from '../product-scans-sync-amazon-matched.types';
import type { AmazonSettledRunInput } from '../product-scans-sync-amazon.types';

export type AmazonSyncContext = AmazonSettledRunInput;

export type AmazonSyncMatchedContext = AmazonMatchedContext;

export type AmazonSyncOutcome = {
  amazonEvaluation: ProductScanAmazonEvaluation;
  extractionEvaluationRawResult: unknown;
  finalizedSteps: ProductScanRecord['steps'];
  product: ProductWithImages;
  resolvedScanUrl: string | null;
  scan: ProductScanRecord;
};
