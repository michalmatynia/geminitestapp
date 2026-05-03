import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';

import type { createAmazonScanDiagnosticEmitter } from './product-scan-amazon-diagnostics';
import type {
  AmazonScanRuntimeResult,
  resolveProductScanRequestSequenceInput,
} from './product-scans-service.helpers';
import type { AmazonScanRuntimeKey } from './product-scans-sync-amazon.runtime';

export type AmazonScanDiagnostics = ReturnType<typeof createAmazonScanDiagnosticEmitter>;

export type AmazonSettledRunInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
  finalUrl: string | null;
  diagnostics: AmazonScanDiagnostics;
  currentAmazonRuntimeKey: AmazonScanRuntimeKey;
  currentAmazonRuntimeAction: PlaywrightAction | null;
  requestedStepSequenceInput: ReturnType<typeof resolveProductScanRequestSequenceInput>;
  persistedAmazonProbe: ProductScanRecord['amazonProbe'];
  existingAmazonEvaluation: ProductScanRecord['amazonEvaluation'];
};
