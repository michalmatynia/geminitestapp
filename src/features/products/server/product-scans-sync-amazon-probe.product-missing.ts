import 'server-only';

import {
  persistSynchronizedScan,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import type { SynchronizeAmazonProbeReadyInput } from './product-scans-sync-amazon-probe.types';

type PersistMissingAmazonProbeProductInput = SynchronizeAmazonProbeReadyInput & {
  resolvedProbeUrl: string | null;
  finalizedAmazonSteps: ReturnType<typeof upsertPersistedProductScanStep>;
};

export const persistMissingAmazonProbeProduct = async (
  input: PersistMissingAmazonProbeProductInput
): Promise<SynchronizeAmazonProbeReadyInput['scan']> => {
  const message = 'Product not found while evaluating the Amazon candidate.';
  return await persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: 'failed',
    asin: input.parsedResult.asin,
    matchedImageId: input.parsedResult.matchedImageId,
    title: input.parsedResult.title,
    price: input.parsedResult.price,
    url: input.resolvedProbeUrl,
    description: input.parsedResult.description,
    amazonDetails: null,
    amazonProbe: input.persistedAmazonProbe,
    amazonEvaluation: input.existingAmazonEvaluation,
    steps: upsertPersistedProductScanStep(input.finalizedAmazonSteps, {
      key: 'product_asin_update',
      label: 'Update product ASIN',
      group: 'product',
      status: 'failed',
      resultCode: 'product_not_found',
      message,
      details: [{ label: 'Reason', value: 'Product not found' }],
      url: input.resolvedProbeUrl,
    }),
    rawResult: input.resultValue,
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
    completedAt: input.run.completedAt ?? new Date().toISOString(),
  });
};
