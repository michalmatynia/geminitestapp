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
    getProductRepositoryMock: vi.fn(),
    invalidateProductMock: vi.fn(),
    isFastCometImageFileMock: vi.fn(),
    isRedisAvailableMock: vi.fn(),
    isRedisReachableMock: vi.fn(),
    loadProductMock: vi.fn(),
    logInfoMock: vi.fn(),
    queueMock,
    requireFastCometConfiguredMock: vi.fn(),
    resolveLinkedImageFileMock: vi.fn(),
    toImageFileSelectionMock: vi.fn((imageFile: unknown) => imageFile),
    uploadLinkedImageFileToFastCometMock: vi.fn(),
  };
});

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateProduct: (...args: unknown[]) => mocks.invalidateProductMock(...args),
  },
}));

vi.mock('@/app/api/v2/products/[id]/images/upload-to-fastcomet/handler.execution', () => ({
  isFastCometImageFile: (...args: unknown[]) => mocks.isFastCometImageFileMock(...args),
  loadProduct: (...args: unknown[]) => mocks.loadProductMock(...args),
  requireFastCometConfigured: (...args: unknown[]) =>
    mocks.requireFastCometConfiguredMock(...args),
  resolveLinkedImageFile: (...args: unknown[]) => mocks.resolveLinkedImageFileMock(...args),
  toImageFileSelection: (...args: unknown[]) => mocks.toImageFileSelectionMock(...args),
}));

vi.mock('@/app/api/v2/products/[id]/images/upload-to-fastcomet/handler.linked-upload', () => ({
  uploadLinkedImageFileToFastComet: (...args: unknown[]) =>
    mocks.uploadLinkedImageFileToFastCometMock(...args),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: (...args: unknown[]) => mocks.getProductRepositoryMock(...args),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: (...args: unknown[]) => mocks.createManagedQueueMock(...args),
  isRedisAvailable: (...args: unknown[]) => mocks.isRedisAvailableMock(...args),
  isRedisReachable: (...args: unknown[]) => mocks.isRedisReachableMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
    logInfo: (...args: unknown[]) => mocks.logInfoMock(...args),
  },
}));

import {
  enqueueProductFastCometImageUploadJob,
  processProductFastCometImageUploadJob,
} from './productFastCometImageUploadQueue';

const product = {
  id: 'product-1',
  images: [],
};

const localImageFile = {
  id: 'image-file-1',
  filename: 'photo.webp',
  filepath: '/uploads/products/SKU/photo.webp',
  storageProvider: 'local',
};

const fastCometImageFile = {
  ...localImageFile,
  filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
  storageProvider: 'fastcomet',
};

describe('productFastCometImageUploadQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProductRepositoryMock.mockResolvedValue({ id: 'product-repo' });
    mocks.isFastCometImageFileMock.mockReturnValue(false);
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
    mocks.loadProductMock.mockResolvedValue(product);
    mocks.queueMock.enqueue.mockResolvedValue('queued-job-1');
    mocks.queueMock.getHealthStatus.mockResolvedValue({
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
    });
    mocks.requireFastCometConfiguredMock.mockResolvedValue(undefined);
    mocks.resolveLinkedImageFileMock.mockReturnValue(localImageFile);
    mocks.uploadLinkedImageFileToFastCometMock.mockResolvedValue({
      imageFile: fastCometImageFile,
      product,
      publicPath: '/uploads/products/SKU/photo.webp',
      remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
    });
  });

  it('requires Redis runtime before enqueueing image uploads', async () => {
    mocks.isRedisAvailableMock.mockReturnValue(false);

    await expect(
      enqueueProductFastCometImageUploadJob({
        imageFileId: 'image-file-1',
        imageSlotIndex: 0,
        productId: 'product-1',
        requestedAt: '2026-05-12T00:00:00.000Z',
        userId: null,
      })
    ).rejects.toThrow('Product FastComet image uploads require Redis runtime');

    expect(mocks.queueMock.startWorker).not.toHaveBeenCalled();
    expect(mocks.queueMock.enqueue).not.toHaveBeenCalled();
  });

  it('fails before enqueueing when the Redis worker is not ready', async () => {
    mocks.queueMock.getHealthStatus.mockResolvedValueOnce({
      activeCount: 0,
      completedCount: 0,
      deliveryMode: 'queue',
      failedCount: 0,
      healthy: false,
      processing: false,
      redisAvailable: true,
      running: false,
      waitingCount: 0,
      workerLocal: false,
      workerState: 'offline',
    });

    await expect(
      enqueueProductFastCometImageUploadJob({
        imageFileId: 'image-file-1',
        productId: 'product-1',
        requestedAt: '2026-05-12T00:00:00.000Z',
      })
    ).rejects.toThrow('Product FastComet image upload Redis worker did not start');

    expect(mocks.queueMock.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.queueMock.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues image uploads only after Redis and worker health pass', async () => {
    const jobId = await enqueueProductFastCometImageUploadJob({
      imageFileId: 'image-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
      requestedAt: '2026-05-12T00:00:00.000Z',
      userId: 'user-1',
    });

    expect(jobId).toBe('queued-job-1');
    expect(mocks.isRedisReachableMock).toHaveBeenCalled();
    expect(mocks.queueMock.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.queueMock.enqueue).toHaveBeenCalledWith(
      {
        imageFileId: 'image-file-1',
        imageSlotIndex: 0,
        productId: 'product-1',
        requestedAt: '2026-05-12T00:00:00.000Z',
        userId: 'user-1',
      },
      {
        jobId: expect.not.stringContaining(':'),
      }
    );
    expect(mocks.queueMock.enqueue.mock.calls[0]?.[1]).toEqual({
      jobId: expect.stringMatching(/^product-fastcomet-image-upload__/),
    });
  });

  it('processes a queued local image upload and invalidates the product cache', async () => {
    const result = await processProductFastCometImageUploadJob({
      imageFileId: 'image-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
      requestedAt: '2026-05-12T00:00:00.000Z',
    });

    expect(mocks.uploadLinkedImageFileToFastCometMock).toHaveBeenCalledWith({
      linkedImageFile: localImageFile,
      product,
      productId: 'product-1',
      productRepo: { id: 'product-repo' },
    });
    expect(mocks.invalidateProductMock).toHaveBeenCalledWith('product-1');
    expect(result).toEqual({
      status: 'ok',
      imageFile: fastCometImageFile,
      product,
      publicPath: '/uploads/products/SKU/photo.webp',
      remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
    });
  });

  it('skips upload work when the queued image is already on FastComet', async () => {
    mocks.isFastCometImageFileMock.mockReturnValue(true);
    mocks.resolveLinkedImageFileMock.mockReturnValue(fastCometImageFile);

    const result = await processProductFastCometImageUploadJob({
      imageFileId: 'image-file-1',
      productId: 'product-1',
      requestedAt: '2026-05-12T00:00:00.000Z',
    });

    expect(mocks.uploadLinkedImageFileToFastCometMock).not.toHaveBeenCalled();
    expect(mocks.invalidateProductMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'ok',
      imageFile: fastCometImageFile,
      product,
      alreadyUploaded: true,
    });
  });
});
