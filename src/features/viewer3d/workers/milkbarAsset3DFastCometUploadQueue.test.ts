import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
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

  it('wraps failed FastComet publish jobs with a user-facing retryable error', async () => {
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
        'FastComet rejected the Milkbar 3D model upload. The model was kept locally; try Save CMS again after checking the FastComet upload endpoint.',
      meta: {
        assetId: 'asset-1',
        queue: 'milkbar-asset3d-fastcomet-upload',
      },
      retryable: true,
    });
  });
});
