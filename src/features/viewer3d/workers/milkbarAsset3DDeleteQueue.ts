import 'server-only';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { badRequestError, notFoundError, serviceUnavailableError } from '@/shared/errors/app-error';
import {
  createManagedQueue,
  isRedisAvailable,
  isRedisReachable,
  type ManagedQueue,
  type QueueHealthStatus,
} from '@/shared/lib/queue';
import { waitForManagedQueueJobResult } from '@/shared/lib/queue/wait-for-managed-job';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { findAsset3DRepositoryAsset } from '../services/asset3d-repository';
import { deleteAsset3D } from '../utils/asset3dUploader';

export const MILKBAR_ASSET3D_DELETE_QUEUE_NAME = 'milkbar-asset3d-delete';

export type MilkbarAsset3DDeleteJobData = {
  assetId: string;
  requestedAt: string;
};

export type MilkbarAsset3DDeleteJobResult = {
  assetId: string;
  status: 'deleted';
};

const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
const WAIT_FOR_DELETE_TIMEOUT_MS = 2 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readMetadataText = (
  metadata: Asset3DRecord['metadata'],
  key: string
): string | null => {
  if (!isRecord(metadata)) return null;
  const value = metadata[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isMilkbarModelPath = (value: unknown): boolean =>
  typeof value === 'string' && value.includes('/uploads/cms/models/');

export const isMilkbarAsset3DRecord = (
  asset: Asset3DRecord | null | undefined
): asset is Asset3DRecord => {
  if (asset === null || asset === undefined) return false;
  if (readMetadataText(asset.metadata, 'storageProfile') === 'milkbarCms') return true;
  return isMilkbarModelPath(asset.filepath) || isMilkbarModelPath(asset.fileUrl);
};

const isWorkerHealthReady = (health: QueueHealthStatus): boolean =>
  health.deliveryMode === 'queue' &&
  health.redisAvailable !== false &&
  health.workerLocal === true &&
  health.healthy !== false;

export const assertMilkbarAsset3DDeleteRedisRuntime = async (): Promise<void> => {
  if (!isRedisAvailable()) {
    throw serviceUnavailableError(
      'Milkbar 3D asset deletes require Redis runtime. Configure Redis and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: MILKBAR_ASSET3D_DELETE_QUEUE_NAME }
    );
  }
  if ((await isRedisReachable()) === false) {
    throw serviceUnavailableError(
      'Milkbar 3D asset delete Redis runtime is unreachable. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: MILKBAR_ASSET3D_DELETE_QUEUE_NAME }
    );
  }
};

export const processMilkbarAsset3DDeleteJob = async (
  data: MilkbarAsset3DDeleteJobData
): Promise<MilkbarAsset3DDeleteJobResult> => {
  const match = await findAsset3DRepositoryAsset(data.assetId);
  if (match === null) {
    throw notFoundError('3D asset not found', { id: data.assetId });
  }
  if (!isMilkbarAsset3DRecord(match.asset)) {
    throw badRequestError('Only Milkbar CMS 3D assets can be deleted in this Redis runtime.', {
      id: data.assetId,
    });
  }

  const deleted = await deleteAsset3D(data.assetId);
  if (!deleted) {
    throw notFoundError('3D asset could not be deleted', { id: data.assetId });
  }
  return {
    assetId: data.assetId,
    status: 'deleted',
  };
};

const queue: ManagedQueue<MilkbarAsset3DDeleteJobData> =
  createManagedQueue<MilkbarAsset3DDeleteJobData>({
    name: MILKBAR_ASSET3D_DELETE_QUEUE_NAME,
    concurrency: 1,
    jobTimeoutMs: WAIT_FOR_DELETE_TIMEOUT_MS,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: false,
    },
    processor: processMilkbarAsset3DDeleteJob,
    onFailed: async (
      jobId: string,
      error: Error,
      data: MilkbarAsset3DDeleteJobData
    ) => {
      await ErrorSystem.captureException(error, {
        service: MILKBAR_ASSET3D_DELETE_QUEUE_NAME,
        assetId: data.assetId,
        jobId,
      });
    },
  });

const assertWorkerReady = async (): Promise<void> => {
  startMilkbarAsset3DDeleteQueue();
  const health = await queue.getHealthStatus();
  if (isWorkerHealthReady(health)) return;
  throw serviceUnavailableError(
    'Milkbar 3D asset delete Redis worker did not start. Please retry.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      health,
      queue: MILKBAR_ASSET3D_DELETE_QUEUE_NAME,
    }
  );
};

export const startMilkbarAsset3DDeleteQueue = (): void => {
  queue.startWorker();
};

export const enqueueMilkbarAsset3DDeleteJob = async (
  data: MilkbarAsset3DDeleteJobData
): Promise<string> => {
  await assertMilkbarAsset3DDeleteRedisRuntime();
  await assertWorkerReady();
  return queue.enqueue(data);
};

export const deleteMilkbarAsset3DInRedisRuntime = async (
  data: MilkbarAsset3DDeleteJobData
): Promise<MilkbarAsset3DDeleteJobResult> => {
  const jobId = await enqueueMilkbarAsset3DDeleteJob(data);
  return waitForManagedQueueJobResult<
    MilkbarAsset3DDeleteJobData,
    MilkbarAsset3DDeleteJobResult
  >(queue, {
    jobId,
    queueName: MILKBAR_ASSET3D_DELETE_QUEUE_NAME,
    timeoutMs: WAIT_FOR_DELETE_TIMEOUT_MS,
  });
};
