import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

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
    deleteAsset3DMock: vi.fn(),
    findAsset3DRepositoryAssetMock: vi.fn(),
    isRedisAvailableMock: vi.fn(),
    isRedisReachableMock: vi.fn(),
    queueMock,
    waitForManagedQueueJobResultMock: vi.fn(),
  };
});

vi.mock('@/features/viewer3d/services/asset3d-repository', () => ({
  findAsset3DRepositoryAsset: (...args: unknown[]) =>
    mocks.findAsset3DRepositoryAssetMock(...args),
}));

vi.mock('@/features/viewer3d/utils/asset3dUploader', () => ({
  deleteAsset3D: (...args: unknown[]) => mocks.deleteAsset3DMock(...args),
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
  deleteMilkbarAsset3DInRedisRuntime,
  enqueueMilkbarAsset3DDeleteJob,
  isMilkbarAsset3DRecord,
  processMilkbarAsset3DDeleteJob,
} from './milkbarAsset3DDeleteQueue';

const createAsset = (overrides: Partial<Asset3DRecord> = {}): Asset3DRecord => ({
  categoryId: null,
  createdAt: new Date('2026-05-18T00:00:00.000Z'),
  description: null,
  id: 'asset-1',
  name: 'Milkbar model',
  updatedAt: new Date('2026-05-18T00:00:00.000Z'),
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

describe('milkbarAsset3DDeleteQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteAsset3DMock.mockResolvedValue(true);
    mocks.findAsset3DRepositoryAssetMock.mockResolvedValue({
      asset: createAsset({
        metadata: { storageProfile: 'milkbarCms' },
      }),
      repository: {},
    });
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
    mocks.queueMock.enqueue.mockResolvedValue('delete-job-1');
    mocks.queueMock.getHealthStatus.mockResolvedValue(readyQueueHealth);
    mocks.waitForManagedQueueJobResultMock.mockResolvedValue({
      assetId: 'asset-1',
      status: 'deleted',
    });
  });

  it('recognizes Milkbar assets by storage profile and model paths', () => {
    expect(
      isMilkbarAsset3DRecord(createAsset({ metadata: { storageProfile: 'milkbarCms' } }))
    ).toBe(true);
    expect(
      isMilkbarAsset3DRecord(createAsset({ filepath: '/uploads/cms/models/model.glb' }))
    ).toBe(true);
    expect(
      isMilkbarAsset3DRecord(createAsset({ fileUrl: '/uploads/cms/models/model.glb' }))
    ).toBe(true);
    expect(isMilkbarAsset3DRecord(createAsset({ filepath: '/uploads/assets3d/model.glb' }))).toBe(false);
  });

  it('deletes Milkbar assets through the existing asset deletion path', async () => {
    const result = await processMilkbarAsset3DDeleteJob({
      assetId: 'asset-1',
      requestedAt: '2026-05-18T00:00:00.000Z',
    });

    expect(mocks.findAsset3DRepositoryAssetMock).toHaveBeenCalledWith('asset-1');
    expect(mocks.deleteAsset3DMock).toHaveBeenCalledWith('asset-1');
    expect(result).toEqual({
      assetId: 'asset-1',
      status: 'deleted',
    });
  });

  it('processes legacy Milkbar model path records without storage profile metadata', async () => {
    mocks.findAsset3DRepositoryAssetMock.mockResolvedValueOnce({
      asset: createAsset({
        filepath: 'https://uploads.milkbardesigners.com/uploads/cms/models/legacy.glb',
      }),
      repository: {},
    });

    const result = await processMilkbarAsset3DDeleteJob({
      assetId: 'legacy-asset',
      requestedAt: '2026-05-18T00:00:00.000Z',
    });

    expect(mocks.deleteAsset3DMock).toHaveBeenCalledWith('legacy-asset');
    expect(result).toEqual({
      assetId: 'legacy-asset',
      status: 'deleted',
    });
  });

  it('refuses to delete non-Milkbar assets in the Milkbar Redis runtime', async () => {
    mocks.findAsset3DRepositoryAssetMock.mockResolvedValueOnce({
      asset: createAsset({ metadata: { storageProfile: 'default' } }),
      repository: {},
    });

    await expect(
      processMilkbarAsset3DDeleteJob({
        assetId: 'asset-1',
        requestedAt: '2026-05-18T00:00:00.000Z',
      })
    ).rejects.toThrow('Only Milkbar CMS 3D assets can be deleted');

    expect(mocks.deleteAsset3DMock).not.toHaveBeenCalled();
  });

  it('requires Redis and a local worker before enqueueing delete jobs', async () => {
    const jobId = await enqueueMilkbarAsset3DDeleteJob({
      assetId: 'asset-1',
      requestedAt: '2026-05-18T00:00:00.000Z',
    });

    expect(jobId).toBe('delete-job-1');
    expect(mocks.isRedisReachableMock).toHaveBeenCalledTimes(1);
    expect(mocks.queueMock.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.queueMock.enqueue).toHaveBeenCalledWith({
      assetId: 'asset-1',
      requestedAt: '2026-05-18T00:00:00.000Z',
    });
  });

  it('waits for the Redis delete job to complete', async () => {
    const result = await deleteMilkbarAsset3DInRedisRuntime({
      assetId: 'asset-1',
      requestedAt: '2026-05-18T00:00:00.000Z',
    });

    expect(mocks.waitForManagedQueueJobResultMock).toHaveBeenCalledWith(
      mocks.queueMock,
      expect.objectContaining({
        jobId: 'delete-job-1',
        queueName: 'milkbar-asset3d-delete',
      })
    );
    expect(result).toEqual({
      assetId: 'asset-1',
      status: 'deleted',
    });
  });
});
