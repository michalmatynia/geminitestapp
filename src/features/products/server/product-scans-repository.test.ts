import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, captureExceptionMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

type IndexDoc = {
  name: string;
};

const createFindCursorMock = (docs: unknown[]) => ({
  sort: vi.fn(() => ({
    limit: vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue(docs),
    })),
  })),
});

describe('product-scans-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env['MONGODB_URI'] = 'mongodb://example.test/product-scans';
  });

  afterEach(() => {
    delete process.env['MONGODB_URI'];
  });

  it('replaces the legacy engineRunId sparse index with a partial unique string index', async () => {
    const indexesMock = vi.fn<() => Promise<IndexDoc[]>>().mockResolvedValue([
      { name: '_id_' },
      { name: 'engineRunId_1' },
    ]);
    const dropIndexMock = vi.fn().mockResolvedValue(undefined);
    const createIndexMock = vi.fn().mockResolvedValue(undefined);
    const findMock = vi.fn(() => createFindCursorMock([]));

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        indexes: indexesMock,
        dropIndex: dropIndexMock,
        createIndex: createIndexMock,
        find: findMock,
      })),
    });

    const { listProductScans } = await import('./product-scans-repository');

    await expect(listProductScans({ limit: 5 })).resolves.toEqual([]);

    expect(indexesMock).toHaveBeenCalledTimes(1);
    expect(dropIndexMock).toHaveBeenCalledWith('engineRunId_1');
    expect(createIndexMock).toHaveBeenCalledWith(
      { engineRunId: 1 },
      {
        name: 'product_scans_engineRunId_unique',
        unique: true,
        partialFilterExpression: { engineRunId: { $type: 'string' } },
      }
    );
    expect(createIndexMock).toHaveBeenCalledWith(
      { productId: 1, provider: 1 },
      {
        name: 'product_scans_active_product_provider_unique',
        unique: true,
        partialFilterExpression: { status: { $in: ['queued', 'running'] } },
      }
    );
    expect(createIndexMock).not.toHaveBeenCalledWith(
      { engineRunId: 1 },
      expect.objectContaining({ sparse: true })
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('still lists scans when index bootstrap fails', async () => {
    const indexesMock = vi.fn<() => Promise<IndexDoc[]>>().mockResolvedValue([{ name: '_id_' }]);
    const createIndexMock = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('duplicate key'), { name: 'MongoServerError' }));
    const findMock = vi.fn(() =>
      createFindCursorMock([
        {
          id: 'scan-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: null,
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          rawResult: null,
          error: null,
          asinUpdateStatus: null,
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: null,
          createdAt: new Date('2026-04-11T05:00:00.000Z'),
          updatedAt: new Date('2026-04-11T05:00:00.000Z'),
        },
      ])
    );

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        indexes: indexesMock,
        dropIndex: vi.fn(),
        createIndex: createIndexMock,
        find: findMock,
      })),
    });

    const { listProductScans } = await import('./product-scans-repository');

    await expect(listProductScans({ productId: 'product-1', limit: 5 })).resolves.toEqual([
      expect.objectContaining({
        id: 'scan-1',
        productId: 'product-1',
        status: 'completed',
      }),
    ]);

    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'duplicate key' }),
      expect.objectContaining({
        service: 'product-scans.repository',
        action: 'ensureIndexes',
      })
    );
  });

  it('enforces active product/provider uniqueness in the in-memory fallback store', async () => {
    delete process.env['MONGODB_URI'];

    const { upsertProductScan } = await import('./product-scans-repository');

    await upsertProductScan({
      id: 'scan-1',
      productId: 'product-1',
      provider: 'amazon',
      scanType: 'google_reverse_image',
      status: 'queued',
      productName: 'Product 1',
      engineRunId: null,
      imageCandidates: [],
      matchedImageId: null,
      asin: null,
      title: null,
      price: null,
      url: null,
      description: null,
      rawResult: null,
      error: null,
      asinUpdateStatus: 'pending',
      asinUpdateMessage: null,
      createdBy: null,
      updatedBy: null,
      completedAt: null,
      createdAt: '2026-04-11T05:00:00.000Z',
      updatedAt: '2026-04-11T05:00:00.000Z',
    });

    await expect(
      upsertProductScan({
        id: 'scan-2',
        productId: 'product-1',
        provider: 'amazon',
        scanType: 'google_reverse_image',
        status: 'running',
        productName: 'Product 1',
        engineRunId: null,
        imageCandidates: [],
        matchedImageId: null,
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        rawResult: null,
        error: null,
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        createdBy: null,
        updatedBy: null,
        completedAt: null,
        createdAt: '2026-04-11T05:01:00.000Z',
        updatedAt: '2026-04-11T05:01:00.000Z',
      })
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('enforces engineRunId uniqueness in the in-memory fallback store', async () => {
    delete process.env['MONGODB_URI'];

    const { upsertProductScan } = await import('./product-scans-repository');

    await upsertProductScan({
      id: 'scan-1',
      productId: 'product-1',
      provider: 'amazon',
      scanType: 'google_reverse_image',
      status: 'completed',
      productName: 'Product 1',
      engineRunId: 'run-1',
      imageCandidates: [],
      matchedImageId: null,
      asin: null,
      title: null,
      price: null,
      url: null,
      description: null,
      rawResult: null,
      error: null,
      asinUpdateStatus: 'not_needed',
      asinUpdateMessage: null,
      createdBy: null,
      updatedBy: null,
      completedAt: '2026-04-11T05:00:00.000Z',
      createdAt: '2026-04-11T05:00:00.000Z',
      updatedAt: '2026-04-11T05:00:00.000Z',
    });

    await expect(
      upsertProductScan({
        id: 'scan-2',
        productId: 'product-2',
        provider: 'amazon',
        scanType: 'google_reverse_image',
        status: 'completed',
        productName: 'Product 2',
        engineRunId: 'run-1',
        imageCandidates: [],
        matchedImageId: null,
        asin: null,
        title: null,
        price: null,
        url: null,
        description: null,
        rawResult: null,
        error: null,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: null,
        createdBy: null,
        updatedBy: null,
        completedAt: '2026-04-11T05:01:00.000Z',
        createdAt: '2026-04-11T05:01:00.000Z',
        updatedAt: '2026-04-11T05:01:00.000Z',
      })
    ).rejects.toMatchObject({ code: 11000 });
  });
});
