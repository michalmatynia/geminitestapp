import 'server-only';

import { randomUUID } from 'node:crypto';

import { CachedProductService } from '@/features/products/performance/cached-service';
import {
  isFastCometImageFile,
  loadProduct,
  requireFastCometConfigured,
  resolveLinkedImageFile,
  toImageFileSelection,
} from '@/app/api/v2/products/[id]/images/upload-to-fastcomet/handler.execution';
import { uploadLinkedImageFileToFastComet } from '@/app/api/v2/products/[id]/images/upload-to-fastcomet/handler.linked-upload';
import { serviceUnavailableError } from '@/shared/errors/app-error';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { createManagedQueue, isRedisAvailable, isRedisReachable } from '@/shared/lib/queue';
import type { ManagedQueue, QueueHealthStatus } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME = 'product-fastcomet-image-upload';

export type ProductFastCometImageUploadJobData = {
  productId: string;
  imageFileId: string;
  imageSlotIndex?: number | undefined;
  requestedAt: string;
  userId?: string | null | undefined;
};

export type ProductFastCometImageUploadJobResult = {
  status: 'ok';
  alreadyUploaded?: boolean | undefined;
  imageFile: ReturnType<typeof toImageFileSelection>;
  product: Awaited<ReturnType<typeof loadProduct>>;
  publicPath?: string | undefined;
  remoteUrl?: string | undefined;
};

const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
const LOG_SERVICE = 'product-fastcomet-image-upload-queue';
const JOB_ID_SEPARATOR = '__';

const buildJobId = (data: Pick<ProductFastCometImageUploadJobData, 'productId' | 'imageFileId'>): string =>
  [
    'product-fastcomet-image-upload',
    encodeURIComponent(data.productId),
    encodeURIComponent(data.imageFileId),
    randomUUID(),
  ].join(JOB_ID_SEPARATOR);

const isWorkerHealthReady = (health: QueueHealthStatus): boolean =>
  health.deliveryMode === 'queue' &&
  health.redisAvailable !== false &&
  health.workerLocal === true &&
  health.healthy !== false;

export const assertProductFastCometImageUploadRedisRuntime = async (): Promise<void> => {
  if (!isRedisAvailable()) {
    throw serviceUnavailableError(
      'Product FastComet image uploads require Redis runtime. Configure Redis and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME }
    );
  }
  if ((await isRedisReachable()) === false) {
    throw serviceUnavailableError(
      'Product FastComet image upload Redis runtime is unreachable. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME }
    );
  }
};

export const processProductFastCometImageUploadJob = async (
  data: ProductFastCometImageUploadJobData
): Promise<ProductFastCometImageUploadJobResult> => {
  await requireFastCometConfigured();
  const productRepo = await getProductRepository();
  const product = await loadProduct(productRepo, data.productId);
  const linkedImageFile = resolveLinkedImageFile(
    product,
    data.imageFileId,
    data.imageSlotIndex
  );

  if (isFastCometImageFile(linkedImageFile)) {
    return {
      status: 'ok',
      imageFile: toImageFileSelection(linkedImageFile),
      product,
      alreadyUploaded: true,
    };
  }

  const result = await uploadLinkedImageFileToFastComet({
    linkedImageFile,
    product,
    productId: data.productId,
    productRepo,
  });
  CachedProductService.invalidateProduct(data.productId);

  return {
    status: 'ok',
    imageFile: toImageFileSelection(result.imageFile),
    product: result.product,
    publicPath: result.publicPath,
    remoteUrl: result.remoteUrl,
  };
};

const queue: ManagedQueue<ProductFastCometImageUploadJobData> =
  createManagedQueue<ProductFastCometImageUploadJobData>({
    name: PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME,
    concurrency: 1,
    jobTimeoutMs: 2 * 60 * 1000,
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: 100,
      removeOnFail: false,
    },
    processor: async (data: ProductFastCometImageUploadJobData) =>
      processProductFastCometImageUploadJob(data),
    onCompleted: async (
      jobId: string,
      result: unknown,
      data: ProductFastCometImageUploadJobData
    ) => {
      await ErrorSystem.logInfo('Product FastComet image upload completed', {
        service: LOG_SERVICE,
        jobId,
        productId: data.productId,
        imageFileId: data.imageFileId,
        result,
      });
    },
    onFailed: async (
      jobId: string,
      error: Error,
      data: ProductFastCometImageUploadJobData
    ) => {
      await ErrorSystem.captureException(error, {
        service: LOG_SERVICE,
        jobId,
        productId: data.productId,
        imageFileId: data.imageFileId,
      });
    },
  });

const assertWorkerReady = async (): Promise<void> => {
  startProductFastCometImageUploadQueue();
  const health = await queue.getHealthStatus();
  if (isWorkerHealthReady(health)) return;
  throw serviceUnavailableError(
    'Product FastComet image upload Redis worker did not start. Please retry.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      health,
      queue: PRODUCT_FASTCOMET_IMAGE_UPLOAD_QUEUE_NAME,
    }
  );
};

export const startProductFastCometImageUploadQueue = (): void => {
  queue.startWorker();
};

export const stopProductFastCometImageUploadQueue = async (): Promise<void> => {
  await queue.stopWorker();
};

export const enqueueProductFastCometImageUploadJob = async (
  data: ProductFastCometImageUploadJobData
): Promise<string> => {
  await assertProductFastCometImageUploadRedisRuntime();
  await assertWorkerReady();
  const jobId = buildJobId(data);
  const queuedJobId = await queue.enqueue(data, { jobId });
  await ErrorSystem.logInfo('Product FastComet image upload queued', {
    service: LOG_SERVICE,
    jobId: queuedJobId,
    productId: data.productId,
    imageFileId: data.imageFileId,
    imageSlotIndex: data.imageSlotIndex ?? null,
    userId: data.userId ?? null,
  });
  return queuedJobId;
};
