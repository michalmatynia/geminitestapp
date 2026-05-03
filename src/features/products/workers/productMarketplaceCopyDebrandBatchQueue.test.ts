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
    enqueueMarketplaceCopyDebrandRunMock: vi.fn(),
    getIntegrationByIdMock: vi.fn(),
    getProductByIdMock: vi.fn(),
    isRedisAvailableMock: vi.fn(),
    isRedisReachableMock: vi.fn(),
    listIntegrationsMock: vi.fn(),
    logInfoMock: vi.fn(),
    logWarningMock: vi.fn(),
    queueMock,
    updateProductMock: vi.fn(),
  };
});

vi.mock('@/features/integrations/services/integration-service', () => ({
  integrationService: {
    getIntegrationById: (...args: unknown[]) => mocks.getIntegrationByIdMock(...args),
    listIntegrations: (...args: unknown[]) => mocks.listIntegrationsMock(...args),
  },
}));

vi.mock('@/features/products/server/marketplace-copy-debrand-ai-path', () => ({
  enqueueMarketplaceCopyDebrandRun: (...args: unknown[]) =>
    mocks.enqueueMarketplaceCopyDebrandRunMock(...args),
}));

vi.mock('@/shared/events/products', () => ({
  emitProductCacheInvalidation: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: (...args: unknown[]) => mocks.getProductByIdMock(...args),
    updateProduct: (...args: unknown[]) => mocks.updateProductMock(...args),
  },
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
    logWarning: (...args: unknown[]) => mocks.logWarningMock(...args),
  },
}));

import {
  enqueueProductMarketplaceCopyDebrandBatchJob,
  processProductMarketplaceCopyDebrandBatchJob,
} from './productMarketplaceCopyDebrandBatchQueue';

const allegroIntegration = {
  id: 'integration-allegro',
  slug: 'allegro',
  name: 'Allegro',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
};

const buildProduct = (overrides: unknown[] = []) => ({
  id: 'product-1',
  sku: 'SKU-1',
  name_en: 'English product title',
  description_en: 'English product description',
  imageLinks: [],
  marketplaceContentOverrides: overrides,
});

describe('productMarketplaceCopyDebrandBatchQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queueMock.enqueue.mockResolvedValue('queued-job-1');
    mocks.getIntegrationByIdMock.mockResolvedValue(allegroIntegration);
    mocks.isRedisAvailableMock.mockReturnValue(true);
    mocks.isRedisReachableMock.mockResolvedValue(true);
    mocks.listIntegrationsMock.mockResolvedValue([allegroIntegration]);
    mocks.enqueueMarketplaceCopyDebrandRunMock.mockResolvedValue('run-1');
  });

  it('requires Redis runtime before enqueueing the batch job', async () => {
    mocks.isRedisAvailableMock.mockReturnValue(false);

    await expect(
      enqueueProductMarketplaceCopyDebrandBatchJob({
        productIds: ['product-1'],
        integrationId: 'integration-allegro',
        userId: 'user-42',
        requestedAt: '2026-04-29T00:00:00.000Z',
      })
    ).rejects.toThrow('requires Redis runtime');
    expect(mocks.queueMock.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues the batch job when Redis runtime is available', async () => {
    const jobId = await enqueueProductMarketplaceCopyDebrandBatchJob({
      productIds: ['product-1'],
      integrationId: 'integration-allegro',
      userId: 'user-42',
      requestedAt: '2026-04-29T00:00:00.000Z',
    });

    expect(jobId).toBe('queued-job-1');
    expect(mocks.queueMock.enqueue).toHaveBeenCalledWith(
      {
        productIds: ['product-1'],
        integrationId: 'integration-allegro',
        userId: 'user-42',
        requestedAt: '2026-04-29T00:00:00.000Z',
      },
      { jobId: expect.stringMatching(/^marketplace-copy-debrand:/) }
    );
  });

  it('creates a missing marketplace copy override before enqueueing Debrand', async () => {
    const product = buildProduct();
    const updatedProduct = buildProduct([
      { integrationIds: ['integration-allegro'], title: null, description: null },
    ]);
    mocks.getProductByIdMock.mockResolvedValue(product);
    mocks.updateProductMock.mockResolvedValue(updatedProduct);
    const updateProgress = vi.fn().mockResolvedValue(undefined);

    const result = await processProductMarketplaceCopyDebrandBatchJob(
      {
        productIds: ['product-1'],
        integrationId: 'integration-allegro',
        userId: 'user-42',
        requestedAt: '2026-04-29T00:00:00.000Z',
      },
      'job-1',
      { updateProgress }
    );

    expect(mocks.updateProductMock).toHaveBeenCalledWith(
      'product-1',
      {
        marketplaceContentOverrides: [
          { integrationIds: ['integration-allegro'], title: null, description: null },
        ],
      },
      { userId: 'user-42' }
    );
    expect(mocks.enqueueMarketplaceCopyDebrandRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        product: updatedProduct,
        integration: allegroIntegration,
        row: { integrationIds: ['integration-allegro'], title: null, description: null },
        rowIndex: 0,
        userId: 'user-42',
      })
    );
    expect(result).toEqual({
      requested: 1,
      processed: 1,
      overridesCreated: 1,
      overridesAlreadyExisted: 0,
      debrandRunsQueued: 1,
      failed: 0,
    });
    expect(updateProgress).toHaveBeenCalledWith({
      processed: 1,
      total: 1,
      debrandRunsQueued: 1,
      failed: 0,
    });
  });

  it('reuses an existing marketplace copy override without creating a duplicate', async () => {
    const product = buildProduct([
      {
        integrationIds: ['integration-allegro'],
        title: 'Existing title',
        description: 'Existing description',
      },
    ]);
    mocks.getProductByIdMock.mockResolvedValue(product);

    const result = await processProductMarketplaceCopyDebrandBatchJob(
      {
        productIds: ['product-1'],
        integrationId: 'integration-allegro',
        userId: null,
        requestedAt: '2026-04-29T00:00:00.000Z',
      },
      'job-1'
    );

    expect(mocks.updateProductMock).not.toHaveBeenCalled();
    expect(mocks.enqueueMarketplaceCopyDebrandRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        product,
        row: {
          integrationIds: ['integration-allegro'],
          title: 'Existing title',
          description: 'Existing description',
        },
        rowIndex: 0,
      })
    );
    expect(result.overridesCreated).toBe(0);
    expect(result.overridesAlreadyExisted).toBe(1);
    expect(result.debrandRunsQueued).toBe(1);
  });
});
