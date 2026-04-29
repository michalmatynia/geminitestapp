import 'server-only';

import { randomUUID } from 'node:crypto';

import { integrationService } from '@/features/integrations/services/integration-service';
import { enqueueMarketplaceCopyDebrandRun } from '@/features/products/server/marketplace-copy-debrand-ai-path';
import {
  ensureProductMarketplaceCopyOverrideForIntegration,
  resolveMarketplaceCopyDebrandIntegration,
  resolveMarketplaceCopyDebrandIntegrationName,
} from '@/features/products/server/marketplace-copy-debrand-batch';
import type { IntegrationRecord } from '@/shared/contracts/integrations/repositories';
import { serviceUnavailableError } from '@/shared/errors/app-error';
import { emitProductCacheInvalidation } from '@/shared/events/products';
import { productService } from '@/shared/lib/products/services/productService';
import { createManagedQueue, isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';
import type { ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const PRODUCT_MARKETPLACE_COPY_DEBRAND_BATCH_QUEUE_NAME =
  'product-marketplace-copy-debrand-batch';

export type ProductMarketplaceCopyDebrandBatchJobData = {
  productIds: string[];
  integrationId: string;
  userId: string | null;
  requestedAt: string;
};

export type ProductMarketplaceCopyDebrandBatchJobResult = {
  requested: number;
  processed: number;
  overridesCreated: number;
  overridesAlreadyExisted: number;
  debrandRunsQueued: number;
  failed: number;
};

const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
const LOG_SERVICE = 'product-marketplace-copy-debrand-batch-queue';

const uniqueProductIds = (productIds: string[]): string[] =>
  Array.from(
    new Set(
      productIds
        .map((productId: string): string => productId.trim())
        .filter((productId: string): boolean => productId.length > 0)
    )
  );

const buildProductServiceOptions = (
  userId: string | null | undefined
): { userId: string } | undefined => {
  const normalized = typeof userId === 'string' ? userId.trim() : '';
  return normalized.length > 0 ? { userId: normalized } : undefined;
};

const buildIntegrationNameMap = async (
  selectedIntegration: IntegrationRecord
): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  map.set(
    selectedIntegration.id,
    resolveMarketplaceCopyDebrandIntegrationName(selectedIntegration)
  );
  const integrations = await integrationService.listIntegrations().catch(() => []);
  integrations.forEach((integration: IntegrationRecord) => {
    map.set(integration.id, resolveMarketplaceCopyDebrandIntegrationName(integration));
  });
  return map;
};

type ProcessBatchProductInput = {
  productId: string;
  jobId: string;
  data: ProductMarketplaceCopyDebrandBatchJobData;
  integration: IntegrationRecord;
  integrationNameById: Map<string, string>;
  options: { userId: string } | undefined;
  result: ProductMarketplaceCopyDebrandBatchJobResult;
};

const processBatchProduct = async (input: ProcessBatchProductInput): Promise<void> => {
  const {
    data,
    integration,
    integrationNameById,
    jobId,
    options,
    productId,
    result,
  } = input;
  try {
    const product = await productService.getProductById(productId);
    if (!product) {
      result.failed += 1;
      await ErrorSystem.logWarning('Product not found for marketplace copy debrand batch', {
        service: LOG_SERVICE,
        jobId,
        productId,
      });
      return;
    }

    const initialResolution = ensureProductMarketplaceCopyOverrideForIntegration(
      product,
      integration.id
    );
    const productForRun = initialResolution.created
      ? await productService.updateProduct(
          product.id,
          { marketplaceContentOverrides: initialResolution.marketplaceContentOverrides },
          options
        )
      : product;
    const rowResolution = initialResolution.created
      ? ensureProductMarketplaceCopyOverrideForIntegration(productForRun, integration.id)
      : initialResolution;

    result.overridesCreated += initialResolution.created ? 1 : 0;
    result.overridesAlreadyExisted += initialResolution.created ? 0 : 1;
    await enqueueMarketplaceCopyDebrandRun({
      product: productForRun,
      integration,
      row: rowResolution.row,
      rowIndex: rowResolution.rowIndex,
      userId: data.userId,
      integrationNameById,
    });
    result.debrandRunsQueued += 1;
  } catch (error) {
    result.failed += 1;
    await ErrorSystem.captureException(error, {
      service: LOG_SERVICE,
      action: 'processProduct',
      jobId,
      productId,
      integrationId: data.integrationId,
    });
  }
};

const updateBatchProgress = async (input: {
  helpers?: { updateProgress: (progress: unknown) => Promise<void> };
  result: ProductMarketplaceCopyDebrandBatchJobResult;
  total: number;
}): Promise<void> => {
  await input.helpers?.updateProgress({
    processed: input.result.processed,
    total: input.total,
    debrandRunsQueued: input.result.debrandRunsQueued,
    failed: input.result.failed,
  });
};

export const processProductMarketplaceCopyDebrandBatchJob = async (
  data: ProductMarketplaceCopyDebrandBatchJobData,
  jobId: string,
  helpers?: { updateProgress: (progress: unknown) => Promise<void> }
): Promise<ProductMarketplaceCopyDebrandBatchJobResult> => {
  const productIds = uniqueProductIds(data.productIds);
  const integration = await resolveMarketplaceCopyDebrandIntegration(data.integrationId);
  const integrationNameById = await buildIntegrationNameMap(integration);
  const options = buildProductServiceOptions(data.userId);
  const result: ProductMarketplaceCopyDebrandBatchJobResult = {
    requested: productIds.length,
    processed: 0,
    overridesCreated: 0,
    overridesAlreadyExisted: 0,
    debrandRunsQueued: 0,
    failed: 0,
  };

  await productIds.reduce<Promise<void>>(async (previous, productId) => {
    await previous;
    await processBatchProduct({
      productId,
      jobId,
      data,
      integration,
      integrationNameById,
      options,
      result,
    });
    result.processed += 1;
    await updateBatchProgress({ helpers, result, total: productIds.length });
  }, Promise.resolve());

  if (result.overridesCreated > 0) {
    emitProductCacheInvalidation();
  }

  await ErrorSystem.logInfo('Marketplace copy debrand batch completed', {
    service: LOG_SERVICE,
    jobId,
    integrationId: integration.id,
    integrationSlug: integration.slug,
    ...result,
  });

  return result;
};

const queue: ManagedQueue<ProductMarketplaceCopyDebrandBatchJobData> =
  createManagedQueue<ProductMarketplaceCopyDebrandBatchJobData>({
    name: PRODUCT_MARKETPLACE_COPY_DEBRAND_BATCH_QUEUE_NAME,
    concurrency: 1,
    jobTimeoutMs: 30 * 60 * 1000,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    },
    processor: async (
      data: ProductMarketplaceCopyDebrandBatchJobData,
      jobId: string,
      _signal,
      helpers
    ) => processProductMarketplaceCopyDebrandBatchJob(data, jobId, helpers),
    onCompleted: async (
      jobId: string,
      result: unknown,
      data: ProductMarketplaceCopyDebrandBatchJobData
    ) => {
      await ErrorSystem.logInfo('Marketplace copy debrand batch job completed', {
        service: LOG_SERVICE,
        jobId,
        integrationId: data.integrationId,
        result,
      });
    },
    onFailed: async (
      jobId: string,
      error: Error,
      data: ProductMarketplaceCopyDebrandBatchJobData
    ) => {
      await ErrorSystem.captureException(error, {
        service: LOG_SERVICE,
        jobId,
        integrationId: data.integrationId,
      });
    },
  });

