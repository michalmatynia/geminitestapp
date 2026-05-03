import 'server-only';

import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { amazonScanDiagnosticArtifact } from './product-scan-amazon-diagnostics';
import {
  resolvePersistableScanUrl,
  resolvePersistedProductScanSteps,
} from './product-scans-service.helpers';
import { isApprovedAmazonCandidateExtractionRun } from './product-scans-service.helpers.amazon';
import { runAmazonExtractionEvaluation } from './product-scans-sync-amazon-matched.evaluation';
import {
  persistAmazonMatchedAsinOutcome,
  persistAmazonMatchedProductMissing,
} from './product-scans-sync-amazon-matched.persistence';
import type {
  AmazonMatchedContext,
  AmazonMatchedScannerSettings,
} from './product-scans-sync-amazon-matched.types';
import type { AmazonSettledRunInput } from './product-scans-sync-amazon.types';
import { getProductScannerSettings } from './product-scanner-settings';

const emitMatchedDiagnostic = async (input: AmazonSettledRunInput): Promise<void> => {
  if (input.diagnostics.enabled !== true) return;
  await input.diagnostics.emit('matched', {
    'raw-engine-result': amazonScanDiagnosticArtifact.json(input.resultValue),
    'parsed-result': amazonScanDiagnosticArtifact.json(input.parsedResult),
    'persisted-probe': amazonScanDiagnosticArtifact.json(input.persistedAmazonProbe),
    'existing-evaluation': amazonScanDiagnosticArtifact.json(input.existingAmazonEvaluation),
  });
};

const loadScannerSettingsForAmazonEvaluator = async (
  input: AmazonSettledRunInput
): Promise<AmazonMatchedScannerSettings> => {
  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForAmazonEvaluator',
      scanId: input.scan.id,
      productId: input.scan.productId,
      engineRunId: input.engineRunId,
    });
  }
  return scannerSettings;
};

const createAmazonMatchedContext = (
  input: AmazonSettledRunInput,
  product: ProductWithImages,
  scannerSettings: AmazonMatchedScannerSettings
): AmazonMatchedContext => ({
  ...input,
  product,
  scannerSettings,
  resolvedScanUrl: resolvePersistableScanUrl(
    input.parsedResult.url,
    input.parsedResult.currentUrl,
    input.finalUrl
  ),
  finalizedAmazonSteps: resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
  amazonEvaluation: isApprovedAmazonCandidateExtractionRun(input.scan)
    ? input.existingAmazonEvaluation
    : null,
  extractionEvaluationRawResult: input.resultValue,
});

export const synchronizeAmazonMatchedRun = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> => {
  await emitMatchedDiagnostic(input);
  const product = await productService.getProductById(input.scan.productId);
  if (product === null) {
    return await persistAmazonMatchedProductMissing(input);
  }

  const context = createAmazonMatchedContext(
    input,
    product,
    await loadScannerSettingsForAmazonEvaluator(input)
  );
  const evaluation = await runAmazonExtractionEvaluation(context);
  if (evaluation.finalScan !== null) return evaluation.finalScan;
  return await persistAmazonMatchedAsinOutcome(evaluation.context);
};
