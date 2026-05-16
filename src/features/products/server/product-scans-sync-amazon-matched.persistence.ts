import 'server-only';

import { CachedProductService } from '@/features/products/performance/cached-service';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';

import {
  resolveDetectedAmazonAsinOutcome,
} from './product-scan-amazon.helpers';
import {
  createPersistedProductScanStep,
  normalizeErrorMessage,
  persistSynchronizedScan,
  readOptionalString,
  resolveAsinUpdateStepStatus,
  resolvePersistableScanUrl,
  resolvePersistedProductScanSteps,
  upsertPersistedProductScanStep,
} from './product-scans-service.helpers';
import { shouldWriteAmazonEnglishContent } from './product-scans-service.helpers.amazon';
import type { AmazonMatchedContext } from './product-scans-sync-amazon-matched.types';
import type { AmazonSettledRunInput } from './product-scans-sync-amazon.types';

type AmazonAsinOutcome = ReturnType<typeof resolveDetectedAmazonAsinOutcome>;

type FinalAsinUpdate = {
  message: string | null;
  scanStatus: ProductScanRecord['status'];
  updateStatus: ProductScanRecord['asinUpdateStatus'];
};

const resolveAsinUpdateResultCode = (
  status: ProductScanRecord['asinUpdateStatus']
): string => {
  switch (status) {
    case 'updated':
      return 'asin_updated';
    case 'unchanged':
      return 'asin_unchanged';
    case 'conflict':
      return 'asin_conflict';
    case 'not_needed':
      return 'asin_not_needed';
    default:
      return 'asin_update_failed';
  }
};

export const persistAmazonMatchedProductMissing = async (
  input: AmazonSettledRunInput
): Promise<ProductScanRecord> => {
  const message = 'Product not found while finalizing the Amazon scan.';
  const scanUrl = resolvePersistableScanUrl(
    input.parsedResult.url,
    input.parsedResult.currentUrl,
    input.finalUrl
  );
  const finalizedSteps = upsertPersistedProductScanStep(
    resolvePersistedProductScanSteps(input.scan, input.parsedResult.steps),
    createPersistedProductScanStep({
      key: 'product_asin_update',
      label: 'Update product ASIN',
      status: 'failed',
      resultCode: 'product_not_found',
      message,
      details: [{ label: 'Reason', value: 'Product not found' }],
      url: scanUrl,
    })
  );
  return await persistSynchronizedScan(input.scan, {
    engineRunId: input.engineRunId,
    status: 'failed',
    asin: input.parsedResult.asin,
    matchedImageId: input.parsedResult.matchedImageId,
    title: input.parsedResult.title,
    price: input.parsedResult.price,
    url: scanUrl,
    description: input.parsedResult.description,
    amazonDetails: input.parsedResult.amazonDetails,
    amazonProbe: input.persistedAmazonProbe,
    steps: finalizedSteps,
    rawResult: input.resultValue,
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
    completedAt: input.run.completedAt ?? new Date().toISOString(),
  });
};

const updateProductAsinIfNeeded = async (
  context: AmazonMatchedContext,
  asinOutcome: AmazonAsinOutcome
): Promise<string | null> => {
  if (asinOutcome.asinUpdateStatus !== 'updated') return null;
  if (asinOutcome.normalizedDetectedAsin === null) return null;

  try {
    await productService.updateProduct(
      context.product.id,
      { asin: asinOutcome.normalizedDetectedAsin },
      resolveProductUpdateAudit(context)
    );
    CachedProductService.invalidateProduct(context.product.id);
    return null;
  } catch (error) {
    return normalizeErrorMessage(
      error instanceof Error ? error.message : error,
      'Failed to update product ASIN.'
    );
  }
};

const resolveProductUpdateAudit = (
  context: AmazonMatchedContext
): { userId: string } | undefined => {
  const scanUpdatedBy = readOptionalString(context.scan.updatedBy);
  return scanUpdatedBy !== null ? { userId: scanUpdatedBy } : undefined;
};

const resolveFinalAsinUpdate = (
  asinOutcome: AmazonAsinOutcome,
  updateFailureMessage: string | null
): FinalAsinUpdate => {
  if (updateFailureMessage !== null) {
    return {
      message: updateFailureMessage,
      scanStatus: 'failed',
      updateStatus: 'failed',
    };
  }
  return {
    message: asinOutcome.message,
    scanStatus: asinOutcome.scanStatus,
    updateStatus: asinOutcome.asinUpdateStatus,
  };
};

const buildAsinUpdateStep = (
  context: AmazonMatchedContext,
  asinOutcome: AmazonAsinOutcome,
  finalUpdate: FinalAsinUpdate
): ProductScanRecord['steps'][number] => createPersistedProductScanStep({
  key: 'product_asin_update',
  label: 'Update product ASIN',
  status: resolveAsinUpdateStepStatus(finalUpdate.updateStatus),
  resultCode: resolveAsinUpdateResultCode(finalUpdate.updateStatus),
  message: finalUpdate.message,
  details: [
    { label: 'Detected ASIN', value: asinOutcome.normalizedDetectedAsin },
    { label: 'Existing ASIN', value: context.product.asin ?? null },
  ],
  url: context.resolvedScanUrl,
});

export const persistAmazonMatchedAsinOutcome = async (
  context: AmazonMatchedContext
): Promise<ProductScanRecord> => {
  const asinOutcome = resolveDetectedAmazonAsinOutcome({
    existingAsin: context.product.asin,
    detectedAsin: context.parsedResult.asin,
  });
  const finalUpdate = resolveFinalAsinUpdate(
    asinOutcome,
    await updateProductAsinIfNeeded(context, asinOutcome)
  );
  const writeEnglishFields = shouldWriteAmazonEnglishContent(context.amazonEvaluation);
  const finalizedSteps = upsertPersistedProductScanStep(
    context.finalizedAmazonSteps,
    buildAsinUpdateStep(context, asinOutcome, finalUpdate)
  );
  return await persistSynchronizedScan(context.scan, {
    engineRunId: context.engineRunId,
    status: finalUpdate.scanStatus,
    asin: asinOutcome.normalizedDetectedAsin,
    matchedImageId: context.parsedResult.matchedImageId,
    title: writeEnglishFields ? context.parsedResult.title : null,
    price: context.parsedResult.price,
    url: context.resolvedScanUrl,
    description: writeEnglishFields ? context.parsedResult.description : null,
    amazonDetails: context.parsedResult.amazonDetails,
    amazonProbe: context.persistedAmazonProbe,
    amazonEvaluation: context.amazonEvaluation,
    steps: finalizedSteps,
    rawResult: context.extractionEvaluationRawResult,
    error: finalUpdate.scanStatus === 'failed' || finalUpdate.scanStatus === 'conflict'
      ? finalUpdate.message
      : null,
    asinUpdateStatus: finalUpdate.updateStatus,
    asinUpdateMessage: finalUpdate.message,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};
