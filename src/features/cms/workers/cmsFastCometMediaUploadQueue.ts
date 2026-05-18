import 'server-only';

import fs from 'fs/promises';

import type { ImageFileRecord } from '@/shared/contracts/files';
import { serviceUnavailableError } from '@/shared/errors/app-error';
import {
  MILKBAR_CMS_VISUALISATION_FOLDER,
} from '@/shared/lib/files/constants';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
import { getCmsBuilderImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import {
  getPublicPathFromStoredPath,
  uploadToConfiguredStorage,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { writeMilkbarFastCometPublicHtmlMirrorFile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-public-html-mirror';
import { resolveMilkbarFastCometStorageProfile } from '@/shared/lib/files/services/storage/milkbar-fastcomet-storage';
import {
  createManagedQueue,
  isRedisAvailable,
  isRedisReachable,
  type ManagedQueue,
  type QueueHealthStatus,
} from '@/shared/lib/queue';
import { waitForManagedQueueJobResult } from '@/shared/lib/queue/wait-for-managed-job';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME = 'cms-fastcomet-media-upload';

export type CmsFastCometMediaUploadJobData = {
  folder: string;
  imageFileId: string;
  mimetype: string;
  publicPath: string;
  requestedAt: string;
};

const QUEUE_UNAVAILABLE_RETRY_AFTER_MS = 3_000;
const WAIT_FOR_UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;

const isWorkerHealthReady = (health: QueueHealthStatus): boolean =>
  health.deliveryMode === 'queue' &&
  health.redisAvailable !== false &&
  health.workerLocal === true &&
  health.healthy !== false;

export const assertCmsFastCometMediaUploadRedisRuntime = async (): Promise<void> => {
  if (!isRedisAvailable()) {
    throw serviceUnavailableError(
      'CMS FastComet media uploads require Redis runtime. Configure Redis and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME }
    );
  }
  if ((await isRedisReachable()) === false) {
    throw serviceUnavailableError(
      'CMS FastComet media upload Redis runtime is unreachable. Please retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { queue: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME }
    );
  }
};

const readRecordText = (
  record: Record<string, unknown> | null | undefined,
  key: string
): string | null => {
  const value = record?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveUploadPublicPath = (imageFile: ImageFileRecord, fallback: string): string => {
  const metadataPath = readRecordText(imageFile.metadata, 'publicPath');
  if (metadataPath !== null) return metadataPath;
  return getPublicPathFromStoredPath(imageFile.filepath) ?? fallback;
};

const resolveUploadMimetype = (imageFile: ImageFileRecord, fallback: string): string => {
  const imageFileMimetype = imageFile.mimetype.trim();
  if (imageFileMimetype.length > 0) return imageFileMimetype;
  const fallbackMimetype = fallback.trim();
  return fallbackMimetype.length > 0 ? fallbackMimetype : 'application/octet-stream';
};

export const processCmsFastCometMediaUploadJob = async (
  data: CmsFastCometMediaUploadJobData
): Promise<ImageFileRecord> => {
  const repository = await getCmsBuilderImageFileRepository();
  const imageFile = await repository.getImageFileById(data.imageFileId);
  if (imageFile === null) {
    throw serviceUnavailableError('CMS media upload record was not found.', undefined, {
      imageFileId: data.imageFileId,
      queue: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME,
    });
  }

  const publicPath = resolveUploadPublicPath(imageFile, data.publicPath);
  const diskPath = getDiskPathFromPublicPath(publicPath);
  const buffer = await fs.readFile(diskPath);
  const milkbarStorage = resolveMilkbarFastCometStorageProfile();
  const storageResult = await uploadToConfiguredStorage({
    buffer,
    filename: imageFile.filename,
    mimetype: resolveUploadMimetype(imageFile, data.mimetype),
    publicPath,
    category: 'cms',
    projectId: null,
    folder: data.folder.trim() !== '' ? data.folder : MILKBAR_CMS_VISUALISATION_FOLDER,
    forceSource: 'fastcomet',
    fastCometBaseUrl: milkbarStorage.publicBaseUrl,
    fastCometConfig: milkbarStorage.fastCometConfig,
    writeLocalCopy: async (): Promise<void> => {
      // The file was staged locally before the Redis job was queued.
    },
  });

  await writeMilkbarFastCometPublicHtmlMirrorFile(publicPath, buffer);

  const updated = await repository.updateImageFile(data.imageFileId, {
    filepath: storageResult.filepath,
    publicUrl: storageResult.filepath,
    url: storageResult.filepath,
    storageProvider: 'fastcomet',
    metadata: {
      ...(imageFile.metadata ?? {}),
      fastCometUploadStatus: 'completed',
      mirroredLocally: true,
      publicBaseUrl: milkbarStorage.publicBaseUrl,
      publicPath,
      storageProfile: 'milkbarCms',
      storageSource: 'fastcomet',
      uploadedToFastCometAt: new Date().toISOString(),
    },
  });

  if (updated === null) {
    throw serviceUnavailableError('CMS media upload record could not be updated.', undefined, {
      imageFileId: data.imageFileId,
      queue: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME,
    });
  }

  return updated;
};

const queue: ManagedQueue<CmsFastCometMediaUploadJobData> =
  createManagedQueue<CmsFastCometMediaUploadJobData>({
    name: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME,
    concurrency: 1,
    jobTimeoutMs: WAIT_FOR_UPLOAD_TIMEOUT_MS,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: false,
    },
    processor: processCmsFastCometMediaUploadJob,
    onFailed: async (
      jobId: string,
      error: Error,
      data: CmsFastCometMediaUploadJobData
    ) => {
      await ErrorSystem.captureException(error, {
        service: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME,
        jobId,
        imageFileId: data.imageFileId,
      });
    },
  });

const assertWorkerReady = async (): Promise<void> => {
  startCmsFastCometMediaUploadQueue();
  const health = await queue.getHealthStatus();
  if (isWorkerHealthReady(health)) return;
  throw serviceUnavailableError(
    'CMS FastComet media upload Redis worker did not start. Please retry.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      health,
      queue: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME,
    }
  );
};

export const startCmsFastCometMediaUploadQueue = (): void => {
  queue.startWorker();
};

export const enqueueCmsFastCometMediaUploadJob = async (
  data: CmsFastCometMediaUploadJobData
): Promise<string> => {
  await assertCmsFastCometMediaUploadRedisRuntime();
  await assertWorkerReady();
  return queue.enqueue(data);
};

export const uploadCmsFastCometMediaInRedisRuntime = async (
  data: CmsFastCometMediaUploadJobData
): Promise<ImageFileRecord> => {
  const jobId = await enqueueCmsFastCometMediaUploadJob(data);
  return waitForManagedQueueJobResult<CmsFastCometMediaUploadJobData, ImageFileRecord>(
    queue,
    {
      jobId,
      queueName: CMS_FASTCOMET_MEDIA_UPLOAD_QUEUE_NAME,
      timeoutMs: WAIT_FOR_UPLOAD_TIMEOUT_MS,
    }
  );
};