const assertRedisRuntimeAvailable = async (): Promise<void> => {
  if (!isRedisAvailable()) {
    throw serviceUnavailableError(
      'Marketplace copy debrand batch requires Redis runtime. Configure Redis and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_MARKETPLACE_COPY_DEBRAND_BATCH_QUEUE_NAME }
    );
  }
  if ((await isRedisReachable()) === false) {
    throw serviceUnavailableError(
      'Marketplace copy debrand batch Redis runtime is unreachable. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_MARKETPLACE_COPY_DEBRAND_BATCH_QUEUE_NAME }
    );
  }
};

export const startProductMarketplaceCopyDebrandBatchQueue = (): void => {
  queue.startWorker();
};

export const stopProductMarketplaceCopyDebrandBatchQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueProductMarketplaceCopyDebrandBatchJob = async (
  data: ProductMarketplaceCopyDebrandBatchJobData
): Promise<string> => {
  await assertRedisRuntimeAvailable();
  const jobId = `marketplace-copy-debrand:${Date.now()}:${randomUUID()}`;
  const queuedJobId = await queue.enqueue(data, { jobId });
  await ErrorSystem.logInfo('Marketplace copy debrand batch job queued', {
    service: LOG_SERVICE,
    jobId: queuedJobId,
    requested: data.productIds.length,
    integrationId: data.integrationId,
    userId: data.userId,
  });
  return queuedJobId;
};
