import 'server-only';

import { emitProductCacheInvalidation } from '@/shared/events/products';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  asTrimmedString,
  buildUpdateOptions,
  extractGeneratedCopy,
  isMarketplaceCopyDebrandBatchRun,
  resolveMarketplaceCopyOverrideUpdate,
  type PersistMarketplaceCopyDebrandBatchRunResultInput,
  type PersistMarketplaceCopyDebrandBatchRunResultOutcome,
} from './marketplace-copy-debrand-run-completion.helpers';

const LOG_SERVICE = 'marketplace-copy-debrand-run-completion';

const logWarningOutcome = async (input: {
  message: string;
  context: Record<string, unknown>;
  outcome: PersistMarketplaceCopyDebrandBatchRunResultOutcome;
}): Promise<PersistMarketplaceCopyDebrandBatchRunResultOutcome> => {
  await ErrorSystem.logWarning(input.message, {
    service: LOG_SERVICE,
    ...input.context,
  });
  return input.outcome;
};

const persistMarketplaceCopyDebrandBatchRunResultForProduct = async (
  input: PersistMarketplaceCopyDebrandBatchRunResultInput,
  productId: string
): Promise<PersistMarketplaceCopyDebrandBatchRunResultOutcome> => {
  const generatedCopy = extractGeneratedCopy(input);
  if (generatedCopy === null) {
    return logWarningOutcome({
      message: 'Marketplace copy debrand batch run did not produce copy',
      context: { runId: input.run.id, productId },
      outcome: { applied: false, reason: 'missing_generated_copy', productId },
    });
  }

  const product = await productService.getProductById(productId);
  if (!product) {
    return logWarningOutcome({
      message: 'Product not found for marketplace copy debrand result',
      context: { runId: input.run.id, productId },
      outcome: { applied: false, reason: 'product_not_found', productId },
    });
  }

  const updateResolution = resolveMarketplaceCopyOverrideUpdate({
    runInput: input,
    product,
    productId,
    generatedCopy,
  });
  if (updateResolution.kind === 'skip') return updateResolution.outcome;

  await productService.updateProduct(
    product.id,
    { marketplaceContentOverrides: updateResolution.nextOverrides },
    buildUpdateOptions(input.run)
  );
  emitProductCacheInvalidation();

  await ErrorSystem.logInfo('Persisted marketplace copy debrand batch result', {
    service: LOG_SERVICE,
    runId: input.run.id,
    productId,
    integrationId: updateResolution.integrationId,
    rowIndex: updateResolution.rowIndex,
  });

  return {
    applied: true,
    reason: 'applied',
    productId,
    rowIndex: updateResolution.rowIndex,
  };
};

const handlePersistFailure = async (input: {
  error: unknown;
  run: PersistMarketplaceCopyDebrandBatchRunResultInput['run'];
  productId: string;
}): Promise<PersistMarketplaceCopyDebrandBatchRunResultOutcome> => {
  await ErrorSystem.captureException(input.error, {
    service: LOG_SERVICE,
    action: 'persistMarketplaceCopyDebrandBatchRunResult',
    runId: input.run.id,
    productId: input.productId,
  });
  return { applied: false, reason: 'persist_failed', productId: input.productId };
};

export const persistMarketplaceCopyDebrandBatchRunResult = async (
  input: PersistMarketplaceCopyDebrandBatchRunResultInput
): Promise<PersistMarketplaceCopyDebrandBatchRunResultOutcome> => {
  if (!isMarketplaceCopyDebrandBatchRun(input.runMeta)) {
    return { applied: false, reason: 'not_marketplace_copy_debrand_batch' };
  }

  const productId = asTrimmedString(input.run.entityId);
  if (productId === null) {
    return logWarningOutcome({
      message: 'Marketplace copy debrand batch run is missing product id',
      context: { runId: input.run.id },
      outcome: { applied: false, reason: 'missing_product_id' },
    });
  }

  try {
    return await persistMarketplaceCopyDebrandBatchRunResultForProduct(input, productId);
  } catch (error) {
    return handlePersistFailure({ error, run: input.run, productId });
  }
};
