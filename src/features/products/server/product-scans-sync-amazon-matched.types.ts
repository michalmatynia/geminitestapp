import 'server-only';

import type { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type {
  ProductScanAmazonEvaluation,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';

import type { AmazonSettledRunInput } from './product-scans-sync-amazon.types';

export type AmazonMatchedScannerSettings = ReturnType<
  typeof createDefaultProductScannerSettings
>;

export type AmazonMatchedContext = AmazonSettledRunInput & {
  product: ProductWithImages;
  scannerSettings: AmazonMatchedScannerSettings;
  resolvedScanUrl: string | null;
  finalizedAmazonSteps: ProductScanRecord['steps'];
  amazonEvaluation: ProductScanAmazonEvaluation;
  extractionEvaluationRawResult: unknown;
};

export type AmazonMatchedEvaluationResult = {
  context: AmazonMatchedContext;
  finalScan: ProductScanRecord | null;
};
