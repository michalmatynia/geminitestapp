import 'server-only';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import {
  AppErrorCodes,
  createAppError,
  databaseError,
  isAppError,
  notFoundError,
  serviceUnavailableError,
} from '@/shared/errors/app-error';
import {
  isLocalDatabaseConnectionRefused,
  LOCAL_DATABASE_SERVER_UNAVAILABLE_MESSAGE,
} from '@/shared/errors/database-error-guidance';
import {
  createManagedQueue,
  isRedisAvailable,
  isRedisReachable,
  type ManagedQueue,
  type QueueHealthStatus,
} from '@/shared/lib/queue';
import { waitForManagedQueueJobResult } from '@/shared/lib/queue/wait-for-managed-job';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { uploadMilkbarAsset3DToFastComet } from '../utils/asset3dUploader';

export const MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME =
  'milkbar-asset3d-fastcomet-upload';

export type MilkbarAsset3DFastCometUploadJobData = {
  assetId: string;
  requestedAt: string;
};

const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
const WAIT_FOR_UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;

const createMilkbarFastCometPublishError = (
  error: unknown,
  data: MilkbarAsset3DFastCometUploadJobData
): Error => {
  const meta = {
    assetId: data.assetId,
    queue: MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME,
  };
  if (isAppError(error)) {
    return error.withMeta(meta);
  }
  if (isLocalDatabaseConnectionRefused(error)) {
    return databaseError(LOCAL_DATABASE_SERVER_UNAVAILABLE_MESSAGE, error, meta);
  }

  const causeMessage = error instanceof Error ? error.message.trim() : String(error).trim();
  const message =
    causeMessage.length > 0
      ? `FastComet rejected the Milkbar 3D model upload: ${causeMessage}`
      : 'FastComet rejected the Milkbar 3D model upload. The model was kept locally; try Save CMS again after checking the FastComet upload endpoint.';

  return createAppError(message, {
    code: AppErrorCodes.externalService,
    httpStatus: 502,
    expected: true,
    retryable: true,
    cause: error,
    meta,
  });
};

const isWorkerHealthReady = (health: QueueHealthStatus): boolean =>
  health.deliveryMode === 'queue' &&
  health.redisAvailable !== false &&
  health.workerLocal === true &&
  health.healthy !== false;

export const assertMilkbarAsset3DFastCometUploadRedisRuntime = async (): Promise<void> => {
  if (!isRedisAvailable()) {
    throw serviceUnavailableError(
      'Milkbar 3D asset FastComet uploads require Redis runtime. Configure Redis and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME }
    );
  }
  if ((await isRedisReachable()) === false) {
    throw serviceUnavailableError(
      'Milkbar 3D asset FastComet upload Redis runtime is unreachable. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME }
    );
  }
};

export const processMilkbarAsset3DFastCometUploadJob = async (
  data: MilkbarAsset3DFastCometUploadJobData
): Promise<Asset3DRecord> => {
  const asset = await uploadMilkbarAsset3DToFastComet(data.assetId);
  if (asset === null) {
    throw notFoundError('3D asset not found', { id: data.assetId });
  }
  return asset;
};

const queue: ManagedQueue<MilkbarAsset3DFastCometUploadJobData> =
  createManagedQueue<MilkbarAsset3DFastCometUploadJobData>({
    name: MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME,
    concurrency: 1,
    jobTimeoutMs: WAIT_FOR_UPLOAD_TIMEOUT_MS,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: false,
    },
    processor: processMilkbarAsset3DFastCometUploadJob,
    onFailed: async (
      jobId: string,
      error: Error,
      data: MilkbarAsset3DFastCometUploadJobData
    ) => {
      await ErrorSystem.captureException(error, {
        service: MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME,
        assetId: data.assetId,
        jobId,
      });
    },
  });

const assertWorkerReady = async (): Promise<void> => {
  startMilkbarAsset3DFastCometUploadQueue();
  const health = await queue.getHealthStatus();
  if (isWorkerHealthReady(health)) return;
  throw serviceUnavailableError(
    'Milkbar 3D asset FastComet upload Redis worker did not start. Please retry.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      health,
      queue: MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME,
    }
  );
};

export const startMilkbarAsset3DFastCometUploadQueue = (): void => {
  queue.startWorker();
};

export const enqueueMilkbarAsset3DFastCometUploadJob = async (
  data: MilkbarAsset3DFastCometUploadJobData
): Promise<string> => {
  await assertMilkbarAsset3DFastCometUploadRedisRuntime();
  await assertWorkerReady();
  return queue.enqueue(data);
};

export const uploadMilkbarAsset3DInRedisRuntime = async (
  data: MilkbarAsset3DFastCometUploadJobData
): Promise<Asset3DRecord> => {
  const jobId = await enqueueMilkbarAsset3DFastCometUploadJob(data);
  try {
    return await waitForManagedQueueJobResult<
      MilkbarAsset3DFastCometUploadJobData,
      Asset3DRecord
    >(queue, {
      jobId,
      queueName: MILKBAR_ASSET3D_FASTCOMET_UPLOAD_QUEUE_NAME,
      timeoutMs: WAIT_FOR_UPLOAD_TIMEOUT_MS,
    });
  } catch (error) {
    throw createMilkbarFastCometPublishError(error, data);
  }
};
