import 'server-only';

import { productService } from '@/shared/lib/products/services/productService';

import {
  resolvePersistableScanUrl,
  resolvePersistedProductScanSteps,
  resolveProductScanRequestSequenceInput,
} from './product-scans-service.helpers';
import { resolveAmazonRuntimeActionDefinition } from './product-scans-service.helpers.amazon';
import { persistMissingAmazonProbeProduct } from './product-scans-sync-amazon-probe.product-missing';
import {
  loadAmazonProbeScannerSettings,
  resolveAmazonProbeRuntimeKey,
} from './product-scans-sync-amazon-probe.runtime';
import { synchronizeAmazonProbeReadyWithProduct } from './product-scans-sync-amazon-probe.flow';
import type {
  AmazonProbeReadyContext,
  SynchronizeAmazonProbeReadyInput,
  SynchronizeAmazonStatusInput,
} from './product-scans-sync-amazon-probe.types';

export type { SynchronizeAmazonStatusInput } from './product-scans-sync-amazon-probe.types';

const resolveAmazonProbeUrl = (input: SynchronizeAmazonProbeReadyInput): string | null =>
  resolvePersistableScanUrl(
    input.parsedResult.amazonProbe?.canonicalUrl,
    input.parsedResult.amazonProbe?.candidateUrl,
    input.parsedResult.url,
    input.parsedResult.currentUrl,
    input.finalUrl
  );

const createAmazonProbeReadyContext = async (
  input: SynchronizeAmazonProbeReadyInput
): Promise<AmazonProbeReadyContext | null> => {
  const product = await productService.getProductById(input.scan.productId);
  if (product === null) return null;

  const scannerSettings = await loadAmazonProbeScannerSettings(input.scan, input.engineRunId);
  const amazonRuntimeKey = resolveAmazonProbeRuntimeKey(input.scan.rawResult);
  return {
    ...input,
    product,
    resolvedProbeUrl: resolveAmazonProbeUrl(input),
    finalizedAmazonSteps: resolvePersistedProductScanSteps(
      input.scan,
      input.parsedResult.steps
    ),
    scannerSettings,
    requestedStepSequenceInput: resolveProductScanRequestSequenceInput(input.scan.rawResult),
    amazonRuntimeKey,
    amazonRuntimeAction: await resolveAmazonRuntimeActionDefinition(amazonRuntimeKey),
  };
};

export async function synchronizeAmazonProbeReady(
  input: SynchronizeAmazonProbeReadyInput
): Promise<SynchronizeAmazonStatusInput['scan']> {
  const context = await createAmazonProbeReadyContext(input);
  if (context !== null) {
    return await synchronizeAmazonProbeReadyWithProduct(context);
  }

  return await persistMissingAmazonProbeProduct({
    ...input,
    resolvedProbeUrl: resolveAmazonProbeUrl(input),
    finalizedAmazonSteps: resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
  });
}
