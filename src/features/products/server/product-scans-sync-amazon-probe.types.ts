import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import type {
  ProductScanAmazonEvaluation,
  ProductScanAmazonProbe,
  ProductScanRecord,
  ProductScanStep,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductScannerSettings } from '@/shared/contracts/products/scanner-settings';

import type {
  AmazonScanRuntimeResult,
  resolveProductScanRequestSequenceInput,
} from './product-scans-service.helpers';
import type { resolveAmazonRuntimeActionDefinition } from './product-scans-service.helpers.amazon';

export type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
};

export type SynchronizeAmazonProbeReadyInput = SynchronizeAmazonStatusInput & {
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
  finalUrl: string | null;
};

export type AmazonRuntimeActionDefinition = Awaited<
  ReturnType<typeof resolveAmazonRuntimeActionDefinition>
>;

export type AmazonProbeReadyContext = SynchronizeAmazonProbeReadyInput & {
  product: ProductWithImages;
  resolvedProbeUrl: string | null;
  finalizedAmazonSteps: ProductScanStep[];
  scannerSettings: ProductScannerSettings;
  requestedStepSequenceInput: ReturnType<typeof resolveProductScanRequestSequenceInput>;
  amazonRuntimeKey: string;
  amazonRuntimeAction: AmazonRuntimeActionDefinition;
};

export type AmazonProbeEvaluationState = {
  amazonEvaluation: ProductScanAmazonEvaluation;
  finalizedAmazonSteps: ProductScanStep[];
  probeEvaluationRawResult: unknown;
};
