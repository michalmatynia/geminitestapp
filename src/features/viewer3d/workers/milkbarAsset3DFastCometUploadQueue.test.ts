import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { AppErrorCodes, createAppError } from '@/shared/errors/app-error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const queueMock = {
    enqueue: vi.fn(),
    getHealthStatus: vi.fn(),
    getQueue: vi.fn(),
    processInline: vi.fn(),
    startWorker: vi.fn(),
    stopWorker: vi.fn(),
  };

  return {
    captureExceptionMock: vi.fn(),
    createManagedQueueMock: vi.fn(() => queueMock),
    isRedisAvailableMock: vi.fn(),
    isRedisReachableMock: vi.fn(),
    queueMock,
    uploadMilkbarAsset3DToFastCometMock: vi.fn(),
    waitForManagedQueueJobResultMock: vi.fn(),
  };
});

vi.mock('server-only', () => ({}));

vi.mock('@/features/viewer3d/utils/asset3dUploader', () => ({
  uploadMilkbarAsset3DToFastComet: (...args: unknown[]) =>
    mocks.uploadMilkbarAsset3DToFastCometMock(...args),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: (...args: unknown[]) => mocks.createManagedQueueMock(...args),
  isRedisAvailable: (...args: unknown[]) => mocks.isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => mocks.isRedisReachableMock(...args),
}));

vi.mock('@/shared/lib/queue/wait-for-managed-job', () => ({
  waitForManagedQueueJobResult: (...args: unknown[]) =>
    mocks.waitForManagedQueueJobResultMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import {
  processMilkbarAsset3DFastCometUploadJob,
  uploadMilkbarAsset3DInRedisRuntime,
} from './milkbarAsset3DFastCometUploadQueue';

const createAsset = (overrides: Partial<Asset3DRecord> = {}): Asset3DRecord => ({
  categoryId: null,
  createdAt: new Date('2026-05-19T00:00:00.000Z'),
  description: null,
  id: 'asset-1',
  name: 'Milkbar model',
  updatedAt: new Date('2026-05-19T00:00:00.000Z'),
  ...overrides,
});

const readyQueueHealth = {
  activeCount: 0,
  completedCount: 0,
  deliveryMode: 'queue',
  failedCount: 0,
  healthy: true,
  processing: false,
  redisAvailable: true,
  running: true,
  waitingCount: 0,
  workerLocal: true,
  workerState: 'idle',
};

describe('milkbarAsset3DFastCometUploadQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
    mocks.queueMock.enqueue.mockResolvedValue('upload-job-1');
    mocks.queueMock.getHealthStatus.mockResolvedValue(readyQueueHealth);
    mocks.uploadMilkbarAsset3DToFastCometMock.mockResolvedValue(createAsset());
    mocks.waitForManagedQueueJobResultMock.mockResolvedValue(createAsset());
  });

  it('uploads Milkbar assets through the FastComet upload path', async () => {
    const result = await processMilkbarAsset3DFastCometUploadJob({
      assetId: 'asset-1',
      requestedAt: '2026-05-19T00:00:00.000Z',
    });

    expect(mocks.uploadMilkbarAsset3DToFastCometMock).toHaveBeenCalledWith('asset-1');
    expect(result.id).toBe('asset-1');
  });

  it('wraps failed FastComet publish jobs with the worker failure reason', async () => {
    const workerError = new Error('Failed to upload file to remote storage (FastComet)');
    mocks.waitForManagedQueueJobResultMock.mockRejectedValueOnce(workerError);

    let caught: unknown = null;
    try {
      await uploadMilkbarAsset3DInRedisRuntime({
        assetId: 'asset-1',
        requestedAt: '2026-05-19T00:00:00.000Z',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({
      cause: workerError,
      code: 'EXTERNAL_SERVICE_ERROR',
      expected: true,
      httpStatus: 502,
      message:
        'FastComet rejected the Milkbar 3D model upload: Failed to upload file to remote storage (FastComet)',
      meta: {
        assetId: 'asset-1',
        queue: 'milkbar-asset3d-fastcomet-upload',
      },
      retryable: true,
    });
  });

  it('preserves app errors from the FastComet upload worker', async () => {
    const workerError = createAppError(
      'FastComet upload completed, but the public model URL is not reachable. Confirm uploads.milkbardesigners.com points at the document root that contains /uploads.',
      {
        code: AppErrorCodes.externalService,
        expected: false,
        httpStatus: 502,
        meta: { status: 404 },
        retryable: true,
      }
    );
    mocks.waitForManagedQueueJobResultMock.mockRejectedValueOnce(workerError);

    let caught: unknown = null;
    try {
      await uploadMilkbarAsset3DInRedisRuntime({
        assetId: 'asset-1',
        requestedAt: '2026-05-19T00:00:00.000Z',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: 'EXTERNAL_SERVICE_ERROR',
      message:
        'FastComet upload completed, but the public model URL is not reachable. Confirm uploads.milkbardesigners.com points at the document root that contains /uploads.',
      meta: {
        assetId: 'asset-1',
        queue: 'milkbar-asset3d-fastcomet-upload',
        status: 404,
      },
    });
  });

  it('reports local database startup guidance when the upload worker cannot reach local MongoDB', async () => {
    const workerError = Object.assign(
      new Error('connect ECONNREFUSED 127.0.0.1:27020'),
      {
        name: 'MongoServerSelectionError',
        cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:27020'), {
          address: '127.0.0.1',
          code: 'ECONNREFUSED',
          port: 27020,
        }),
      }
    );
    mocks.waitForManagedQueueJobResultMock.mockRejectedValueOnce(workerError);

    let caught: unknown = null;
    try {
      await uploadMilkbarAsset3DInRedisRuntime({
        assetId: 'asset-1',
        requestedAt: '2026-05-19T00:00:00.000Z',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: 'DATABASE_ERROR',
      message:
        'Database connection failed because the local database server is not running. Start the database server and try again.',
      meta: {
        assetId: 'asset-1',
        queue: 'milkbar-asset3d-fastcomet-upload',
      },
    });
  });
});
